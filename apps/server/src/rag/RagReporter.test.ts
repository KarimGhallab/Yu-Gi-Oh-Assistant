import { afterEach, describe, expect, it, vi } from 'vitest';

import { Language } from '@ygo-assistant/cards';

import { RagReporter } from './RagReporter.js';

const header = {
  prompt: 'a dragon',
  language: Language.English,
  model: 'canned:1b',
  topK: 25,
  shown: 8,
  minScore: 0
};

/** Runs the reporter with stdout captured, and restores stdout afterwards. */
function capture(run: () => void): string {
  const spy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

  try {
    run();
    return spy.mock.calls.map(call => String(call[0])).join('');
  } finally {
    spy.mockRestore();
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('RagReporter', () => {
  it('closes the answer block on a line of its own', () => {
    const reporter = new RagReporter(false);

    const output = capture(() => {
      reporter.header(header);
      reporter.event({ type: 'search', filters: [] });
      reporter.event({ type: 'ranked', ranked: [] });
      reporter.event({ type: 'answer', text: 'No trailing newline.' });
      reporter.finish();
    });

    expect(output).toContain('No trailing newline.\n');
    expect(output).toContain('Done in');
  });

  it('writes one JSON line per event in JSON mode', () => {
    const reporter = new RagReporter(true);

    const output = capture(() => {
      reporter.header(header);
      reporter.event({ type: 'ranked', ranked: [] });
      reporter.finish();
    });

    const lines = output.trim().split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('"type":"header"');
    expect(lines[1]).toContain('"type":"ranked"');
    expect(lines[2]).toContain('"type":"done"');
  });
});
