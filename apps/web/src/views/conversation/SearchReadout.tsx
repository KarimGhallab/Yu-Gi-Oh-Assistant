import { useEffect, useRef, useState } from 'react';

import {
  type CardFilter,
  CardFilterField,
  type CardFilters,
  type FilterOperator,
  TurnStatus,
  cardFilterSchema
} from '@ygo-assistant/contracts';

import CheckIcon from '../../shared/components/icons/CheckIcon.js';
import CloseIcon from '../../shared/components/icons/CloseIcon.js';
import MinusIcon from '../../shared/components/icons/MinusIcon.js';
import PlusIcon from '../../shared/components/icons/PlusIcon.js';

import {
  describeFilter,
  describeOperator,
  filterFieldName,
  filterValueName
} from './describeFilter.js';
import {
  defaultOperator,
  defaultValue,
  fieldVocabulary,
  filterFields,
  takesNumber
} from './filterFields.js';
import type { SearchInterpretation } from './useTurn.js';

const ROW_CLASS = 'flex flex-wrap items-center gap-x-4 gap-y-1';
const LIST_CLASS =
  'flex flex-wrap items-start gap-x-4 gap-y-1 font-mono text-xs';
const CHIP_CLASS =
  'group rounded text-left text-neutral-500 hover:text-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300';
const ASK_CLASS = 'text-neutral-400 group-hover:text-neutral-100';
const ADD_CLASS =
  'inline-flex items-center gap-1.5 rounded text-left font-mono text-xs text-neutral-400 hover:text-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300';
const NOTE_CLASS = 'font-mono text-xs text-neutral-400';

const EDITOR_CLASS = 'flex flex-wrap items-center gap-2 font-mono text-xs';
const CONTROL_CLASS =
  'rounded border border-amber-500/25 bg-neutral-900 px-1.5 py-1 text-sm text-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300';
const BUTTON_CLASS =
  'inline-flex items-center gap-1.5 rounded px-1 text-sm text-neutral-400 hover:text-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 disabled:opacity-60';

interface SearchReadoutProps {
  interpretation: SearchInterpretation;
  /** The archetypes the catalog carries, when the listing has arrived. */
  archetypes?: string[];
  onCorrect(filters: CardFilters): void;
}

/**
 * What the search was understood as, above the request field: one fact per
 * filter, the field it constrains set quietly and what it asks of that field
 * beside it. Nothing else said the same thing, so a player can tell whether the
 * assistant read the request the way they meant it.
 *
 * Each fact is the control that corrects it, and the readout also offers the
 * filter the request never named, because the player is the one who knows what
 * they asked for. Either way the whole set is handed to the surface that runs
 * the turn, which is what makes the next search run on the set rather than on a
 * fresh reading of the request. The facts are still facts rather than
 * containers, set apart by space alone, since the system has no boxes and no
 * pills to put them in.
 *
 * It is deliberately not a live region. The status line beside Send already
 * announces how a turn is being searched, and a region that is announced cannot
 * also hold controls without reading them out unasked.
 */
