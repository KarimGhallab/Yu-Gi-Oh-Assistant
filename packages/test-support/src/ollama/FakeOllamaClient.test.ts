import { describe, expect, it } from 'vitest';

import type { ChatChunk } from '@ygo-assistant/ollama';

import { FakeOllamaClient } from './FakeOllamaClient.js';

const collect = async <T>(iterable: AsyncIterable<T>): Promise<T[]> => {
  const items: T[] = [];
  for await (const item of iterable) {
    items.push(item);
  }
  return items;
};

describe('FakeOllamaClient', () => {
  it('returns the canned models', async () => {
    const models = [
      {
        name: 'qwen3:4b',
        supportsCompletion: true,
        supportsStructuredOutput: true
      }
    ];
    const client = new FakeOllamaClient({ models });

    await expect(client.listModels()).resolves.toEqual(models);
  });

  it('returns the canned embeddings', async () => {
    const embeddings = [[0.1, 0.2, 0.3]];
    const client = new FakeOllamaClient({ embeddings });

    await expect(client.embed(['a card'])).resolves.toEqual(embeddings);
  });

  it('generates zero vectors of the default dimension when none are canned', async () => {
    const client = new FakeOllamaClient();

    const vectors = await client.embed(['one', 'two']);

    expect(vectors).toHaveLength(2);
    expect(vectors[0]).toHaveLength(1024);
    expect(vectors.every(vector => vector.every(value => value === 0))).toBe(
      true
    );
  });

  it('streams the canned chat chunks in order', async () => {
    const chunks = [
      { content: 'first ', done: false },
      { content: 'second', done: true }
    ];
    const client = new FakeOllamaClient({ chatChunks: chunks });

    await expect(
      collect(client.chat({ model: 'qwen3:4b', messages: [] }))
    ).resolves.toEqual(chunks);
  });

  it('streams a default chunk when none are canned', async () => {
    const client = new FakeOllamaClient();

    const chunks = await collect(
      client.chat({ model: 'qwen3:4b', messages: [] })
    );

    expect(chunks).toHaveLength(1);
    expect(chunks[0].done).toBe(true);
  });

  it('records what the application asked for', async () => {
    const client = new FakeOllamaClient();

    await client.embed(['alpha']);
    await collect(client.chat({ model: 'qwen3:4b', messages: [] }));

    expect(client.embeddedInputs).toEqual([['alpha']]);
    expect(client.chatRequests).toHaveLength(1);
    expect(client.chatRequests[0].model).toBe('qwen3:4b');
  });

  it('streams a different script per chat call', async () => {
    const client = new FakeOllamaClient({
      chatResponses: [
        [{ content: 'first', done: true }],
        [
          { content: 'second', done: false },
          { content: '', done: true }
        ]
      ]
    });

    const first = await collect(
      client.chat({ model: 'qwen3:4b', messages: [] })
    );
    const second = await collect(
      client.chat({ model: 'qwen3:4b', messages: [] })
    );

    expect(first).toEqual([{ content: 'first', done: true }]);
    expect(second).toEqual([
      { content: 'second', done: false },
      { content: '', done: true }
    ]);
  });

  it('falls back to the single script once the per-call ones run out', async () => {
    const client = new FakeOllamaClient({
      chatChunks: [{ content: 'and again', done: true }],
      chatResponses: [[{ content: 'first', done: true }]]
    });

    await collect(client.chat({ model: 'qwen3:4b', messages: [] }));
    const second = await collect(
      client.chat({ model: 'qwen3:4b', messages: [] })
    );

    expect(second).toEqual([{ content: 'and again', done: true }]);
  });

  it('streams a call and then fails it when the call is scripted to fail', async () => {
    const client = new FakeOllamaClient({
      chatResponses: [
        [{ content: 'the answer begins ', done: false }],
        [{ content: '{"query":"x"}', done: true }]
      ],
      chatFailures: [new Error('the model died'), undefined]
    });
    const streamed: ChatChunk[] = [];

    const dies = async (): Promise<void> => {
      for await (const chunk of client.chat({
        model: 'qwen3:4b',
        messages: []
      })) {
        streamed.push(chunk);
      }
    };

    await expect(dies()).rejects.toThrow('the model died');
    expect(streamed).toEqual([{ content: 'the answer begins ', done: false }]);
    await expect(
      collect(client.chat({ model: 'qwen3:4b', messages: [] }))
    ).resolves.toEqual([{ content: '{"query":"x"}', done: true }]);
  });
});
