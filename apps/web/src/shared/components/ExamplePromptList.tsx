import { useState } from 'react';

/**
 * What a player can ask for, shown where there is nothing to read yet. They are
 * the requests themselves rather than a description of what the assistant does,
 * so choosing one is asking for it, and they are written the way a player would
 * say them: a card half remembered, a deck being built, a problem to solve.
 *
 * They span the ways the game is asked about rather than the ways cards are
 * catalogued, because a request that names a card the assistant already knows is
 * not the request this app is for. That is also why there are many and only a few
 * are shown: a player who comes back meets a different handful, and none of them
 * is a card they had to know the name of first.
 */
const EXAMPLE_PROMPTS = [
  'A cheap way to stop my opponent attacking',
  'Something to support a Red-Eyes deck',
  'Monsters that come back from the graveyard',
  'I only remember that it banishes the whole graveyard',
  'A way to get rid of a monster I cannot destroy',
  'Cards that stop my opponent searching their deck',
  'Something that punishes them for summoning too many monsters',
  'A monster my opponent cannot target with card effects',
  'I want to fill my graveyard on purpose',
  'A spell that comes back after it resolves',
  'Something to protect a monster from being destroyed once',
  'A card that flips the attack and defense of everything',
  'Ways to send cards from my deck to the graveyard',
  'A monster that gets stronger the more cards are in my graveyard',
  'Something to stop a hand trap',
  'Cards that let me draw on my opponent’s turn',
  'I need a way to deal with a monster that cannot be targeted',
  'A deck that wins by not letting my opponent play',
  'Something to summon several monsters in one turn',
  'A card that takes control of an opponent’s monster',
  'Ways to get a spell back from my graveyard',
  'A monster that cannot be destroyed by battle',
  'Something to stop my opponent using their graveyard',
  'Low level monsters with high attack',
  'A card that searches any level 4 monster',
  'I want to make my opponent mill their deck',
  'Something that deals damage when my monster is destroyed',
  'Cards that stop a spell from resolving',
  'A way to remove a monster without destroying it',
  'Something to support a Zombie deck',
  'A card that copies another card’s effect',
  'Monsters that can attack directly',
  'Something that makes my opponent discard',
  'A ritual spell and the monster it brings out',
  'Ways to protect my back row',
  'A card that brings a monster back when it leaves the field',
  'Something to stop an attack and end the battle phase',
  'Fusion monsters that are easy to summon',
  'A card that negates a monster’s effect in the graveyard',
  'I remember a dragon that destroys spells when it is summoned',
  'Something to make my opponent banish their own cards',
  'A way to use a monster’s effect twice in one turn',
  'Cards that get rid of an opponent’s field spell',
  'I only remember it was a level 8 with 3000 attack',
  'Something for a deck with no extra deck',
  'A card that stops my opponent drawing in their draw phase',
  'Monsters that special summon themselves from the hand',
  'Something to make a big monster out of two materials',
  'A way to deal with a board of four monsters',
  'Cards that reward me for having fewer cards than my opponent'
];

/** How many of them a surface offers at once. */
const SHOWN = 4;

/**
 * Four of them, drawn without repeating: a hand rather than the whole deck. They
 * are drawn once per surface rather than once per render, so a re-render never
 * swaps them under the eye of someone about to press one.
 */
const drawPrompts = (): string[] => {
  const pool = [...EXAMPLE_PROMPTS];

  return Array.from(
    { length: SHOWN },
    () => pool.splice(Math.floor(Math.random() * pool.length), 1)[0]
  );
};

interface ExamplePromptListProps {
  onChoose(prompt: string): void;
}

/**
 * The requests themselves, as the things a player can press. They are plain text
 * rather than controls with fills: a request is something to say, and four of
 * them beside each other would be four lamps.
 */
export function ExamplePromptList({ onChoose }: ExamplePromptListProps) {
  const [prompts] = useState(drawPrompts);

  return (
    <ul aria-label="What can be asked" className="space-y-1">
      {prompts.map(prompt => (
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
  );
}
