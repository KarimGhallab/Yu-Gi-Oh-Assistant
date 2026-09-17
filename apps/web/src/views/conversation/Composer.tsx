import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState
} from 'react';

import {
  type CardFilters,
  Language,
  type Model
} from '@ygo-assistant/contracts';

import SendIcon from '../../shared/components/icons/SendIcon.js';

import SearchReadout from './SearchReadout.js';
import type { SearchInterpretation } from './useTurn.js';

/**
 * The prompt is one surface: the field and the things the request is run with
 * share a card, because they are one act rather than a field with a row of
 * controls under it. The card holds itself apart by its surface step alone, so
 * nothing is outlined until the keyboard is in the field, and then it is the
 * whole card that takes the focus ring.
 */
const CARD_CLASS =
  'rounded bg-neutral-900 has-[textarea:focus-visible]:outline-2 has-[textarea:focus-visible]:outline-offset-2 has-[textarea:focus-visible]:outline-amber-300';

const FIELD_CLASS =
  'composer-field w-full resize-none border-0 bg-transparent text-sm text-neutral-100 outline-none placeholder:text-neutral-500';

/**
 * A setting is a quiet word rather than a box: no frame, no fill, the text
 * stepping to Bone White over a Rail Grey surface when it is pointed at, and the
 * same focus ring as everything else when it is reached by keyboard.
 */
const PICKER_CLASS =
  'composer-picker min-w-0 max-w-40 rounded text-sm text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300';

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
 * What a model's own option says about it. A model that cannot answer a turn at
 * all is named as such rather than as one that only answers without a schema,
 * because that is the fact that matters when it is chosen, and the listing
 * reports both.
 */
const limitation = (candidate: Model): string => {
  if (!candidate.supportsCompletion) {
    return ' (cannot answer)';
  }

  return candidate.supportsStructuredOutput ? '' : ' (no structured filters)';
};

interface ComposerProps {
  onSend(text: string): void;
  running: boolean;
  announcement?: string;
  failure?: string;
  readout?: SearchInterpretation;
  onCorrect(filters: CardFilters): void;
  language: Language;
  model: string;
  models?: Model[];
  settingsError?: string;
  onLanguage(language: Language): void;
  onModel(model: string): void;
}

/**
 * Where the player asks for cards. It is docked at the bottom of the
 * conversation, because the conversation surface is the one that has one, and it
 * holds everything the request is made of: what the last search was understood
 * as, the turn that is running, the turn that gave way, and the two settings the
 * request is run with, because those belong to the asking rather than to the
 * history above.
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
  onCorrect,
  language,
  model,
  models,
  settingsError,
  onLanguage,
  onModel
}: ComposerProps) {
  const [text, setText] = useState('');
  const field = useRef<HTMLTextAreaElement>(null);
  const ready = text.trim().length > 0 && !running;

  // A conversation can be left on a model the machine no longer has, which is a
  // state the player should see rather than a control that shows nothing. The
  // listing not having arrived yet is not that state, so it stays quiet.
  const chosen = models?.find(candidate => candidate.name === model);
  const missing = models !== undefined && chosen === undefined;

  const alerts = [
    ...(settingsError === undefined ? [] : [settingsError]),
    ...(missing
      ? [`${model} is not installed. Run ollama pull ${model} to install it.`]
      : []),
    ...(chosen !== undefined && !chosen.supportsCompletion
      ? [`${chosen.name} cannot answer a turn.`]
      : [])
  ];
  const note =
    chosen?.supportsCompletion === true &&
    chosen.supportsStructuredOutput === false
      ? `${chosen.name} cannot produce structured filters, so a request is parsed from the prompt.`
      : undefined;

  useEffect(() => {
    field.current?.focus();
  }, []);

  const send = (): void => {
    if (!ready) {
      return;
    }

    const request = text.trim();
    setText('');
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

      {alerts.map(alert => (
        <p key={alert} role="alert" className="text-sm text-red-400">
          {alert}
        </p>
      ))}

      {note === undefined ? null : (
        <p className="text-sm text-neutral-500">{note}</p>
      )}

      <p role="status" className="text-sm text-neutral-400">
        {announcement ?? ''}
      </p>

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

        <div className="mt-2 flex items-center justify-between gap-3">
          <select
            id="language"
            aria-label="Cards in"
            value={language}
            onChange={event => {
              const chosenLanguage = LANGUAGES.find(
                candidate => candidate.language === event.target.value
              );

              if (chosenLanguage !== undefined) {
                onLanguage(chosenLanguage.language);
              }
            }}
            className={PICKER_CLASS}>
            {LANGUAGES.map(candidate => (
              <option key={candidate.language} value={candidate.language}>
                {candidate.name}
              </option>
            ))}
          </select>

          <div className="flex min-w-0 items-center gap-2">
            <select
              id="model"
              aria-label="Answered by"
              value={model}
              onChange={event => onModel(event.target.value)}
              className={PICKER_CLASS}>
              {missing ? <option value={model}>{model}</option> : null}
              {(models ?? []).map(candidate => (
                <option key={candidate.name} value={candidate.name}>
                  {candidate.name}
                  {limitation(candidate)}
                </option>
              ))}
            </select>

            <button type="submit" disabled={!ready} className={SEND_CLASS}>
              <SendIcon />
              Send
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
