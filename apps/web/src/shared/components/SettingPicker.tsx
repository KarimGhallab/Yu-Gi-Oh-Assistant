import { type FocusEvent, type KeyboardEvent, useRef, useState } from 'react';

import ChevronIcon from './icons/ChevronIcon.js';

/**
 * One choice in a setting's list. Its name is what a person reads and its note
 * is the machine fact about it, which is why only the note is set in mono.
 */
export interface SettingChoice {
  value: string;
  name: string;
  note?: string;
  /** A choice that can be read and not taken, because it cannot answer a turn. */
  disabled?: boolean;
}

interface SettingPickerProps {
  /** The setting's name, which the control reads with its value. */
  label: string;
  value: string;
  choices: SettingChoice[];
  onPick(value: string): void;
  /**
   * The end of its row the trigger sits at, and so the edge the panel opens
   * from, so a panel never runs off the side it was opened toward.
   */
  align?: 'start' | 'end';
}

/**
 * The trigger is a quiet word rather than a box, and the caret is the set's own.
 * The panel stands one surface step up over the room and carries no shadow,
 * because this system has none: it is the step that says it is above, and the
 * hairlines it does not draw are what keeps the prompt from being a stack of
 * boxes.
 */
const TRIGGER_CLASS =
  'composer-picker flex min-w-0 max-w-40 items-center rounded text-sm text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300';

const PANEL_CLASS =
  'quiet-scroll absolute bottom-full z-20 mb-2 max-h-64 w-max min-w-44 max-w-80 overflow-y-auto rounded bg-neutral-800 p-1';

const ROW_CLASS =
  'flex w-full items-baseline justify-between gap-3 rounded px-2 py-1.5 text-left text-sm hover:bg-neutral-700';

/**
 * A setting of the request: what it is set to, and the list of what it could be
 * set to, opened above the control that shows it.
 *
 * The list is drawn rather than borrowed from the platform so that a choice can
 * carry what a model can and cannot do beside its name, which an option in a
 * native menu has no room for. It is a listbox of buttons: the keyboard walks it
 * with the arrows, Escape calls it off and comes back to the trigger, picking
 * closes it and comes back too, and moving the keyboard out of it closes it
 * without taking the focus anywhere.
 */
export default function SettingPicker({
  label,
  value,
  choices,
  onPick,
  align = 'end'
}: SettingPickerProps) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const options = useRef<(HTMLButtonElement | null)[]>([]);

  const current = choices.find(choice => choice.value === value);
  const currentIndex = Math.max(
    choices.findIndex(choice => choice.value === value),
    0
  );

  const close = (): void => setOpen(false);

  const openAt = (index: number): void => {
    setOpen(true);
    options.current[index]?.focus();
  };

  const pick = (choice: SettingChoice): void => {
    close();
    onPick(choice.value);
    trigger.current?.focus();
  };

  const step = (event: KeyboardEvent<HTMLElement>, by: number): void => {
    event.preventDefault();

    const at = options.current.findIndex(
      option => option === document.activeElement
    );
    const next =
      options.current[Math.min(Math.max(at + by, 0), choices.length - 1)];

    next?.focus();
  };

  const keys = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      trigger.current?.focus();
    }

    if (event.key === 'ArrowDown') {
      step(event, 1);
    }

    if (event.key === 'ArrowUp') {
      step(event, -1);
    }
  };

  return (
    <div
      className="relative min-w-0"
      onBlur={(event: FocusEvent<HTMLDivElement>) => {
        const next = event.relatedTarget;

        // Focus moving inside the list is not focus leaving it, and a keyboard
        // walked out of the list is a list that is done with.
        if (next instanceof Node && event.currentTarget.contains(next)) {
          return;
        }

        close();
      }}>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close() : openAt(currentIndex))}
        onKeyDown={event => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();

            if (open) {
              step(event, event.key === 'ArrowDown' ? 1 : -1);
            } else {
              openAt(currentIndex);
            }
          }

          if (event.key === 'Escape') {
            close();
          }
        }}
        className={TRIGGER_CLASS}>
        <span className="sr-only">{label}</span>
        <span className="truncate">{current?.name ?? value}</span>
        <span
          aria-hidden="true"
          className={`ml-1 shrink-0 text-neutral-500 transition-transform duration-150 motion-reduce:transition-none ${
            open ? 'rotate-180' : ''
          }`}>
          <ChevronIcon />
        </span>
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={label}
          onKeyDown={keys}
          className={`${PANEL_CLASS} ${align === 'start' ? 'left-0' : 'right-0'}`}>
          {choices.map((choice, index) => (
            <button
              key={choice.value}
              ref={element => {
                options.current[index] = element;
              }}
              type="button"
              role="option"
              aria-selected={choice.value === value}
              aria-disabled={choice.disabled === true}
              onClick={() => {
                if (choice.disabled !== true) {
                  pick(choice);
                }
              }}
              className={`${ROW_CLASS} ${
                choice.value === value
                  ? 'bg-neutral-800 text-neutral-100'
                  : 'text-neutral-400'
              } ${choice.disabled === true ? 'cursor-default opacity-50' : ''}`}>
              <span className="truncate">{choice.name}</span>
              {choice.note === undefined ? null : (
                <span className="font-mono text-xs text-neutral-500">
                  {choice.note}
                </span>
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
