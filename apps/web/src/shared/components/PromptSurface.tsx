import {
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState
} from 'react';

import { Language, type Model } from '@ygo-assistant/contracts';

import SettingPicker, { type SettingChoice } from './SettingPicker.js';
import SendIcon from './icons/SendIcon.js';

/**
 * The prompt is one surface: the field and the things the request is run with
 * share a card, because they are one act rather than a field with a row of
 * controls under it. The card holds itself apart by its surface step alone, so
 * nothing is outlined until the keyboard is in the field, and then it is the
 * whole card that takes the focus ring.
 *
 * It is also the one thing in this system that moves: sending the first request
 * of a conversation carries it from where it stood on the home surface to the
 * foot of the conversation that request just started, because it is the same
 * surface in both places and the player should see that it is. See
 * `prompt-surface` in the stylesheet.
 */
const CARD_CLASS =
  'prompt-surface rounded bg-neutral-900 has-[textarea:focus-visible]:outline-2 has-[textarea:focus-visible]:outline-offset-2 has-[textarea:focus-visible]:outline-amber-300';

const FIELD_CLASS =
  'quiet-scroll w-full resize-none border-0 bg-transparent text-sm text-neutral-100 outline-none placeholder:text-neutral-500';

const SEND_CLASS =
  'inline-flex shrink-0 items-center gap-1.5 rounded bg-amber-500 px-2.5 py-1.5 text-sm font-medium whitespace-nowrap text-amber-950 hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 disabled:opacity-60';

/**
 * The languages a conversation can be in, each with the word the player reads
 * for it. The values are the domain's, so what the control sends is what the
 * search partitions the catalog by.
 */
const LANGUAGES: { language: Language; name: string }[] = [
  { language: Language.English, name: 'English' },
  { language: Language.French, name: 'French' }
];

/**
 * What a model's own note says about it. A model that cannot answer a turn at
 * all is named as such rather than as one that only answers without a schema,
 * because that is the fact that matters when it is chosen, and the listing
 * reports both.
 */
const noteFor = (candidate: Model): string | undefined => {
  if (!candidate.supportsCompletion) {
    return 'cannot answer';
  }

  return candidate.supportsStructuredOutput
    ? undefined
    : 'no structured filters';
};

interface PromptSurfaceProps {
  onSend(text: string): void;
  running: boolean;
  language: Language;
  model: string;
  models?: Model[];
  onLanguage(language: Language): void;
  onModel(model: string): void;
  /** What is said above the prompt: the readout, the alert lines, the status. */
  head?: ReactNode;
  /**
   * Whether the field gives up its words when the request goes out. It does when
   * the request has somewhere to be read, and it does not when the request is
   * itself what would make that place, so a failure leaves the words where they
   * were typed.
   */
  clearOnSend?: boolean;
}

/**
 * Where a request is typed: one field, five lines tall before it scrolls, with
 * the settings it will be run with and the Send on the same surface under it.
 * Enter sends and Shift+Enter is a line.
 */
export default function PromptSurface({
  onSend,
  running,
  language,
  model,
  models,
  onLanguage,
  onModel,
  head,
  clearOnSend = true
}: PromptSurfaceProps) {
  const [text, setText] = useState('');
  const field = useRef<HTMLTextAreaElement>(null);
  const ready = text.trim().length > 0 && !running;

  // A conversation can be left on a model the machine no longer has, which is a
  // state the player should see rather than a control that shows nothing.
  const missingModel =
    model.length > 0 &&
    models !== undefined &&
    !models.some(candidate => candidate.name === model);

  const modelChoices: SettingChoice[] = [
    ...(models ?? []).map(candidate => ({
      value: candidate.name,
      name: candidate.name,
      note: noteFor(candidate),
      disabled: !candidate.supportsCompletion
    })),
    ...(missingModel ? [{ value: model, name: model }] : [])
  ];

  useEffect(() => {
    field.current?.focus();
  }, []);

  const send = (): void => {
    if (!ready) {
      return;
    }

    const request = text.trim();

    if (clearOnSend) {
      setText('');
    }

    onSend(request);
    field.current?.focus();
  };

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    send();
  };

  // Enter is the send key and Shift+Enter is the newline. Enter is claimed
  // whether or not the send is available, so it never leaves a line behind
  // instead, and a composition being written is left alone.
  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (event.nativeEvent.isComposing) {
      return;
    }

    send();
  };

  const sendButton = (
    <button type="submit" disabled={!ready} className={SEND_CLASS}>
      <SendIcon />
      Send
    </button>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 p-6">
      {head}

      <div className={`${CARD_CLASS} p-3`}>
        <label htmlFor="prompt" className="sr-only">
          Your request
        </label>
        <textarea
          id="prompt"
          ref={field}
          rows={5}
          value={text}
          onChange={event => setText(event.target.value)}
          onKeyDown={keyDown}
          placeholder="Ask for the cards you are looking for"
          className={FIELD_CLASS}
        />

        <div className="mt-2 flex min-w-0 items-center gap-3">
          <SettingPicker
            label="Cards in"
            value={language}
            choices={LANGUAGES.map(candidate => ({
              value: candidate.language,
              name: candidate.name
            }))}
            onPick={picked => {
              const chosen = LANGUAGES.find(
                candidate => candidate.language === picked
              );

              if (chosen !== undefined) {
                onLanguage(chosen.language);
              }
            }}
            align="start"
          />

          <span className="ml-auto flex min-w-0 items-center gap-2">
            <SettingPicker
              label="Answered by"
              value={model}
              choices={modelChoices}
              onPick={onModel}
            />

            {sendButton}
          </span>
        </div>
      </div>
    </form>
  );
}
