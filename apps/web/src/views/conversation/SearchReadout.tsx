import { useEffect, useRef, useState } from 'react';

import {
  type CardFilter,
  type CardFilters,
  type FilterOperator,
  TurnStatus,
  cardFilterSchema
} from '@ygo-assistant/contracts';

import {
  describeFilter,
  describeOperator,
  filterFieldName
} from './filterCopy.js';
import { fieldVocabulary, takesNumber } from './filterFields.js';
import type { SearchInterpretation } from './useTurn.js';

const LIST_CLASS =
  'flex flex-wrap items-start gap-x-4 gap-y-1 font-mono text-xs';
const CHIP_CLASS =
  'group rounded text-left text-neutral-500 hover:text-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300';
const ASK_CLASS = 'text-neutral-400 group-hover:text-neutral-100';
const NOTE_CLASS = 'font-mono text-xs text-neutral-400';

const EDITOR_CLASS = 'flex flex-wrap items-center gap-2 font-mono text-xs';
const CONTROL_CLASS =
  'rounded border border-amber-500/25 bg-neutral-900 px-1.5 py-1 text-sm text-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300';
const BUTTON_CLASS =
  'rounded px-1 text-sm text-neutral-400 hover:text-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 disabled:opacity-60';

interface SearchReadoutProps {
  interpretation: SearchInterpretation;
  onCorrect(filters: CardFilters): void;
}

/**
 * What the search was understood as, above the request field: one fact per
 * filter, the field it constrains set quietly and what it asks of that field
 * beside it. Nothing else said the same thing, so a player can tell whether the
 * assistant read the request the way they meant it.
 *
 * Each fact is the control that corrects it, because the player is the one who
 * knows what they asked for; correcting one hands the whole set to the surface
 * that runs the turn, which is what makes the next search run on the corrected
 * set instead of reading the request again. The facts are still facts rather
 * than containers, set apart by space alone, since the system has no boxes and
 * no pills to put them in.
 *
 * It is deliberately not a live region. The status line beside Send already
 * announces how a turn is being searched, and a region that is announced cannot
 * also hold controls without reading them out unasked.
 */
