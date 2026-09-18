import {
  type Card,
  CardAttribute,
  CardRace,
  CardType,
  FrameType,
  Language
} from '@ygo-assistant/cards';

/**
 * A one-pixel transparent image, so a fixture card renders without a network
 * request. The suite never reaches the internet, and a real card image would.
 */
const BLANK_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const sourceFor = (id: number): string => `https://example.test/cards/${id}`;

/**
 * The chat model the fake server reports, and the model and dimensions the
 * harness seeds the index with. The server's configuration must name the same
 * model and dimensions, or its boot guard refuses the index.
 */
export const CHAT_MODEL = 'e2e-chat:1b';
export const SECOND_CHAT_MODEL = 'e2e-chat:2b';
export const EMBEDDING_MODEL = 'e2e-embedding:0.1b';
export const EMBEDDING_DIMENSIONS = 1024;

export const BLUE_EYES: Card = {
  id: 89631139,
  name: 'Blue-Eyes White Dragon',
  language: Language.English,
  type: CardType.NormalMonster,
  frameType: FrameType.Normal,
  typeLine: ['Dragon'],
  race: CardRace.Dragon,
  attribute: CardAttribute.Light,
  level: 8,
  atk: 3000,
  def: 2500,
  linkMarkers: [],
  archetype: 'Blue-Eyes',
  effect: 'This legendary dragon is a powerful engine of destruction.',
  imageUrl: BLANK_IMAGE,
  sourceUrl: sourceFor(89631139)
};

const DARK_MAGICIAN: Card = {
  id: 46986414,
  name: 'Dark Magician',
  language: Language.English,
  type: CardType.NormalMonster,
  frameType: FrameType.Normal,
  typeLine: ['Spellcaster'],
  race: CardRace.Spellcaster,
  attribute: CardAttribute.Dark,
  level: 7,
  atk: 2500,
  def: 2100,
  linkMarkers: [],
  archetype: 'Dark Magician',
  effect: 'The ultimate wizard in terms of attack and defense.',
  imageUrl: BLANK_IMAGE,
  sourceUrl: sourceFor(46986414)
};

/**
 * The same card as {@link DARK_MAGICIAN} in the other language, so a language
 * switch finds a French printing and the pairing of one id to two printings is
 * exercised.
 */
const MAGICIEN_SOMBRE: Card = {
  ...DARK_MAGICIAN,
  name: 'Magicien Sombre',
  language: Language.French,
  effect: "Le magicien ultime en termes d'attaque et de défense."
};

export const MONSTER_REBORN: Card = {
  id: 83764719,
  name: 'Monster Reborn',
  language: Language.English,
  type: CardType.SpellCard,
  frameType: FrameType.Spell,
  typeLine: [],
  race: CardRace.Normal,
  linkMarkers: [],
  effect: 'Target 1 monster in either GY; Special Summon it to your field.',
  imageUrl: BLANK_IMAGE,
  sourceUrl: sourceFor(83764719)
};

export const SOLEMN_JUDGMENT: Card = {
  id: 41420027,
  name: 'Solemn Judgment',
  language: Language.English,
  type: CardType.TrapCard,
  frameType: FrameType.Trap,
  typeLine: [],
  race: CardRace.Counter,
  linkMarkers: [],
  effect:
    'When a monster would be Summoned, OR a Spell/Trap Card is activated: Pay half your LP; negate the Summon or activation, and if you do, destroy that card.',
  imageUrl: BLANK_IMAGE,
  sourceUrl: sourceFor(41420027)
};

/** A card the catalog holds in English only, so a turn can show EN on it. */
const POT_OF_GREED: Card = {
  id: 55144522,
  name: 'Pot of Greed',
  language: Language.English,
  type: CardType.SpellCard,
  frameType: FrameType.Spell,
  typeLine: [],
  race: CardRace.Normal,
  linkMarkers: [],
  effect: 'Draw 2 cards.',
  imageUrl: BLANK_IMAGE,
  sourceUrl: sourceFor(55144522)
};

/** A card the catalog holds in French only, the mirror of {@link POT_OF_GREED}. */
const DRAGON_CYBER: Card = {
  id: 70095154,
  name: 'Dragon Cyber',
  language: Language.French,
  type: CardType.EffectMonster,
  frameType: FrameType.Effect,
  typeLine: ['Machine'],
  race: CardRace.Machine,
  attribute: CardAttribute.Light,
  level: 5,
  atk: 2100,
  def: 1600,
  linkMarkers: [],
  effect:
    "Si cette carte attaque, votre adversaire ne peut pas activer de Carte Magie/Piège jusqu'à la fin de la Damage Step.",
  imageUrl: BLANK_IMAGE,
  sourceUrl: sourceFor(70095154)
};

/**
 * The catalog the suite indexes: an archetype to filter on, a Spell, a Trap,
 * and a pair that exists in only one language each.
 */
export const FIXTURE_CARDS: Card[] = [
  BLUE_EYES,
  DARK_MAGICIAN,
  MAGICIEN_SOMBRE,
  MONSTER_REBORN,
  SOLEMN_JUDGMENT,
  POT_OF_GREED,
  DRAGON_CYBER
];
