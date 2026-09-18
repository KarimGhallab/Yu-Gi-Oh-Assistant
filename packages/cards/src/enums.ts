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
 * Races reported by YGOPRODeck, verbatim. The dump carries both halves of the
 * field under this one name: a monster's race, and a Spell or Trap's property.
 * Both are enumerated here rather than split into two vocabularies the data does
 * not separate, and the values a card can never carry, such as the character
 * names the dump puts in this field for a handful of promotional cards, are left
 * out so the filter offers a real choice.
 */
export enum CardRace {
  Aqua = 'Aqua',
  Beast = 'Beast',
  BeastWarrior = 'Beast-Warrior',
  Cyberse = 'Cyberse',
  Dinosaur = 'Dinosaur',
  DivineBeast = 'Divine-Beast',
  Dragon = 'Dragon',
  Fairy = 'Fairy',
  Fiend = 'Fiend',
  Fish = 'Fish',
  Illusion = 'Illusion',
  Insect = 'Insect',
  Machine = 'Machine',
  Plant = 'Plant',
  Psychic = 'Psychic',
  Pyro = 'Pyro',
  Reptile = 'Reptile',
  Rock = 'Rock',
  SeaSerpent = 'Sea Serpent',
  Spellcaster = 'Spellcaster',
  Thunder = 'Thunder',
  Warrior = 'Warrior',
  WingedBeast = 'Winged Beast',
  Wyrm = 'Wyrm',
  Zombie = 'Zombie',

  // The Spell and Trap properties, which the same field carries.
  Normal = 'Normal',
  Continuous = 'Continuous',
  Equip = 'Equip',
  QuickPlay = 'Quick-Play',
  Field = 'Field',
  Ritual = 'Ritual',
  Counter = 'Counter'
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
