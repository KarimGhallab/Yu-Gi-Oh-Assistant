import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  TurnEventName,
  type TurnStage,
  type TurnStatus
} from '@ygo-assistant/contracts';

import { streamTurn } from '../../shared/api/turns.js';
import { refreshConversations } from '../../shared/queries.js';

import type { SuggestedCard } from './CardGrid.js';

/**
 * What the turn says when the connection gave way without the turn saying so
 * itself, which is a stream that stopped rather than a stream that failed.
 */
const STOPPED_MESSAGE = 'The turn stopped before it was finished.';

/**
 * What the turn says when it finished but the conversation could not be read
 * back. The turn itself is what the player watched arrive, so it stays; what is
 * missing is the server's copy of it.
 */
const RELOAD_FAILED_MESSAGE = 'The conversation could not be reloaded.';

/**
 * A turn that gave way: the stage it died at when the server named one, and
 * whatever message came with it.
 */
export interface TurnFailure {
  stage?: TurnStage;
  message: string;
}

/**
 * A turn the player is in. One that is running is being built here: the question
 * is on screen before the server has confirmed it, the pieces are the answer as
 * it is written, and the cards are the ones the search has reported so far.
 */
interface TurnInFlight {
  question: string;
  confirmed: boolean;
  userMessageId?: number;
  pieces: string[];
  cards: SuggestedCard[];
  status?: TurnStatus;
  failure?: TurnFailure;
  running: boolean;
}

export interface UseTurnResult {
  send(text: string): Promise<void>;
  turn?: TurnInFlight;
  isRunning: boolean;
}

/**
 * Runs one turn at a time in a conversation and keeps what it is doing, so the
 * history can show a turn the server has not stored yet.
 *
 * The server is still the one that keeps the conversation: when a turn ends, or
 * ends by giving way, the conversation is refetched first and the turn built here
 * is dropped once it has been, so the stored turn and its cards are what remains
 * and nothing the client held is counted twice. A question the server never
 * confirmed, which is what a request refused before the stream started looks
 * like, stays on screen instead, because there is nothing to refetch it from.
 */
export function useTurn(conversationId: string): UseTurnResult {
  const client = useQueryClient();
  const [turn, setTurn] = useState<TurnInFlight | undefined>(undefined);
  const running = useRef<AbortController | undefined>(undefined);

  // Leaving the conversation stops the turn: a reply that arrives after the
  // player has gone elsewhere is not something they are waiting for.
  useEffect(() => {
    return () => {
      running.current?.abort();
    };
  }, []);

  const change = useCallback(
    (update: (current: TurnInFlight) => TurnInFlight): void => {
      setTurn(current => (current === undefined ? current : update(current)));
    },
    []
  );

  const settle = useCallback(
    (): Promise<boolean> => refreshConversations(client),
    [client]
  );

  const giveWay = useCallback(
    async (confirmed: boolean, failure: TurnFailure): Promise<void> => {
      // A half-written answer is not an answer, so it goes.
      change(current => ({
        ...current,
        pieces: [],
        cards: [],
        failure,
        running: false
      }));

      if (!confirmed) {
        return;
      }

      // The question was stored, so it is refetched and then let go of here:
      // dropping it first would take it off screen until the server answered,
      // and keeping it after would put the same question on screen twice. A
      // refetch that failed read nothing to put there, so the question stays.
      if (await settle()) {
        change(current => ({ ...current, question: '' }));
      }
    },
    [change, settle]
  );

  const send = useCallback(
    async (text: string): Promise<void> => {
      if (turn?.running === true) {
        return;
      }

      setTurn({
        question: text,
        confirmed: false,
        pieces: [],
        cards: [],
        running: true
      });

      const controller = new AbortController();
      running.current = controller;
      let confirmed = false;

      try {
        for await (const event of streamTurn(
          conversationId,
          { text },
          controller.signal
        )) {
          switch (event.type) {
            case TurnEventName.TurnStart:
              confirmed = true;
              change(current => ({
                ...current,
                confirmed: true,
                userMessageId: event.userMessageId
              }));
              break;
            case TurnEventName.Status:
              change(current => ({ ...current, status: event.status }));
              break;
            case TurnEventName.Cards:
              change(current => ({ ...current, cards: event.cards }));
              break;
            case TurnEventName.AnswerDelta:
              change(current => ({
                ...current,
                pieces: [...current.pieces, event.text]
              }));
              break;
            case TurnEventName.TurnEnd:
              if (await settle()) {
                setTurn(undefined);
              } else {
                change(current => ({
                  ...current,
                  running: false,
                  failure: { message: RELOAD_FAILED_MESSAGE }
                }));
              }
              return;
            case TurnEventName.Error:
              await giveWay(confirmed, {
                stage: event.stage,
                message: event.message
              });
              return;
            case TurnEventName.Filters:
            case TurnEventName.AnswerEnd:
              // Read and validated, and nothing this client renders yet.
              break;
          }
        }

        if (controller.signal.aborted) {
          return;
        }

        await giveWay(confirmed, { message: STOPPED_MESSAGE });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        await giveWay(confirmed, { message: messageOf(error) });
      } finally {
        running.current = undefined;
      }
    },
    [change, conversationId, giveWay, settle, turn?.running]
  );

  return { send, turn, isRunning: turn?.running ?? false };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : STOPPED_MESSAGE;
}
