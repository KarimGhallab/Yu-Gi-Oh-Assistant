import { Language } from '../enums.js';
import { CardFilterField, FilterOperator } from './schema.js';

/**
 * What a filter's field is called in the language the words are read in. The
 * domain names its own fields, so a field the schema grows is named here or the
 * map stops compiling, and the client's readout and the server's empty answer
 * say the same word for it.
 */
const FIELD_NAMES: Record<Language, Record<CardFilterField, string>> = {
  [Language.English]: {
    [CardFilterField.Type]: 'Type',
    [CardFilterField.Race]: 'Race',
    [CardFilterField.Attribute]: 'Attribute',
    [CardFilterField.Level]: 'Level',
    [CardFilterField.Atk]: 'Atk',
    [CardFilterField.Def]: 'Def',
    [CardFilterField.LinkVal]: 'Link value',
    [CardFilterField.LinkMarkers]: 'Link markers',
    [CardFilterField.Archetype]: 'Archetype'
  },
  [Language.French]: {
    [CardFilterField.Type]: 'Type',
    [CardFilterField.Race]: 'Race',
    [CardFilterField.Attribute]: 'Attribut',
    [CardFilterField.Level]: 'Niveau',
    [CardFilterField.Atk]: 'ATK',
    [CardFilterField.Def]: 'DEF',
    [CardFilterField.LinkVal]: 'Valeur Lien',
    [CardFilterField.LinkMarkers]: 'Marqueurs Lien',
    [CardFilterField.Archetype]: 'Archétype'
  }
};

/**
 * What a filter's operator is called. The words are English because the only
 * surface that reads them is the client's readout; an operator named in the
 * language an answer is written in would make this map language-keyed the way
 * the fields' map is.
 */
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

/** What a field is called, in English unless another language is asked for. */
export const cardFilterFieldName = (
  field: CardFilterField,
  language: Language = Language.English
): string => FIELD_NAMES[language][field];

/** What an operator is called. */
export const cardFilterOperatorName = (operator: FilterOperator): string =>
  OPERATOR_NAMES[operator];
