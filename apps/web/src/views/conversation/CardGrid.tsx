import { useState } from 'react';

import { Language, type Message } from '@ygo-assistant/contracts';

import CardDetail, { CARD_DETAIL_NAME, useCardDetail } from './CardDetail.js';

/**
 * A card as an answer carries it. The client renders the shape the contracts
 * describe rather than depending on the catalog package, so a stored answer and
 * a live turn are the same thing here.
 */
export type SuggestedCard = NonNullable<Message['cards']>[number];

/**
 * The languages a card can be in, as the marker names them: a code, because the
 * card's language is a machine fact rather than a word the player chose.
 */
const LANGUAGE_CODES: Record<Language, string> = {
  [Language.English]: 'EN',
  [Language.French]: 'FR'
};

interface CardGridProps {
  cards: SuggestedCard[];
  language: Language;
}

/**
 * The cards an answer was built from, in the order the server ranked them.
 * Pressing one opens its printed face in the middle of the room, where the
 * effect and the stats can be read, and the source the facts came from is a
 * press away in the face itself rather than a link the tile carries.
 */
export default function CardGrid({ cards, language }: CardGridProps) {
  const detail = useCardDetail();

  return (
    <>
      <ul
        aria-label="Suggested cards"
        className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-3">
        {cards.map(card => (
          <li key={card.id}>
            <CardTile
              card={card}
              language={language}
              onOpen={button => detail.openCard(card, button)}
              morphing={detail.morphing === card.id}
            />
          </li>
        ))}
      </ul>
      {detail.open === undefined ? null : (
        <CardDetail card={detail.open} onClose={detail.close} />
      )}
    </>
  );
}

interface CardTileProps {
  card: SuggestedCard;
  language: Language;
  onOpen(button: HTMLButtonElement): void;
  morphing: boolean;
}

/**
 * One card on the bench: its printed face, untouched, and its name under it. An
 * image that will not load leaves the frame standing with the name, so a card is
 * never an empty box. The name is the control's label and the fallback is silent
 * to assistive technology, so a card is announced by its name either way.
 *
 * The tile is the card's resting place and the face is the same object opened
 * larger, so the tile's own face is what the view transition carries when it
 * opens. It is its own hover group, named so that pointing at it steps only its
 * own frame: the turn around it is a group too, and a plain group-hover would
 * light every card in the turn at once. A card the conversation's language has
 * no printing of still appears, with the language it is in under its name. The
 * marker is text of its own rather than part of the control, so the card is
 * still announced by its name and the note is read after it, and it names the
 * language in words rather than leaning on a color or a shape.
 */
function CardTile({ card, language, onOpen, morphing }: CardTileProps) {
  const [imageFailed, setImageFailed] = useState(card.imageUrl.length === 0);
  const otherLanguage = card.language !== language;

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={event => onOpen(event.currentTarget)}
        className="group/card flex flex-col gap-2 text-left focus-visible:outline-none cursor-pointer">
        <span className="flex aspect-[421/614] items-center justify-center border border-neutral-800 bg-neutral-900 group-hover/card:border-amber-500 group-focus-visible/card:border-amber-500">
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
              style={
                morphing ? { viewTransitionName: CARD_DETAIL_NAME } : undefined
              }
              className="h-full w-full object-contain"
              onError={() => setImageFailed(true)}
            />
          )}
        </span>
        <span className="text-sm text-neutral-100">{card.name}</span>
      </button>
      {otherLanguage ? (
        <span className="font-mono text-xs text-neutral-500">
          {LANGUAGE_CODES[card.language]} only
        </span>
      ) : null}
    </div>
  );
}
