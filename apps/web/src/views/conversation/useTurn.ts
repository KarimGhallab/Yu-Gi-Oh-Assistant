import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  type CardFilters,
  type Language,
  TurnEventName,
  type TurnRequest,
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
  send(text: string, language?: Language): Promise<void>;
  turn?: TurnInFlight;
  isRunning: boolean;
  interpretation?: SearchInterpretation;
  correction?: CardFilters;
  correct(filters: CardFilters): void;
}

/**
 * How a turn's search was understood: the filters it reported, the words it
 * searched on when it had none, and what the server said about how it got
 * there. It is kept past the end of the turn, because a turn that gave way to
 * free text says so only while it is running, and the reply the server stores
 * keeps the filters and not the reason there were none.
 */
export interface SearchInterpretation {
  filters: CardFilters;
  query?: string;
  status?: TurnStatus;
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
  // What the last search was understood as outlives the turn that reported it:
  // the reply the server stores keeps the filters but not the words a turn fell
  // back on, so the readout is what a conversation was last asked.
  const [interpretation, setInterpretation] = useState<
    SearchInterpretation | undefined
  >(undefined);
  // The set the player has corrected, which is what the next turn is searched
  // with instead of the request being read again. It is undefined until they
  // touch a filter, which is the whole difference between a search they asked
  // for and one that was read out of their words, and an empty set is a
  // correction like any other: it asks for no constraints at all.
  const [correction, setCorrection] = useState<CardFilters | undefined>(
    undefined
  );
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

  /**
   * What the player has corrected a search to. It replaces nothing on screen:
   * the readout is showing the same thing already, and the correction is what
   * the next send carries.
   */
  const correct = useCallback((filters: CardFilters): void => {
    setCorrection(filters);
  }, []);

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
    async (text: string, language?: Language): Promise<void> => {
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

      // How the last search was arrived at is not how this one will be: whether
      // it comes down to words alone is this turn's to report, so the last
      // turn's answer to that goes and the filters it found are kept.
      setInterpretation(current =>
        current === undefined
          ? undefined
          : { filters: current.filters, query: current.query }
      );

      const controller = new AbortController();
      running.current = controller;
      let confirmed = false;
      // Sending the corrected set is what tells the server not to read the
      // request again, and sending the language the player is looking at is what
      // keeps a turn started straight after a switch off the language it had
      // before. A player who left the readout alone sends no filters at all,
      // which is what asks for the request to be parsed as usual.
      const request: TurnRequest = { text, language, filters: correction };

      try {
        for await (const event of streamTurn(
          conversationId,
          request,
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
              setInterpretation(current => ({
                filters: current?.filters ?? [],
                query: current?.query,
                status: event.status
              }));
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
              // The search the turn is about to run, taken from its own report
              // rather than read back from the stored turn, so what the readout
              // shows is right while the turn is still running. A status this
              // turn reported arrived just before it and is carried along.
              setInterpretation(current => ({
                filters: event.filters,
                query: event.query,
                status: current?.status
              }));
              // What the turn reports is the set the search is running with, so
              // a correction it matches has been used and is done with. One the
              // player made since it was sent is not, and stays.
              setCorrection(current =>
                current !== undefined && sameFilters(current, event.filters)
                  ? undefined
                  : current
              );
              break;
            case TurnEventName.AnswerEnd:
              // The prose is complete; the stored turn is what turn.end carries.
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
    [change, conversationId, correction, giveWay, settle, turn?.running]
  );

  return {
    send,
    turn,
    isRunning: turn?.running ?? false,
    interpretation,
    correction,
    correct
  };
}

/**
 * Whether two filter sets say the same thing. A turn reports the set it ran with
 * as freshly built filters, so whether a correction has been used is decided by
 * what the filters say rather than by the two arrays being the same one.
 */
function sameFilters(left: CardFilters, right: CardFilters): boolean {
  return (
    left.length === right.length &&
    left.every((filter, index) => {
      const other = right[index];

      return (
        other !== undefined &&
        filter.field === other.field &&
        filter.operator === other.operator &&
        filter.value === other.value
      );
    })
  );
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : STOPPED_MESSAGE;
}
