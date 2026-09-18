import { expect, test } from '@playwright/test';

/**
 * The smoke test: the built client, the built server, the seeded index, and the
 * fake Ollama are all up, and the app opens on its empty state. It asserts the
 * document rather than how it renders, because the same test runs on every
 * engine the suite targets.
 */
test('the app opens on the empty state', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Start a conversation' })
  ).toBeVisible();

  await expect(
    page.getByRole('textbox', { name: 'Your request' })
  ).toBeVisible();
});
