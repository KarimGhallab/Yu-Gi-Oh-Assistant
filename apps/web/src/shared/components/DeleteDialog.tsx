import Dialog, { LAMP_ACTION_CLASS, QUIET_ACTION_CLASS } from './Dialog.js';

/**
 * What is asked before a conversation is deleted. The one irreversible thing in
 * the app is the one thing that asks, and that the action is irreversible is said
 * in the words rather than in the color of a control, because this system has no
 * red fill and these words are read anyway.
 */
interface DeleteDialogProps {
  title: string;
  onConfirm(): void;
  onCancel(): void;
}

export default function DeleteDialog({
  title,
  onConfirm,
  onCancel
}: DeleteDialogProps) {
  return (
    <Dialog
      title="Delete this conversation?"
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
            onClick={onConfirm}
            className={LAMP_ACTION_CLASS}>
            Delete
          </button>
        </>
      }>
      <p className="text-sm text-neutral-400">
        Everything in <span className="text-neutral-100">{title}</span> will be
        gone.
      </p>
    </Dialog>
  );
}
