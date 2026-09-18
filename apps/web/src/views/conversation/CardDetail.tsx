import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import type { Message } from '@ygo-assistant/contracts';

import CloseIcon from '../../shared/components/icons/CloseIcon.js';
import { runViewTransition } from '../../shared/runViewTransition.js';

/**
 * The name the tile in the grid and the opened face share, so a view transition
 * carries one into the other as a single object.
 */
export const CARD_DETAIL_NAME = 'card-detail';

/**
 * A card as the contracts carry it, which is what the grid already draws. The
 * detail renders the same shape rather than depending on the catalog package, so
 * a stored answer and a live turn are the same thing here too.
 */
type DetailCard = NonNullable<Message['cards']>[number];

/**
 * The dialog's own id, because there is one of it at a time and what names it
 * has to name something that is there.
 */
const TITLE_ID = 'card-detail-title';

interface CardDetailProps {
  card: DetailCard;
  onClose(): void;
}

/**
 * The printed face of one suggested card, in the middle of the room, large
 * enough to read. The card is the whole of the content: the facts the tile
 * cannot make legible are on the face itself, so nothing is drawn over it and
 * nothing restates it.
 *
 * The room is dimmed a step further behind it and the face keeps its printed
 * ratio, uncropped and unrounded. The dialog takes the room while it is open, so
 * it carries its own close mark and its own link to the source the card came
 * from, and it introduces no second accent: the face and the close stay neutral,
 * and only the focus ring lights. Escape and a press in the room outside call it
 * off, the keyboard is put on the close mark and stays between it and the
 * source, and focus goes back to the tile that asked.
 */
export default function CardDetail({ card, onClose }: CardDetailProps) {
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    close.current?.focus();
  }, []);

  const keys = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      onClose();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    // The keyboard stays on what the face offers rather than walking off into
    // the conversation behind it, which is not being read while this is open.
    const inside =
      dialog.current?.querySelectorAll<HTMLElement>('button, a') ?? [];
    const first = inside[0];
    const last = inside[inside.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    }

    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  return (
    <div
      onMouseDown={event => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-neutral-950/70 p-6">
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        onKeyDown={keys}
        className="flex flex-col items-center gap-4">
        <h2 id={TITLE_ID} className="sr-only">
          {card.name}
        </h2>
        <button
          ref={close}
          type="button"
          onClick={onClose}
          className="absolute right-6 top-6 rounded p-2 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">
          <CloseIcon />
          <span className="sr-only">Close the card</span>
        </button>
        <img
          src={card.imageUrl}
          alt=""
          style={{ viewTransitionName: CARD_DETAIL_NAME }}
          className="max-h-[78vh] max-w-[92vw] object-contain"
        />
        <a
          href={card.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-xs text-neutral-400 underline decoration-neutral-800 underline-offset-2 hover:text-neutral-100 hover:decoration-amber-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">
          View on YGOPRODeck
        </a>
      </div>
    </div>
  );
}

interface CardDetailState {
  open?: DetailCard;
  morphing?: number;
  openCard(card: DetailCard, button: HTMLButtonElement): void;
  close(): void;
}

/**
 * Which card the grid has opened, and the two movements that carry the tile into
 * the face and back. The tile is named for the transition only for as long as
 * the movement lasts, so the name is on exactly one element at any moment: the
 * tile on the way out, the face on the way in.
 */
export function useCardDetail(): CardDetailState {
  const [open, setOpen] = useState<DetailCard | undefined>(undefined);
  const [morphing, setMorphing] = useState<number | undefined>(undefined);
  const trigger = useRef<HTMLButtonElement | null>(null);

  const openCard = (card: DetailCard, button: HTMLButtonElement): void => {
    trigger.current = button;
    flushSync(() => setMorphing(card.id));
    runViewTransition(() => {
      setOpen(card);
      setMorphing(undefined);
    });
  };

  const close = (): void => {
    const card = open;

    if (card === undefined) {
      return;
    }

    const transition = runViewTransition(() => {
      setOpen(undefined);
      setMorphing(card.id);
    });

    const settle = (): void => {
      setMorphing(undefined);
      trigger.current?.focus();
    };

    if (transition === undefined) {
      settle();
      return;
    }

    void transition.finished.finally(settle);
  };

  return { open, morphing, openCard, close };
}
