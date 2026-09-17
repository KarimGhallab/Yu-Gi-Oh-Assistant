import { TurnStatus } from '@ygo-assistant/contracts';

import { describeFilter } from './filterCopy.js';
import type { SearchInterpretation } from './useTurn.js';

const LIST_CLASS = 'flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs';
const FIELD_CLASS = 'text-neutral-500';
const ASK_CLASS = 'text-neutral-400';
const NOTE_CLASS = 'font-mono text-xs text-neutral-400';

interface SearchReadoutProps {
  interpretation: SearchInterpretation;
}

/**
 * What the search was understood as, above the request field: one fact per
 * filter, the field it constrains set quietly and what it asks of that field
 * beside it. Nothing else said the same thing, so a player can tell whether the
 * assistant read the request the way they meant it.
 *
 * The filters are facts rather than containers, so they are set apart by space
 * alone: the system has no boxes and no pills to put them in.
 *
 * It is deliberately not a live region. The status line beside Send already
 * announces how a turn is being searched, so this announcing it as well would
 * say the same thing twice; what this is for is what is left on screen once the
 * turn is over, and being read in place is enough for that.
 */
export default function SearchReadout({ interpretation }: SearchReadoutProps) {
  if (interpretation.filters.length === 0) {
    return <p className={NOTE_CLASS}>{searchNote(interpretation)}</p>;
  }

  return (
    <ul aria-label="What the search was understood as" className={LIST_CLASS}>
      {interpretation.filters.map((filter, index) => {
        const { field, says } = describeFilter(filter);

        return (
          <li key={index}>
            <span className={FIELD_CLASS}>{field}</span>{' '}
            <span className={ASK_CLASS}>{says}</span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * What a search with no filters says. A turn that reported it could not
 * understand the request says so, and repeats the words the search ran on; a
 * search that simply carried no filters says only that, because a stored reply
 * records the filters of a turn and not which of the two it was.
 */
function searchNote(interpretation: SearchInterpretation): string {
  if (interpretation.status !== TurnStatus.FreeTextOnly) {
    return 'No filters';
  }

  return interpretation.query === undefined
    ? 'Searched as written, with no filters'
    : `Searched as written: ${interpretation.query}`;
}
