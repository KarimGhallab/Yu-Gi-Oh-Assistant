import {
  Field,
  FixedSizeList,
  Float32,
  Int32,
  List,
  Schema,
  Utf8
} from 'apache-arrow';

/**
 * The Arrow schema of the card table. The vector column is a fixed-size list so
 * LanceDB can search it, and the fields the retrieval filters on are typed
 * rather than inferred.
 */
export function createCardArrowSchema(dimensions: number): Schema {
  return new Schema([
    new Field('id', new Int32(), false),
    new Field('name', new Utf8(), false),
    new Field('language', new Utf8(), false),
    new Field('type', new Utf8(), false),
    new Field('frameType', new Utf8(), false),
    new Field(
      'typeLine',
      new List(new Field('item', new Utf8(), false)),
      false
    ),
    new Field('race', new Utf8(), false),
    new Field('attribute', new Utf8(), true),
    new Field('level', new Int32(), true),
    new Field('atk', new Int32(), true),
    new Field('def', new Int32(), true),
    new Field('linkVal', new Int32(), true),
    new Field(
      'linkMarkers',
      new List(new Field('item', new Utf8(), false)),
      false
    ),
    new Field('archetype', new Utf8(), true),
    new Field('effect', new Utf8(), false),
    new Field('imageUrl', new Utf8(), false),
    new Field('sourceUrl', new Utf8(), false),
    new Field(
      'vector',
      new FixedSizeList(dimensions, new Field('item', new Float32(), false)),
      false
    )
  ]);
}
