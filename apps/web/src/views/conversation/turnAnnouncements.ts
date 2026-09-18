import { TurnStage, TurnStatus } from '@ygo-assistant/contracts';

import type { TurnFailure } from './useTurn.js';

const WORKING = 'The assistant is working';

/**
 * What a running turn is announced as. It comes in two parts rather than as one
 * sentence, because the prompt draws a mark between them: the ellipsis on "The
 * assistant is working" is the thing that says the work is not finished, so it
 * belongs to the drawing rather than to the copy.
 */
export interface RunningAnnouncement {
  /** The work still going on, which the prompt follows with a moving ellipsis. */
  working: string;
  /** How the search was arrived at, when the server said something about it. */
  note?: string;
}

/**
 * What the turn says about how it is searching. A status is the server saying
 * something about the search rather than a sentence, so the copy is the client's.
 */
const STATUS_NOTES: Record<TurnStatus, string> = {
  [TurnStatus.FreeTextOnly]:
    '(No filters were understood, so the search is running on your own words.)'
};

/**
 * Which part of the turn gave way. The server names the stage and hands over its
 * own message; naming the stage is what tells the player whether the request, the
 * search, or the answer was the thing that broke.
 */
const STAGE_FAILURES: Record<TurnStage, string> = {
  [TurnStage.Parse]: 'The request could not be understood',
  [TurnStage.Search]: 'The search failed',
  [TurnStage.Answer]: 'The answer could not be written'
};

/** What a running turn is announced as, including how the search was arrived at. */
export const runningAnnouncement = (
  status?: TurnStatus
): RunningAnnouncement =>
  status === undefined
    ? { working: WORKING }
    : { working: WORKING, note: STATUS_NOTES[status] };

/**
 * What a turn that gave way says. A stage is named when the stream reported one;
 * anything else, such as a server that stopped answering, speaks for itself.
 */
export const failureAnnouncement = (failure: TurnFailure): string =>
  failure.stage === undefined
    ? failure.message
    : `${STAGE_FAILURES[failure.stage]}: ${failure.message}`;
