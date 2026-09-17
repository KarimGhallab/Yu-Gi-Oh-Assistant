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
  turnEventSchema
} from '@ygo-assistant/contracts';

const conversation = {
  id: 1,
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
      conversationSchema.safeParse({ ...conversation, id: 0 }).success
    ).toBe(false);
  });

  it('reads a streamed frame as the event it names', () => {
    const frame = turnEventSchema.parse({
      type: TurnEventName.TurnEnd,
      messageId: 7
    });

    expect(frame.type).toBe(TurnEventName.TurnEnd);
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
