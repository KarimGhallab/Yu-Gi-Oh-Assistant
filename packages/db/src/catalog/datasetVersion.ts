import { createHash } from 'node:crypto';

import type { Card } from '@ygo-assistant/cards';

/**
 * A stable identifier for the set of cards that were indexed. The same cards
 * give the same version, and any change to the card data gives a new one, so
 * the version describes the dataset rather than the moment it was fetched.
 */
export function computeDatasetVersion(cards: Card[]): string {
  const canonical = cards
    .map(card => JSON.stringify(card))
    .sort()
    .join('\n');
  const digest = createHash('sha256').update(canonical).digest('hex');
  return `ygoprodeck-${digest.slice(0, 16)}`;
}
