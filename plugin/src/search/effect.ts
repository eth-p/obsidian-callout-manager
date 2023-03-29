import { BitField } from './bitfield';

/**
 * How the matching items should affect the search results.
 */
export type SearchEffect = (a: BitField, b: BitField) => BitField;

/**
 * Adds the matching items to the results.
 * (Set Union)
 */
export function add(a: BitField, b: BitField): BitField {
	return BitField.or(a, b);
}

/**
 * Removes the matching items from the results.
 * (Set Difference)
 */
export function remove(a: BitField, b: BitField): BitField {
	return BitField.andNot(a, b);
}

/**
 * Filters the existing results to only include those that also match these.
 * (Set Intersection)
 */
export function filter(a: BitField, b: BitField): BitField {
	return BitField.and(a, b);
}
