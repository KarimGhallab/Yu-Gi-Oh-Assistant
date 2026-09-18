import { expect, test } from '@playwright/test';

/**
 * The request the fake's parse is scripted to understand, and the two cards it
 * ranks first: the Blue-Eyes the query is written as, then the other Normal
 * Monster the filter admits.
 */
const REQUEST = 'a dragon with the highest attack';
const RANKED = ['Blue-Eyes White Dragon', 'Dark Magician'];
const BLUE_EYES_SOURCE = 'https://example.test/cards/89631139';
const ANSWER = 'Based on your request, these cards stand out:';

/**
 * The core journey: a request typed into the empty state starts a conversation,
 * the answer streams in from the fake model, and the cards it was written from
 * are shown under it, each opening its source. A fresh load of the conversation
 * shows the turn the server stored.
 */
test('a request answers end to end', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('textbox', { name: 'Your request' }).fill(REQUEST);
  await page.getByRole('button', { name: 'Send' }).click();

  const history = page.getByRole('region', { name: 'Messages' });
  await expect(history.getByText(ANSWER, { exact: true })).toBeVisible();

  const cards = history.getByRole('list', { name: 'Suggested cards' });
  await expect(cards.getByRole('button')).toHaveText(RANKED);

  await cards.getByRole('button', { name: RANKED[0] }).click();
  const face = page.getByRole('dialog', { name: RANKED[0] });
  await expect(
    face.getByRole('link', { name: 'View on YGOPRODeck' })
  ).toHaveAttribute('href', BLUE_EYES_SOURCE);
  await page.keyboard.press('Escape');
  await expect(face).toBeHidden();

  await page.goto(page.url());

  const reopened = page.getByRole('region', { name: 'Messages' });
  await expect(reopened.getByText(REQUEST, { exact: true })).toBeVisible();
  await expect(reopened.getByText(ANSWER, { exact: true })).toBeVisible();
  await expect(
    reopened.getByRole('list', { name: 'Suggested cards' }).getByRole('button')
  ).toHaveText(RANKED);
});
