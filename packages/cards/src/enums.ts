/**
 * Languages the card catalog is indexed in.
 */
export enum Language {
  English = 'en',
  French = 'fr'
}

/**
 * Monster attributes reported by YGOPRODeck. Spell and Trap cards have none.
 */
export enum CardAttribute {
  Dark = 'DARK',
  Light = 'LIGHT',
  Water = 'WATER',
  Fire = 'FIRE',
  Earth = 'EARTH',
  Wind = 'WIND',
  Divine = 'DIVINE'
}

/**
 * Card types reported by YGOPRODeck, verbatim.
 */
export enum CardType {
  NormalMonster = 'Normal Monster',
  NormalTunerMonster = 'Normal Tuner Monster',
  EffectMonster = 'Effect Monster',
  FlipEffectMonster = 'Flip Effect Monster',
  ToonMonster = 'Toon Monster',
  GeminiMonster = 'Gemini Monster',
  UnionEffectMonster = 'Union Effect Monster',
  SpiritMonster = 'Spirit Monster',
  SkillCard = 'Skill Card',
  TunerMonster = 'Tuner Monster',
  FlipTunerEffectMonster = 'Flip Tuner Effect Monster',
  FusionMonster = 'Fusion Monster',
  RitualEffectMonster = 'Ritual Effect Monster',
  RitualMonster = 'Ritual Monster',
  SynchroMonster = 'Synchro Monster',
  SynchroTunerMonster = 'Synchro Tuner Monster',
  XYZMonster = 'XYZ Monster',
  PendulumNormalMonster = 'Pendulum Normal Monster',
  PendulumEffectMonster = 'Pendulum Effect Monster',
  PendulumTunerEffectMonster = 'Pendulum Tuner Effect Monster',
  PendulumFlipEffectMonster = 'Pendulum Flip Effect Monster',
  PendulumEffectFusionMonster = 'Pendulum Effect Fusion Monster',
  PendulumEffectRitualMonster = 'Pendulum Effect Ritual Monster',
  SynchroPendulumEffectMonster = 'Synchro Pendulum Effect Monster',
  XYZPendulumEffectMonster = 'XYZ Pendulum Effect Monster',
  LinkMonster = 'Link Monster',
  Token = 'Token',
  SpellCard = 'Spell Card',
  TrapCard = 'Trap Card'
}

/**
 * Frame types reported by YGOPRODeck, verbatim.
 */
export enum FrameType {
  Spell = 'spell',
  Trap = 'trap',
  Skill = 'skill',
  Effect = 'effect',
  Link = 'link',
  Normal = 'normal',
  Synchro = 'synchro',
  Fusion = 'fusion',
  NormalPendulum = 'normal_pendulum',
  Xyz = 'xyz',
  EffectPendulum = 'effect_pendulum',
  Ritual = 'ritual',
  Token = 'token',
  FusionPendulum = 'fusion_pendulum',
  XyzPendulum = 'xyz_pendulum',
  SynchroPendulum = 'synchro_pendulum',
  RitualPendulum = 'ritual_pendulum'
}

/**
 * Link arrows reported by YGOPRODeck.
 */
export enum LinkMarker {
  Top = 'Top',
  TopRight = 'Top-Right',
  Right = 'Right',
  BottomRight = 'Bottom-Right',
  Bottom = 'Bottom',
  BottomLeft = 'Bottom-Left',
  Left = 'Left',
  TopLeft = 'Top-Left'
}

/**
 * Card fields a structured filter can constrain. The set is the vocabulary
 * shared by parsing, retrieval, and the UI, so nothing may filter on a field
 * the index does not carry.
 */
export enum CardFilterField {
  Type = 'type',
  FrameType = 'frameType',
  Race = 'race',
  Attribute = 'attribute',
  Level = 'level',
  Atk = 'atk',
  Def = 'def',
  LinkVal = 'linkVal',
  LinkMarkers = 'linkMarkers',
  Archetype = 'archetype'
}

/**
 * Comparison a structured filter applies to a card field. Which operators fit a
 * field depends on whether the field is numeric, textual, or enumerated.
 */
export enum FilterOperator {
  Eq = 'eq',
  Ne = 'ne',
  Gt = 'gt',
  Gte = 'gte',
  Lt = 'lt',
  Lte = 'lte',
  Contains = 'contains',
  StartsWith = 'startsWith',
  EndsWith = 'endsWith'
}