export default function SearchReadout({
  interpretation,
  archetypes,
  onCorrect
}: SearchReadoutProps) {
  const filters = interpretation.filters;
  const [editing, setEditing] = useState<number | undefined>(undefined);
  const [adding, setAdding] = useState(false);
  const [refocus, setRefocus] = useState<string | undefined>(undefined);

  // Correcting a filter replaces it, removing one leaves the next in its place,
  // and adding one puts it at the end, so the keyboard comes back to the fact it
  // is about to be. Taking the last one away leaves nothing to come back to,
  // which is why the request field is what a readout with no filters hands the
  // keyboard to.
  useEffect(() => {
    if (editing !== undefined || adding || refocus === undefined) {
      return;
    }

    const control = document.getElementById(refocus);

    (control ?? document.getElementById('prompt'))?.focus();
    setRefocus(undefined);
  }, [adding, editing, refocus]);

  const save = (at: number | undefined, corrected: CardFilter): void => {
    onCorrect(
      at === undefined
        ? [...filters, corrected]
        : filters.map((filter, index) => (index === at ? corrected : filter))
    );
    setEditing(undefined);
    setAdding(false);
    setRefocus(chipId(at ?? filters.length));
  };

  const remove = (at: number): void => {
    onCorrect(filters.filter((_, index) => index !== at));
    setEditing(undefined);
    setRefocus(chipId(at));
  };

  const cancelAdding = (): void => {
    setAdding(false);
    setRefocus(ADD_ID);
  };

  return (
    <div className={ROW_CLASS}>
      {filters.length === 0 ? (
        <p className={NOTE_CLASS}>{searchNote(interpretation)}</p>
      ) : (
        <ul
          aria-label="What the search was understood as"
          className={LIST_CLASS}>
          {filters.map((filter, index) => {
            const { field, says } = describeFilter(filter);

            return (
              <li key={index}>
                {index === editing ? (
                  <ChipEditor
                    correcting={filter}
                    archetypes={archetypes}
                    onSave={corrected => save(index, corrected)}
                    onRemove={() => remove(index)}
                    onCancel={() => {
                      setEditing(undefined);
                      setRefocus(chipId(index));
                    }}
                  />
                ) : (
                  <button
                    id={chipId(index)}
                    type="button"
                    aria-label={`Change ${field} ${says}`}
                    onClick={() => setEditing(index)}
                    className={CHIP_CLASS}>
                    <span>{field}</span>{' '}
                    <span className={ASK_CLASS}>{says}</span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {adding ? (
        <ChipEditor
          archetypes={archetypes}
          onSave={corrected => save(undefined, corrected)}
          onCancel={cancelAdding}
        />
      ) : (
        <button
          id={ADD_ID}
          type="button"
          onClick={() => setAdding(true)}
          className={ADD_CLASS}>
          <PlusIcon className="shrink-0 -translate-y-px" />
          Add a filter
        </button>
      )}
    </div>
  );
}

/** The fact at one position in the readout, so the keyboard can come back to it. */
const chipId = (index: number): string => `filter-chip-${index}`;

/** The control that offers the filter the request never named. */
const ADD_ID = 'filter-add';

/**
 * The values a field's control offers: the ones the domain enumerates, and the
 * ones the catalog carries for an archetype, which is a value set no schema can
 * hold because only the index knows which ones exist. What the filter already
 * holds is offered too, even when the list has moved on from it, so a stored
 * filter can be read back and kept rather than quietly lost.
 */
function offeredValues(
  field: CardFilterField,
  enumerated: string[] | undefined,
  archetypes: string[] | undefined,
  held: string
): string[] | undefined {
  const values =
    enumerated ??
    (field === CardFilterField.Archetype ? archetypes : undefined);

  if (values === undefined) {
    return undefined;
  }

  return held.length === 0 || values.includes(held)
    ? values
    : [held, ...values];
}

interface ChipEditorProps {
  correcting?: CardFilter;
  archetypes?: string[];
  onSave(filter: CardFilter): void;
  onRemove?(): void;
  onCancel(): void;
}

/**
 * One filter being said: the field it constrains, then the operator and the
 * value it takes, gathered the way that field takes them, a fixed set where the
 * domain has one, the catalog's own list where the data carries one, and a
 * number where the field is a stat, so nothing can be built here that the search
 * would refuse.
 *
 * Correcting a fact fixes its field, because the field is the part the readout
 * is sure of; adding one offers the fields the search supports instead, and
 * changing the field gathers the next operator and value the way the new field
 * takes them. Either way the controls are one group, because what they say
 * together is a single filter, and the group is where the keyboard arrives.
 * Escape calls the whole thing off.
 */
function ChipEditor({
  correcting,
  archetypes,
  onSave,
  onRemove,
  onCancel
}: ChipEditorProps) {
  const adding = correcting === undefined;
  const [field, setField] = useState<CardFilterField>(
    correcting?.field ?? filterFields()[0].field
  );
  const vocabulary = fieldVocabulary(field);
  const [operator, setOperator] = useState<FilterOperator>(
    correcting?.operator ?? defaultOperator(field)
  );
  const [value, setValue] = useState(
    correcting === undefined ? defaultValue(field) : String(correcting.value)
  );
  const firstControl = useRef<HTMLSelectElement>(null);
  const values = offeredValues(field, vocabulary.values, archetypes, value);
  const firstOffered = values?.at(0);

  useEffect(() => {
    firstControl.current?.focus();
  }, []);

  // The catalog's archetypes arrive after an editor can already be open, so a
  // value still unset takes the first one the list offers when it lands, the way
  // a fixed set starts on one of its own.
  useEffect(() => {
    if (adding && value.length === 0 && firstOffered !== undefined) {
      setValue(firstOffered);
    }
  }, [adding, firstOffered, value]);

  /**
   * The filter these controls now say, or nothing when they do not say one the
   * search would accept, which is what keeps Save out of action rather than
   * sending something the server would refuse. The schema decides, so the
   * vocabulary and the filter cannot disagree.
   */
  const said = (): CardFilter | undefined => {
    if (value.trim().length === 0) {
      return undefined;
    }

    const parsed = cardFilterSchema.safeParse({
      field,
      operator,
      value: takesNumber(field) ? Number(value) : value
    });

    return parsed.success ? parsed.data : undefined;
  };

  const save = (): void => {
    const candidate = said();

    if (candidate === undefined) {
      return;
    }

    onSave(candidate);
  };

  return (
    <div
      role="group"
      aria-label={
        correcting === undefined
          ? 'Add a filter'
          : `Change ${describeFilter(correcting).field} ${describeFilter(correcting).says}`
      }
      className={EDITOR_CLASS}
      onKeyDown={event => {
        if (event.key === 'Escape') {
          onCancel();
        }
      }}>
      {adding ? (
        <select
          ref={firstControl}
          value={field}
          aria-label="Field"
          onChange={event => {
            const chosen = filterFields().find(
              entry => entry.field === event.target.value
            );

            if (chosen === undefined) {
              return;
            }

            setField(chosen.field);
            setOperator(defaultOperator(chosen.field));
            setValue(defaultValue(chosen.field));
          }}
          className={CONTROL_CLASS}>
          {filterFields().map(entry => (
            <option key={entry.field} value={entry.field}>
              {filterFieldName(entry.field)}
            </option>
          ))}
        </select>
      ) : (
        <span>{filterFieldName(field)}</span>
      )}

      <select
        ref={adding ? undefined : firstControl}
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

      {values === undefined ? (
        <input
          type={takesNumber(field) ? 'number' : 'text'}
          inputMode={takesNumber(field) ? 'numeric' : undefined}
          step={takesNumber(field) ? 1 : undefined}
          min={vocabulary.minimum}
          max={vocabulary.maximum}
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
          {values.map(candidate => (
            <option key={candidate} value={candidate}>
              {filterValueName(field, candidate)}
            </option>
          ))}
        </select>
      )}

      <button
        type="button"
        onClick={save}
        disabled={said() === undefined}
        className={BUTTON_CLASS}>
        <CheckIcon className="shrink-0 -translate-y-0.5" />
        {adding ? 'Add' : 'Save'}
      </button>
      {onRemove === undefined ? null : (
        <button type="button" onClick={onRemove} className={BUTTON_CLASS}>
          <MinusIcon className="shrink-0 -translate-y-0.5" />
          Remove
        </button>
      )}
      <button type="button" onClick={onCancel} className={BUTTON_CLASS}>
        <CloseIcon className="shrink-0 -translate-y-0.5" />
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