export default function SearchReadout({
  interpretation,
  onCorrect
}: SearchReadoutProps) {
  const [editing, setEditing] = useState<number | undefined>(undefined);
  const [refocus, setRefocus] = useState<number | undefined>(undefined);

  // Correcting a chip replaces it and removing one leaves the next in its place,
  // so the keyboard comes back to the chip that is there now. Taking the last
  // one away leaves nothing to come back to, which is why the request field is
  // what a readout with no filters left hands the keyboard to.
  useEffect(() => {
    if (editing !== undefined || refocus === undefined) {
      return;
    }

    const chip = document.getElementById(chipId(refocus));

    (chip ?? document.getElementById('prompt'))?.focus();
    setRefocus(undefined);
  }, [editing, refocus]);

  if (interpretation.filters.length === 0) {
    return <p className={NOTE_CLASS}>{searchNote(interpretation)}</p>;
  }

  const replace = (index: number, corrected: CardFilter): void => {
    onCorrect(
      interpretation.filters.map((filter, at) =>
        at === index ? corrected : filter
      )
    );
    setEditing(undefined);
    setRefocus(index);
  };

  const remove = (index: number): void => {
    onCorrect(interpretation.filters.filter((_, at) => at !== index));
    setEditing(undefined);
    setRefocus(index);
  };

  return (
    <ul aria-label="What the search was understood as" className={LIST_CLASS}>
      {interpretation.filters.map((filter, index) => {
        const { field, says } = describeFilter(filter);

        return (
          <li key={index}>
            {index === editing ? (
              <ChipEditor
                filter={filter}
                onSave={corrected => replace(index, corrected)}
                onRemove={() => remove(index)}
                onCancel={() => {
                  setEditing(undefined);
                  setRefocus(index);
                }}
              />
            ) : (
              <button
                id={chipId(index)}
                type="button"
                aria-label={`Change ${field} ${says}`}
                onClick={() => setEditing(index)}
                className={CHIP_CLASS}>
                <span>{field}</span> <span className={ASK_CLASS}>{says}</span>
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** The chip at one position in the readout, so the keyboard can come back to it. */
const chipId = (index: number): string => `filter-chip-${index}`;

interface ChipEditorProps {
  filter: CardFilter;
  onSave(filter: CardFilter): void;
  onRemove(): void;
  onCancel(): void;
}

/**
 * One filter being corrected: its field, which is the part the readout is sure
 * of, and the operator and the value that can be put right beside it. The value
 * is asked for the way the field takes it, a fixed set where the domain has one
 * and a number where the field is a stat, so nothing can be built here that the
 * search would refuse.
 *
 * The three controls are one group rather than three loose ones, because what
 * they say together is a single filter, and the group is what the keyboard
 * arrives in. Escape calls the whole thing off, the way it does in the list of
 * conversations.
 */
function ChipEditor({ filter, onSave, onRemove, onCancel }: ChipEditorProps) {
  const vocabulary = fieldVocabulary(filter.field);
  const [operator, setOperator] = useState<FilterOperator>(filter.operator);
  const [value, setValue] = useState(String(filter.value));
  const operatorControl = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    operatorControl.current?.focus();
  }, []);

  /**
   * The filter these controls now say, or nothing when they do not say one the
   * search would accept, which is what keeps Save out of action rather than
   * sending something the server would refuse. The schema decides, so the
   * vocabulary and the correction cannot disagree.
   */
  const corrected = (): CardFilter | undefined => {
    if (value.trim().length === 0) {
      return undefined;
    }

    const parsed = cardFilterSchema.safeParse({
      field: filter.field,
      operator,
      value: takesNumber(filter.field) ? Number(value) : value
    });

    return parsed.success ? parsed.data : undefined;
  };

  const save = (): void => {
    const candidate = corrected();

    if (candidate === undefined) {
      return;
    }

    onSave(candidate);
  };

  return (
    <div
      role="group"
      aria-label={`Change ${describeFilter(filter).field} ${describeFilter(filter).says}`}
      className={EDITOR_CLASS}
      onKeyDown={event => {
        if (event.key === 'Escape') {
          onCancel();
        }
      }}>
      <span>{filterFieldName(filter.field)}</span>

      <select
        ref={operatorControl}
        value={operator}
        aria-label="Operator"
        onChange={event => {
          const chosen = vocabulary.operators.find(
            candidate => candidate === event.target.value
          );

          if (chosen !== undefined) {
            setOperator(chosen);
          }
        }}
        className={CONTROL_CLASS}>
        {vocabulary.operators.map(candidate => (
          <option key={candidate} value={candidate}>
            {describeOperator(candidate)}
          </option>
        ))}
      </select>

      {vocabulary.values === undefined ? (
        <input
          type={takesNumber(filter.field) ? 'number' : 'text'}
          inputMode={takesNumber(filter.field) ? 'numeric' : undefined}
          step={takesNumber(filter.field) ? 1 : undefined}
          value={value}
          aria-label="Value"
          onChange={event => setValue(event.target.value)}
          className={`${CONTROL_CLASS} w-24`}
        />
      ) : (
        <select
          value={value}
          aria-label="Value"
          onChange={event => setValue(event.target.value)}
          className={CONTROL_CLASS}>
          {vocabulary.values.map(candidate => (
            <option key={candidate} value={candidate}>
              {candidate}
            </option>
          ))}
        </select>
      )}

      <button
        type="button"
        onClick={save}
        disabled={corrected() === undefined}
        className={BUTTON_CLASS}>
        Save
      </button>
      <button type="button" onClick={onRemove} className={BUTTON_CLASS}>
        Remove
      </button>
      <button type="button" onClick={onCancel} className={BUTTON_CLASS}>
        Cancel
      </button>
    </div>
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
