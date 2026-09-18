import type { ReactNode } from 'react';
import Markdown, { type Components } from 'react-markdown';

/**
 * A heading in an answer is the body's own scale and a weight, because this
 * system builds hierarchy from color, space, and hairlines rather than from
 * size, and the conversation's own title is the only thing at Title scale. Every
 * level the model might use comes out the same, so a heading cannot shout.
 */
function Heading({ children }: { children?: ReactNode }) {
  return <h2 className="text-sm font-semibold text-neutral-100">{children}</h2>;
}

/**
 * The answer's elements, mapped onto the system rather than dressed by a prose
 * theme: a card's name is weight rather than size, a list is a list and not a
 * box, and a link is the one action the prose carries, so it takes the lamp's
 * underline on hover and the focus ring like every other control.
 */
const COMPONENTS: Components = {
  p: ({ children }) => <p>{children}</p>,
  strong: ({ children }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  h1: Heading,
  h2: Heading,
  h3: Heading,
  h4: Heading,
  h5: Heading,
  h6: Heading,
  ul: ({ children }) => (
    <ul className="list-disc space-y-1 pl-4 marker:text-neutral-500">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal space-y-1 pl-4 marker:text-neutral-500">
      {children}
    </ol>
  ),
  code: ({ children }) => (
    <code className="font-mono text-xs text-neutral-400">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="font-mono text-xs whitespace-pre-wrap text-neutral-400">
      {children}
    </pre>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-neutral-100 underline decoration-neutral-800 underline-offset-2 hover:decoration-amber-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l border-neutral-800 pl-4 text-neutral-400">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-neutral-800" />
};

/**
 * The one kind of element an answer may not carry. An image in an answer would
 * be a picture this app did not choose and cannot check, and the only images it
 * loads are the cards' own printed faces under the answer.
 */
const DISALLOWED_ELEMENTS = ['img'];

interface MessageProseProps {
  markdown: string;
}

/**
 * The answer's prose, rendered from the Markdown a model writes rather than shown
 * as it typed it. What the model is allowed to use is asked for in its prompt, and
 * what it uses anyway is mapped here, so an answer cannot reach a size, a color,
 * or a container this system does not have. Raw HTML is dropped rather than
 * rendered, and the prose takes the width it is given.
 */
export default function MessageProse({ markdown }: MessageProseProps) {
  return (
    <div className="flex flex-col gap-5 text-neutral-100">
      <Markdown
        components={COMPONENTS}
        disallowedElements={DISALLOWED_ELEMENTS}
        skipHtml>
        {markdown}
      </Markdown>
    </div>
  );
}
