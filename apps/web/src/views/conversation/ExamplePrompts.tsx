import Notice from '../../shared/components/Notice.js';

/**
 * What a player can ask for, shown in a conversation with nothing in it. They
 * are the requests themselves rather than a description of what the assistant
 * does, so choosing one is asking for it.
 */
const EXAMPLE_PROMPTS = [
  'A cheap way to stop my opponent attacking',
  'Something to support a Red-Eyes deck',
  'Monsters that come back from the graveyard',
  'I only remember that it banishes the whole graveyard'
];

interface ExamplePromptsProps {
  onChoose(prompt: string): void;
}

/**
 * The way into an empty conversation: what the assistant can be asked, in the
 * player's own words, and a way to ask it without typing.
 */
export default function ExamplePrompts({ onChoose }: ExamplePromptsProps) {
  return (
    <Notice headingLevel={2} title="Ask for cards">
      <p>Describe what you are looking for. For example:</p>
      <ul className="mt-3 space-y-1">
        {EXAMPLE_PROMPTS.map(prompt => (
          <li key={prompt}>
            <button
              type="button"
              onClick={() => onChoose(prompt)}
              className="rounded text-sm text-neutral-400 hover:text-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">
              {prompt}
            </button>
          </li>
        ))}
      </ul>
    </Notice>
  );
}
