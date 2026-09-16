import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DEFAULT_PREFIX = 'ygo-assistant-';

/**
 * An isolated data directory for a single test. It exists only under the
 * system's temporary directory and is removed by cleanup().
 */
export class TempDataDir {
  private constructor(public readonly path: string) {}

  static async create(prefix: string = DEFAULT_PREFIX): Promise<TempDataDir> {
    const path = await mkdtemp(join(tmpdir(), prefix));
    return new TempDataDir(path);
  }

  async cleanup(): Promise<void> {
    await rm(this.path, { recursive: true, force: true });
  }
}
