import { type Page, expect, test } from '@playwright/test';

/**
 * The scripted request, the cards it reaches in each language, and the two
 * leads the fake writes. Blue-Eyes is indexed only in English, so the French
 * conversation shows it with the marker; Dark Magician has a French printing, so
 * the switch swaps it for Magicien Sombre. The second model's lead is what
 * proves a turn was carried by the model the player picked.
 */
const REQUEST = 'a dragon with the highest attack';
const ENGLISH_CARDS = ['Blue-Eyes White Dragon', 'Dark Magician'];
const FRENCH_CARDS = ['Blue-Eyes White Dragon', 'Magicien Sombre'];
const ANSWER_LEAD = 'Based on your request, these cards stand out:';
const SECOND_ANSWER_LEAD = 'The second model read your request:';

async function ask(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Your request' }).fill(REQUEST);
  await page.getByRole('button', { name: 'Send', exact: true }).click();

  await expect(
    page.getByRole('list', { name: 'Suggested cards' }).getByRole('button')
  ).toHaveText(ENGLISH_CARDS);
}

async function switchLanguage(page: Page, to: string): Promise<void> {
  await page.getByRole('button', { name: 'Cards in English' }).click();
  await page.getByRole('option', { name: to }).click();
}

test('switching the language re-reads the cards', async ({ page }) => {
  await ask(page);

  const cards = page.getByRole('list', { name: 'Suggested cards' });
  await switchLanguage(page, 'French');

  await expect(cards.getByRole('button')).toHaveText(FRENCH_CARDS);

  // The card the catalog has only in English still appears, saying so, and the
  // one it has in French carries no marker.
  await expect(cards.getByText('EN only')).toHaveCount(1);
});

test('a picked model is carried by the next turn and survives a reopen', async ({
  page
}) => {
  await ask(page);
  await switchLanguage(page, 'French');
  await expect(
    page.getByRole('button', { name: 'Cards in French' })
  ).toBeVisible();

  await page.getByRole('button', { name: 'Answered by e2e-chat:1b' }).click();
  await page.getByRole('option', { name: 'e2e-chat:2b' }).click();
  await expect(
    page.getByRole('button', { name: 'Answered by e2e-chat:2b' })
  ).toBeVisible();

  await page.getByRole('textbox', { name: 'Your request' }).fill(REQUEST);
  await page.getByRole('button', { name: 'Send', exact: true }).click();

  // The turn ran on the picked model, because the answer says so.
  await expect(
    page.getByText(SECOND_ANSWER_LEAD, { exact: true })
  ).toBeVisible();

  await page.goto(page.url());

  const history = page.getByRole('region', { name: 'Messages' });
  await expect(history.getByText(REQUEST, { exact: true })).toHaveCount(2);
  await expect(history.getByText(ANSWER_LEAD, { exact: true })).toHaveCount(1);
  await expect(
    history.getByText(SECOND_ANSWER_LEAD, { exact: true })
  ).toHaveCount(1);
  await expect(
    history.getByRole('list', { name: 'Suggested cards' })
  ).toHaveCount(2);
  await expect(
    page.getByRole('button', { name: 'Cards in French' })
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Answered by e2e-chat:2b' })
  ).toBeVisible();
});
