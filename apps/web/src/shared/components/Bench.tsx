import type { ReactNode } from 'react';

import { ExamplePromptList } from './ExamplePromptList.js';

/**
 * The workbench before there is anything on it: the request to be typed as the
 * object, and the requests that can be asked as its tools. The home surface and
 * an empty conversation draw the same one, because a conversation that was
 * started but not spoken in is still the start it was, and the bench is what
 * says so.
 *
 * The prompt is handed in rather than built here: the home surface asks a
 * request that starts a conversation, and an empty conversation asks one in the
 * conversation that already exists, so the two differ in what sending does and
 * not in how the bench is laid out. It keeps the width it has at the foot of a
 * conversation, because the two are one card and the move between them is what
 * says so; only the words and the tools around it are centred.
 *
 * The heading is left out by a surface that has one of its own: a conversation
 * names itself in its header, so its bench holds the words and the tools under
 * that name rather than repeating a title over them.
 */
interface BenchProps {
  prompt: ReactNode;
  onChoose(prompt: string): void;
  heading?: string;
}

export default function Bench({ prompt, onChoose, heading }: BenchProps) {
  return (
    <div className="m-auto flex w-full flex-col gap-6 text-center">
      <section className="mx-auto max-w-md px-6">
        {heading === undefined ? null : (
          <h1 className="text-lg font-semibold text-neutral-100">{heading}</h1>
        )}
        <p
          className={`text-sm text-neutral-400 ${
            heading === undefined ? '' : 'mt-3'
          }`}>
          Describe the cards you are looking for.
        </p>
      </section>

      <section className="mx-auto w-full max-w-md px-6">
        <ExamplePromptList onChoose={onChoose} />
      </section>

      {prompt}
    </div>
  );
}
