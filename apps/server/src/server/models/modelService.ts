import {
  type OllamaModel,
  OllamaModelNotFoundError
} from '@ygo-assistant/ollama';
import { UnavailableError } from '@ygo-assistant/utils';

import type { ServerDependencies } from '../types.js';

/**
 * Which models the instance has, which one answers when the player has not said,
 * and whether a model the player did name may be used at all.
 *
 * The instance is asked every time rather than remembered here, because what is
 * installed is a property of the machine Ollama runs on and a remembered answer
 * would go stale the moment a model is pulled or removed.
 */

/**
 * What the instance has installed, in the order a player meets it: by name, so
 * the list is the same wherever it is drawn, and so the one a conversation starts
 * on when nobody has said is the same too.
 */
export async function installedModels(
  dependencies: ServerDependencies
): Promise<OllamaModel[]> {
  const models = await dependencies.ollama.listModels();

  return [...models].sort((left, right) => {
    if (left.name === right.name) {
      return 0;
    }

    return left.name < right.name ? -1 : 1;
  });
}

/**
 * What a request is answered by when the player has not said: the first installed
 * model that can answer a turn, which is simply the first of the list on any
 * machine that has a chat model at all. A model that cannot answer is offered to
 * nobody, so it is never what a conversation quietly starts on, and a machine
 * with no model to answer has nothing to start a conversation with.
 */
export function defaultModel(models: OllamaModel[]): string {
  const answering =
    models.find(model => model.supportsCompletion) ?? models.at(0);

  if (answering === undefined) {
    throw new UnavailableError('No model is installed to answer with');
  }

  return answering.name;
}

/**
 * The model a turn may answer with. A model the player named is refused before
 * the turn starts rather than quietly answered by another one, because a player
 * who chose a model and got a different one has been misled; the same goes for
 * a conversation whose model is no longer installed.
 */
export async function requireInstalledModel(
  dependencies: ServerDependencies,
  model: string
): Promise<OllamaModel> {
  const models = await dependencies.ollama.listModels();
  const selected = models.find(candidate => candidate.name === model);

  if (selected === undefined) {
    throw new OllamaModelNotFoundError(model);
  }

  return selected;
}
