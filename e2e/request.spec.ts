import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  await page.getByRole('button', { name: 'Send', exact: true }).click();

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

/**
 * The two failure seams. One crosses the socket and lands in the interface: a
 * request the fake is written to fail on makes the answer stage give way, so the
 * app says so and keeps the question with no reply. The other is a boot guard
 * asserted on the process: a server pointed at an empty data directory refuses
 * to start and names the command that would build an index.
 *
 * The failure is keyed to the request's own words, so it cannot reach a test
 * running beside it.
 */
const FAILURE_REQUEST = 'a card that makes the model meltdown';

test('a failed model call says so and keeps the question', async ({ page }) => {
  await page.goto('/');

  await page
    .getByRole('textbox', { name: 'Your request' })
    .fill(FAILURE_REQUEST);
  await page.getByRole('button', { name: 'Send', exact: true }).click();

  await expect(page.getByRole('alert')).toContainText(
    'The answer could not be written'
  );

  const history = page.getByRole('region', { name: 'Messages' });
  await expect(
    history.getByText(FAILURE_REQUEST, { exact: true })
  ).toBeVisible();
  await expect(history.getByText('Assistant', { exact: true })).toHaveCount(0);
  await expect(
    history.getByRole('list', { name: 'Suggested cards' })
  ).toHaveCount(0);
});

test('a server with no index refuses to start and names the build command', async () => {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const dataDir = await mkdtemp(join(tmpdir(), 'ygo-e2e-empty-'));
  let output = '';

  const code = await new Promise<number | null>(resolveCode => {
    const child = spawn('node', [join(repoRoot, 'apps/server/dist/main.js')], {
      cwd: repoRoot,
      env: {
        ...process.env,
        HOST: '127.0.0.1',
        PORT: '3299',
        DATA_DIR: dataDir,
        LOG_DIR: join(dataDir, 'logs'),
        NODE_ENV: 'production',
        LOG_LEVEL: 'error'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    child.stdout?.on('data', chunk => {
      output += String(chunk);
    });
    child.stderr?.on('data', chunk => {
      output += String(chunk);
    });

    child.on('close', resolveCode);
  });

  await rm(dataDir, { recursive: true, force: true });

  expect(code).not.toBe(0);
  expect(output).toContain('db:populate');
});
