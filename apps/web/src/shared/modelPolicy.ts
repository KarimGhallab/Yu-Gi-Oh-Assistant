import type { Model } from '@ygo-assistant/contracts';

import type { SettingChoice } from './components/SettingPicker.js';

/**
 * What the listing and the chosen name mean for the player: the model the name
 * names, whether it is one the machine has, the choices to offer, the note a
 * model without a schema earns, and the warnings a player has to read. It is
 * what every surface that offers a model reads, so a surface renders the policy
 * rather than deciding for itself what a capability means.
 */
export interface ModelPolicy {
  /** The installed model the chosen name names, when the listing holds it. */
  selected?: Model;
  /** A name was chosen that the listing does not hold. */
  missing: boolean;
  /** The models to offer, each with what it can do said beside it. */
  choices: SettingChoice[];
  /** What the chosen model's lack of a schema means, above the prompt. */
  note?: string;
  /** The model facts a player must read: not installed, cannot answer. */
  alerts: string[];
}

/**
 * Turns the models a machine has and the name a player is on into the policy a
 * surface renders. A listing that has not arrived makes no choice missing,
 * because nothing has said the name is absent yet.
 */
export function describeModel(
  models: Model[] | undefined,
  selected: string
): ModelPolicy {
  const chosen = models?.find(model => model.name === selected);
  const missing =
    selected.length > 0 && models !== undefined && chosen === undefined;

  return {
    selected: chosen,
    missing,
    choices: choicesFor(models, selected, missing),
    note: chosen === undefined ? undefined : bodyNote(chosen),
    alerts: alertsFor(selected, chosen, missing)
  };
}

/**
 * The choices to offer: every installed model, each carrying the terse fact
 * about what it can do and unsupported when it cannot answer at all, followed
 * by the chosen name itself when the listing does not hold it, so the control
 * shows what is being asked for rather than nothing.
 */
function choicesFor(
  models: Model[] | undefined,
  selected: string,
  missing: boolean
): SettingChoice[] {
  const installed = (models ?? []).map(model => ({
    value: model.name,
    name: model.name,
    note: optionNote(model),
    disabled: !model.supportsCompletion
  }));

  return missing
    ? [...installed, { value: selected, name: selected }]
    : installed;
}

/**
 * The terse fact an option carries. The body sentence is `bodyNote`; the two are
 * written together so the same fact is worded once in one register each.
 */
function optionNote(model: Model): string | undefined {
  if (!model.supportsCompletion) {
    return 'cannot answer';
  }

  return model.supportsStructuredOutput ? undefined : 'no structured filters';
}

/**
 * What a model without a schema means, said above the prompt. A model that
 * cannot answer at all is not this case: it is an alert, because the turn will
 * not run.
 */
function bodyNote(model: Model): string | undefined {
  if (!model.supportsCompletion || model.supportsStructuredOutput) {
    return undefined;
  }

  return `${model.name} cannot produce structured filters, so a request is parsed from the prompt.`;
}

function alertsFor(
  selected: string,
  chosen: Model | undefined,
  missing: boolean
): string[] {
  return [
    ...(missing
      ? [
          `${selected} is not installed. Run ollama pull ${selected} to install it.`
        ]
      : []),
    ...(chosen !== undefined && !chosen.supportsCompletion
      ? [`${chosen.name} cannot answer a turn.`]
      : [])
  ];
}
