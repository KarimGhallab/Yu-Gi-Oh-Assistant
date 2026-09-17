import type { CardFilter, CardFilters } from '@ygo-assistant/cards';
import { FilterOperator } from '@ygo-assistant/cards';

/**
 * Removes filters that cannot all hold at once. A model asked for a request
 * that allows alternatives can answer with two equality filters on one field,
 * and the AND-combined search can never satisfy those, so the whole group is
 * dropped rather than left to match nothing; the alternatives are already in
 * the free text the search ranks on.
 *
 * Only equality is treated this way: a range on one field, such as a level
 * above four and below seven, is a pair that can and should hold together.
 */
export function dropContradictions(filters: CardFilters): CardFilters {
  const valuesByField = equalityValues(filters);

  return filters.filter(
    filter =>
      filter.operator !== FilterOperator.Eq ||
      (valuesByField.get(filter.field)?.size ?? 0) <= 1
  );
}

function equalityValues(filters: CardFilters): Map<string, Set<string>> {
  const valuesByField = new Map<string, Set<string>>();

  for (const filter of filters) {
    if (!isEquality(filter)) {
      continue;
    }
    const values = valuesByField.get(filter.field) ?? new Set<string>();
    values.add(String(filter.value));
    valuesByField.set(filter.field, values);
  }

  return valuesByField;
}

function isEquality(filter: CardFilter): boolean {
  return filter.operator === FilterOperator.Eq;
}
