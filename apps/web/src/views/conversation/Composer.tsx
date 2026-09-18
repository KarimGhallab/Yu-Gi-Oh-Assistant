import {
  type CardFilters,
  Language,
  type Model,
  type SearchInterpretation
} from '@ygo-assistant/contracts';

import PromptSurface from '../../shared/components/PromptSurface.js';

import SearchReadout from './SearchReadout.js';
import type { RunningAnnouncement } from './turnAnnouncements.js';

/**
 * A turn that is still running, with a light passing through what it says. The
 * line is drawn twice: once as the status line is, in Ash Grey, and once more in
 * Bone White behind a mask that lets a band of it through and moves. So the
 * resting line is the line it always was, and the light is the app's own second
 * color rather than a gradient laid over its text.
 *
 * The second drawing is hidden from assistive technology, and its characters
 * never change, so the live region announces the sentence once, as it appears.
 */
function WorkingLine({ children }: { children: string }) {
  return (
    <span className="working-line">
      <span aria-hidden="true" className="working-line-glow">
        {children}
      </span>
      {children}
    </span>
  );
}

interface ComposerProps {
  onSend(text: string): void;
  running: boolean;
  announcement?: RunningAnnouncement;
  failure?: string;
  readout?: SearchInterpretation;
  onCorrect(filters: CardFilters): void;
  language: Language;
  model: string;
  models?: Model[];
  archetypes?: string[];
  settingsError?: string;
  onLanguage(language: Language): void;
  onModel(model: string): void;
}

/**
 * Where the player asks for cards in a conversation: the prompt, with what the
 * last search was understood as, the turn that is running, the turn that gave
 * way, and a setting that failed, above it, because those belong to the asking
 * rather than to the history above.
 *
 * The send control is out of action while a turn runs, and the announcement says
 * so, so a second request cannot be started by mistake. The field itself stays
 * usable: a player can write the next request while the answer arrives, and the
 * keyboard is left where it can type rather than on a control that has just gone
 * dead.
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
  archetypes,
  settingsError,
  onLanguage,
  onModel
}: ComposerProps) {
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

  return (
    <PromptSurface
      onSend={onSend}
      running={running}
      language={language}
      model={model}
      models={models}
      onLanguage={onLanguage}
      onModel={onModel}
      head={
        <>
          {readout === undefined ? null : (
            <SearchReadout
              interpretation={readout}
              archetypes={archetypes}
              onCorrect={onCorrect}
            />
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
            {announcement === undefined ? null : (
              <>
                <WorkingLine>{`${announcement.working}…`}</WorkingLine>
                {announcement.note === undefined
                  ? null
                  : ` ${announcement.note}`}
              </>
            )}
          </p>
        </>
      }
    />
  );
}
