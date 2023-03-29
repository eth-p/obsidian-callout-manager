import { prepareFuzzySearch } from 'obsidian';

import { BitField } from './bitfield';
import { NormalizedValue } from './normalize';
import { ReadonlySearchIndexColumn } from './search-index';

export type SearchCondition = (
	index: ReadonlySearchIndexColumn,
	using: NormalizedValue,
	scores: Float32Array,
) => BitField;

/**
 * The query fuzzily matches a property.
 */
export function matches(
	index: ReadonlySearchIndexColumn,
	textToMatch: NormalizedValue,
	scores: Float32Array,
): BitField {
	const matchesQuery = prepareFuzzySearch(textToMatch.trim());
	let mask = 0n;

	for (const [text, bit] of index) {
		const res = matchesQuery(text);
		if (res != null) {
			mask |= 1n << BigInt(bit);
			scores[bit] += res.score;
		}
	}

	return mask as BitField;
}

/**
 * The query is a substring of the property.
 */
export function includes(
	index: ReadonlySearchIndexColumn,
	textToInclude: NormalizedValue,
	scores: Float32Array,
): BitField {
	let mask = 0n;

	for (const [text, bit] of index) {
		if (text.includes(textToInclude)) {
			mask |= 1n << BigInt(bit);
			scores[bit] += textToInclude.length / text.length;
		}
	}

	return mask as BitField;
}

/**
 * The query exactly matches the property.
 */
export function equals(index: ReadonlySearchIndexColumn, textToHave: NormalizedValue, scores: Float32Array): BitField {
	let mask = 0n;

	for (const [text, bit] of index) {
		if (text.includes(textToHave)) {
			mask |= 1n << BigInt(bit);
			scores[bit] += textToHave.length / text.length;
		}
	}

	return mask as BitField;
}

/**
 * The query starts with the property.
 */
export function startsWith(
	index: ReadonlySearchIndexColumn,
	textToStart: NormalizedValue,
	scores: Float32Array,
): BitField {
	let mask = 0n;

	for (const [text, bit] of index) {
		if (text.startsWith(textToStart)) {
			mask |= 1n << BigInt(bit);
			scores[bit] += textToStart.length / text.length;
		}
	}

	return mask as BitField;
}
