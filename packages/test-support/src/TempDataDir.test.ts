import { stat } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { TempDataDir } from './TempDataDir.js';

const exists = async (path: string): Promise<boolean> => {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
};

describe('TempDataDir', () => {
  it('creates a directory that exists on disk', async () => {
    const dir = await TempDataDir.create();

    try {
      expect(await exists(dir.path)).toBe(true);
    } finally {
      await dir.cleanup();
    }
  });

  it('creates an isolated directory for each call', async () => {
    const first = await TempDataDir.create();
    const second = await TempDataDir.create();

    try {
      expect(first.path).not.toBe(second.path);
    } finally {
      await first.cleanup();
      await second.cleanup();
    }
  });

  it('removes the directory on cleanup', async () => {
    const dir = await TempDataDir.create();
    expect(await exists(dir.path)).toBe(true);

    await dir.cleanup();

    expect(await exists(dir.path)).toBe(false);
  });
});
