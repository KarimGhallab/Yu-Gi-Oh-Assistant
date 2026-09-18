import { type KeyboardEvent, useEffect, useRef, useState } from 'react';

import Dialog, { LAMP_ACTION_CLASS, QUIET_ACTION_CLASS } from './Dialog.js';

/**
 * What is asked to give a conversation another name. It holds the name it has, so
 * the question is answered by editing rather than by typing it again, and Enter
 * answers it, because a dialog with one field is a dialog whose Enter is Save.
 */
interface RenameDialogProps {
  name: string;
  onSave(name: string): void;
  onCancel(): void;
}

/**
 * The field is a field of the dialog rather than a field of the row: the same
 * Bench Slate surface, the same 25% amber hairline, taking the width it is given.
 */
const FIELD_CLASS =
  'w-full rounded border border-amber-500/25 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300';

export default function RenameDialog({
  name,
  onSave,
  onCancel
}: RenameDialogProps) {
  const [title, setTitle] = useState(name);
  const field = useRef<HTMLInputElement>(null);

  // The name it has is what the question starts from, so it is offered selected:
  // typing replaces it and anything else is one arrow key away.
  useEffect(() => {
    field.current?.select();
  }, []);

  const keys = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onSave(title);
    }
  };

  return (
    <Dialog
      title="Rename this conversation?"
      onCancel={onCancel}
      actions={
        <>
          <button
            type="button"
            onClick={onCancel}
            className={QUIET_ACTION_CLASS}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(title)}
            className={LAMP_ACTION_CLASS}>
            Save
          </button>
        </>
      }>
      <label htmlFor="conversation-name" className="sr-only">
        Conversation name
      </label>
      <input
        id="conversation-name"
        ref={field}
        value={title}
        onChange={event => setTitle(event.target.value)}
        onKeyDown={keys}
        className={FIELD_CLASS}
      />
    </Dialog>
  );
}
