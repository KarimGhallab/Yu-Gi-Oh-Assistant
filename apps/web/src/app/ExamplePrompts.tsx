import Notice from './Notice.js';

/**
 * What a player can ask for, shown in a conversation with nothing in it. They
 * are text here: making one send a request is the composer's job.
 */
const EXAMPLE_PROMPTS = [
  'A cheap way to stop my opponent attacking',
  'Something to support a Red-Eyes deck',
  'Monsters that come back from the graveyard',
  'I only remember that it banishes the whole graveyard'
];

/**
 * The way into an empty conversation: what the assistant can be asked, in the
 * player's own words rather than a description of the feature.
 */
export default function ExamplePrompts() {
  return (
    <Notice headingLevel={2} title="Ask for cards">
      <p>Describe what you are looking for. For example:</p>
      <ul className="mt-3 space-y-1">
        {EXAMPLE_PROMPTS.map(prompt => (
          <li key={prompt}>{prompt}</li>
        ))}
      </ul>
    </Notice>
  );
}
