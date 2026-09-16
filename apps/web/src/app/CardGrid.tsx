import { useState } from 'react';

import { type Message } from '@ygo-assistant/contracts';

/**
 * A card as an answer carries it. The client renders the shape the contracts
 * describe rather than depending on the catalog package, so a stored answer and
 * a live turn are the same thing here.
 */
type SuggestedCard = NonNullable<Message['cards']>[number];

interface CardGridProps {
  cards: SuggestedCard[];
}

/**
 * The cards an answer was built from, in the order the server ranked them. Each
 * one is a link to the source the facts came from, so the player can check a
 * suggestion rather than trust it.
 */
export default function CardGrid({ cards }: CardGridProps) {
  return (
    <ul
      aria-label="Suggested cards"
      className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-3">
      {cards.map(card => (
        <li key={card.id}>
          <CardTile card={card} />
        </li>
      ))}
    </ul>
  );
}

interface CardTileProps {
  card: SuggestedCard;
}

/**
 * One card on the bench: its printed face, untouched, and its name under it. An
 * image that will not load leaves the frame standing with the name, so a card is
 * never an empty box. The name is the link's label and the fallback is silent to
 * assistive technology, so a card is announced by its name either way.
 */
function CardTile({ card }: CardTileProps) {
  const [imageFailed, setImageFailed] = useState(card.imageUrl.length === 0);

  return (
    <a
      href={card.sourceUrl}
      target="_blank"
      rel="noreferrer"
      className="group flex flex-col gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">
      <span className="flex aspect-[421/614] items-center justify-center border border-neutral-800 bg-neutral-900 group-hover:border-amber-500">
        {imageFailed ? (
          <span
            aria-hidden="true"
            className="px-2 text-center text-sm text-neutral-500">
            No image
          </span>
        ) : (
          <img
            src={card.imageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-contain"
            onError={() => setImageFailed(true)}
          />
        )}
      </span>
      <span className="text-sm text-neutral-100">{card.name}</span>
    </a>
  );
}
