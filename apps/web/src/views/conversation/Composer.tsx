import { type SubmitEvent, useEffect, useRef, useState } from 'react';

import type { CardFilters } from '@ygo-assistant/contracts';

import SendIcon from '../../shared/components/icons/SendIcon.js';

import SearchReadout from './SearchReadout.js';
import type { SearchInterpretation } from './useTurn.js';

const FIELD_CLASS =
  'w-full resize-none rounded border border-amber-500/25 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300';

const SEND_CLASS =
  'inline-flex shrink-0 items-center gap-1.5 rounded bg-amber-500 px-2.5 py-1.5 text-sm font-medium whitespace-nowrap text-amber-950 hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 disabled:opacity-60';

interface ComposerProps {
  onSend(text: string): void;
  running: boolean;
  announcement?: string;
  failure?: string;
  readout?: SearchInterpretation;
  onCorrect(filters: CardFilters): void;
}

/**
 * Where the player asks for cards. It is docked at the bottom of the
 * conversation, because the conversation surface is the one that has one, and it
 * holds the things that are about the request rather than about the history:
 * what the last search was understood as, the turn that is running, and the turn
 * that gave way.
 *
 * The send control is out of action while a turn runs, and the announcement
 * says so, so a second request cannot be started by mistake. The field itself
 * stays usable: a player can write the next request while the answer arrives,
 * and the keyboard is left where it can type rather than on a control that has
 * just gone dead.
 *
 * Opening a conversation puts the keyboard in the field, because opening one is
 * how a player arrives to ask. The conversation's surface is keyed by the
 * conversation, so this is once per conversation opened rather than once per
 * render.
 */
export default function Composer({
  onSend,
  running,
  announcement,
  failure,
  readout,
  onCorrect
}: ComposerProps) {
  const [text, setText] = useState('');
  const field = useRef<HTMLTextAreaElement>(null);
  const ready = text.trim().length > 0 && !running;

  useEffect(() => {
    field.current?.focus();
  }, []);

  const submit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();

    if (!ready) {
      return;
    }

    const request = text.trim();
    setText('');
    onSend(request);
    field.current?.focus();
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 border-t border-neutral-800 p-6">
      {readout === undefined ? null : (
        <SearchReadout interpretation={readout} onCorrect={onCorrect} />
      )}

      {failure === undefined ? null : (
        <p role="alert" className="text-sm text-red-400">
          {failure}
        </p>
      )}

      <label htmlFor="prompt" className="sr-only">
        Your request
      </label>
      <textarea
        id="prompt"
        ref={field}
        rows={2}
        value={text}
        onChange={event => setText(event.target.value)}
        placeholder="Ask for the cards you are looking for"
        className={FIELD_CLASS}
      />

      <div className="flex items-center justify-between gap-3">
        <p role="status" className="text-sm text-neutral-400">
          {announcement ?? ''}
        </p>
        <button type="submit" disabled={!ready} className={SEND_CLASS}>
          <SendIcon />
          Send
        </button>
      </div>
    </form>
  );
}
