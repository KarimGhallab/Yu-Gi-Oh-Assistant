import { describe, expect, it } from 'vitest';

import {
  CardAttribute,
  CardFilterField,
  CardType,
  FilterOperator,
  FrameType,
  Language,
  LinkMarker,
  TurnEventName,
  cardFiltersSchema,
  conversationSchema,
  describeFilterFields,
  modelListSchema,
  turnEventSchema
} from '@ygo-assistant/contracts';

const ID = '3f8a1c2e-5b4d-4a6f-9e7c-1d2b3a4c5d6e';

const conversation = {
  id: ID,
  title: 'A banish deck',
  language: 'en',
  model: 'llama3.1:8b',
  createdAt: '2026-09-16T10:00:00.000Z',
  updatedAt: '2026-09-16T10:00:00.000Z'
};

describe('the contracts package', () => {
  it('reads a conversation the server would send', () => {
    expect(conversationSchema.parse(conversation)).toEqual(conversation);
  });

  it('refuses a conversation the client could not render', () => {
    expect(
      conversationSchema.safeParse({ ...conversation, id: 'not-a-uuid' })
        .success
    ).toBe(false);
    expect(
      conversationSchema.safeParse({ ...conversation, id: 7 }).success
    ).toBe(false);
  });

  it('reads a streamed frame as the event it names', () => {
    const frame = turnEventSchema.parse({
      type: TurnEventName.TurnEnd,
      messageId: ID
    });

    expect(frame.type).toBe(TurnEventName.TurnEnd);
  });

  it('reads the models a chooser may offer, and what each of them can do', () => {
    const models = [
      {
        name: 'llama3.1:8B',
        supportsCompletion: true,
        supportsStructuredOutput: true
      },
      {
        name: 'nomic-embed-text:latest',
        supportsCompletion: false,
        supportsStructuredOutput: false
      }
    ];

    expect(modelListSchema.parse(models)).toEqual(models);
  });

  it('refuses a listing that does not say what a model can do', () => {
    expect(modelListSchema.safeParse([{ name: 'llama3.1:8B' }]).success).toBe(
      false
    );
  });
});

describe('the filter vocabulary the controls speak', () => {
  it('names both languages the catalog is indexed in', () => {
    expect([...Object.values(Language)].sort()).toEqual(['en', 'fr']);
  });

  it('describes every field the search accepts, with operators the domain names', () => {
    const known = new Set<string>(Object.values(FilterOperator));
    const described = describeFilterFields();

    expect(described.map(entry => entry.field).sort()).toEqual(
      [...Object.values(CardFilterField)].sort()
    );

    for (const entry of described) {
      expect(entry.operators.filter(operator => !known.has(operator))).toEqual(
        []
      );
    }
  });

  it('offers each field the values the domain gives it and no others', () => {
    const values = (field: CardFilterField): string[] =>
      describeFilterFields().find(entry => entry.field === field)?.values ?? [];
    const enumerated: Partial<Record<CardFilterField, readonly string[]>> = {
      [CardFilterField.Type]: Object.values(CardType),
      [CardFilterField.FrameType]: Object.values(FrameType),
      [CardFilterField.Attribute]: Object.values(CardAttribute),
      [CardFilterField.LinkMarkers]: Object.values(LinkMarker)
    };

    for (const field of Object.values(CardFilterField)) {
      expect([...values(field)].sort()).toEqual(
        [...(enumerated[field] ?? [])].sort()
      );
    }
  });

  it('reads a filter built from the vocabulary the controls are offered', () => {
    const [frameType] = describeFilterFields().filter(
      entry => entry.field === CardFilterField.FrameType
    );
    const [operator] = frameType?.operators ?? [];
    const [value] = frameType?.values ?? [];

    expect(
      cardFiltersSchema.safeParse([
        { field: CardFilterField.FrameType, operator, value }
      ]).success
    ).toBe(true);
  });
});
