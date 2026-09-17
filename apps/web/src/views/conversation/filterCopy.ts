import {
  type CardFilter,
  CardFilterField,
  FilterOperator
} from '@ygo-assistant/contracts';

/**
 * What a filter says in words. The field and the operator are the vocabulary's
 * own machine names, so they are read here rather than sent by the server, and
 * both maps are exhaustive: a field or an operator the domain grows is a
 * compile error until it can be said out loud.
 */
const FIELD_NAMES: Record<CardFilterField, string> = {
  [CardFilterField.Type]: 'type',
  [CardFilterField.FrameType]: 'frame type',
  [CardFilterField.Race]: 'race',
  [CardFilterField.Attribute]: 'attribute',
  [CardFilterField.Level]: 'level',
  [CardFilterField.Atk]: 'ATK',
  [CardFilterField.Def]: 'DEF',
  [CardFilterField.LinkVal]: 'link value',
  [CardFilterField.LinkMarkers]: 'link markers',
  [CardFilterField.Archetype]: 'archetype'
};

const OPERATOR_NAMES: Record<FilterOperator, string> = {
  [FilterOperator.Eq]: 'is',
  [FilterOperator.Ne]: 'is not',
  [FilterOperator.Gt]: 'above',
  [FilterOperator.Gte]: 'at least',
  [FilterOperator.Lt]: 'below',
  [FilterOperator.Lte]: 'at most',
  [FilterOperator.Contains]: 'contains',
  [FilterOperator.StartsWith]: 'starts with',
  [FilterOperator.EndsWith]: 'ends with'
};

/**
 * One filter in words: the field it constrains, and what it asks of that field.
 * The two are apart so the readout can set the field quietly and the ask beside
 * it without either becoming a second sentence.
 */
export interface FilterInWords {
  field: string;
  says: string;
}

export const describeFilter = (filter: CardFilter): FilterInWords => ({
  field: FIELD_NAMES[filter.field],
  says: `${OPERATOR_NAMES[filter.operator]} ${String(filter.value)}`
});
