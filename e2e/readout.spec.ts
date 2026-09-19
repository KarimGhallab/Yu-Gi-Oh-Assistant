import { type Page, expect, test } from '@playwright/test';

/**
 * The scripted request, the answer the fake writes, and the filter the fake's
 * parse returns, which is what the readout should say first. The correction and
 * the added filter are values the parse would never produce, so a readout that
 * still shows them after a turn is a readout the server echoed rather than a
 * request it read again.
 */
const REQUEST = 'a dragon with the highest attack';
const ANSWER = 'Based on your request, these cards stand out:';
const PARSED = 'Change Type is normal monster';

async function ask(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Your request' }).fill(REQUEST);
  await page.getByRole('button', { name: 'Send', exact: true }).click();

  await expect(page.getByText(ANSWER, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: PARSED })).toBeVisible();
}

/**
 * Correcting a fact is searched with on the next turn rather than the request
 * being read again, and the server's echo is the proof: the readout still says
 * what the player corrected it to once the turn is over.
 */
test('corrects a fact and searches the next turn with it', async ({ page }) => {
  await ask(page);

  await page.getByRole('button', { name: PARSED }).click();
  await page.getByRole('button', { name: 'Value normal monster' }).click();
  await page.getByRole('option', { name: 'spell card' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(
    page.getByRole('button', { name: 'Change Type is spell card' })
  ).toBeVisible();

  await page.getByRole('textbox', { name: 'Your request' }).fill(REQUEST);
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText(ANSWER, { exact: true })).toHaveCount(2);

  await expect(
    page.getByRole('button', { name: 'Change Type is spell card' })
  ).toBeVisible();
  await expect(page.getByRole('button', { name: PARSED })).toHaveCount(0);
});

/**
 * A filter the request never named can be added from the fields the domain
 * supports, inside the bounds it allows, and it joins the parse for the next
 * turn the way a correction does.
 */
test('adds a filter the request never named', async ({ page }) => {
  await ask(page);

  await page.getByRole('button', { name: 'Add a filter' }).click();

  // A new filter starts on a level, a field the game bounds at 1 to 12.
  await expect(page.getByLabel('Value')).toHaveAttribute('min', '1');
  await expect(page.getByLabel('Value')).toHaveAttribute('max', '12');

  await page.getByRole('button', { name: 'Field Level' }).click();
  await page.getByRole('option', { name: 'Race' }).click();
  await page.getByRole('button', { name: /^Value / }).click();
  await page.getByRole('option', { name: 'Dragon' }).click();
  await page.getByRole('button', { name: 'Add' }).click();

  await expect(page.getByRole('button', { name: PARSED })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Change Race is dragon' })
  ).toBeVisible();

  await page.getByRole('textbox', { name: 'Your request' }).fill(REQUEST);
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText(ANSWER, { exact: true })).toHaveCount(2);

  await expect(page.getByRole('button', { name: PARSED })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Change Race is dragon' })
  ).toBeVisible();
});

/**
 * A fact can be taken away, and the next turn is searched with none at all
 * rather than the request being read again.
 */
test('takes a filter away and searches with none', async ({ page }) => {
  await ask(page);

  await page.getByRole('button', { name: PARSED }).click();
  await page.getByRole('button', { name: 'Remove' }).click();

  await expect(page.getByText('No filters', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: PARSED })).toHaveCount(0);

  await page.getByRole('textbox', { name: 'Your request' }).fill(REQUEST);
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText(ANSWER, { exact: true })).toHaveCount(2);

  await expect(page.getByText('No filters', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: PARSED })).toHaveCount(0);
});
