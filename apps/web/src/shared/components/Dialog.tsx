import { type KeyboardEvent, type ReactNode, useEffect, useRef } from 'react';

/**
 * The room a question takes when a row's own control needs it. The row is what
 * the question is about, so the row goes on being a row while the question
 * stands over the list: a question answered in the row would change the list
 * under the eye that is still reading it.
 *
 * It is the only region being read while it is open, which is what lets it carry
 * the lamp: the fills behind it are not a second and third lamp on the screen,
 * because the screen is this. It carries no shadow, because this system has none
 * and the dimmed room is what says the dialog stands above it.
 *
 * The keyboard is put on the first thing the dialog offers, which is the field in
 * a question about a name and the answer that changes nothing in a question
 * about a deletion. It stays there: Escape and a press in the room outside call
 * the whole thing off, and focus goes back to the row that asked, which the list
 * owns.
 */
interface DialogProps {
  title: string;
  children: ReactNode;
  actions: ReactNode;
  onCancel(): void;
}

/** The answer that changes nothing: a plain word, never a fill. */
export const QUIET_ACTION_CLASS =
  'rounded px-3 py-1.5 text-sm font-medium text-neutral-100 hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300';

/**
 * The answer that acts: the lamp of the dialog, and the reason a dialog is
 * allowed one is that it is the only region being read while it is open.
 */
export const LAMP_ACTION_CLASS =
  'rounded bg-amber-500 px-3 py-1.5 text-sm font-medium text-amber-950 hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 disabled:opacity-60';

/**
 * The dialog's own ids, because there is one of it at a time and what names it
 * has to name something that is there.
 */
const TITLE_ID = 'dialog-title';
const BODY_ID = 'dialog-body';

export default function Dialog({
  title,
  children,
  actions,
  onCancel
}: DialogProps) {
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialog.current?.querySelector<HTMLElement>('input, button')?.focus();
  }, []);

  // A press in the room outside is one of the ways out. It is watched on the
  // document rather than on the room itself, because the room is behind the
  // dialog and the dialog is not the thing that was pressed.
  useEffect(() => {
    const outside = (event: MouseEvent): void => {
      if (
        event.target instanceof Node &&
        dialog.current?.contains(event.target) === false
      ) {
        onCancel();
      }
    };

    document.addEventListener('mousedown', outside);

    return () => document.removeEventListener('mousedown', outside);
  }, [onCancel]);

  const keys = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      onCancel();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    // The keyboard stays on what the question offers rather than walking off
    // into a list that is not being read.
    const inside =
      dialog.current?.querySelectorAll<HTMLElement>('input, button') ?? [];
    const first = inside[0];
    const last = inside[inside.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    }

    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-neutral-950/70 p-6">
      <div
        ref={dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        aria-describedby={BODY_ID}
        onKeyDown={keys}
        className="w-full max-w-md rounded bg-neutral-900 p-6">
        <h2 id={TITLE_ID} className="text-lg font-semibold text-neutral-100">
          {title}
        </h2>
        <div id={BODY_ID} className="mt-2">
          {children}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          {actions}
        </div>
      </div>
    </div>
  );
}
