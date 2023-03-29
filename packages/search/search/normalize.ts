import { WithBrand } from '@coderspirit/nominal';

/**
 * A normalized property value.
 */
export type NormalizedValue = WithBrand<string, 'NormalizedValue'>;

/**
 * A function that normalizes a property through some arbitrary but consistent means.
 * @nosideeffects
 */
export type NormalizationFunction = (this: void, text: string) => string;

/**
 * Case-folding {@link NormalizationFunction normalization}.
 * @param text The input text.
 * @returns The input text, entirely in lower-case form.
 */
export function casefold(text: string): string {
	return text.toLowerCase();
}

/**
 * Unicode {@link NormalizationFunction normalization}.
 * This uses Normalization Form C.
 *
 * @param text The input text.
 * @returns The input text, normalized according to Unicode NFC rules.
 */
export function unicode(text: string): string {
	return text.normalize('NFC');
}

/**
 * Whitespace trimming {@link NormalizationFunction normalization}.
 * This removes leading and trailing whitespace.
 *
 * @param text The input text.
 * @returns The input text, without leading and trailing whitespace.
 */
export function trimmed(text: string): string {
	return text.trim();
}

/**
 * {@link NormalizationFunction Normalization} that strips accents and combining characters from glyphs.
 *
 * @param text The input text.
 * @returns The input text, without accents.
 */
export function unaccented(text: string): string {
	return text.normalize('NFD').replace(/\p{M}/gu, '');
}

/**
 * Combines multiple {@link NormalizationFunction}s into a single one.
 *
 * @param fns The functions to combine.
 * @returns The combined function.
 */
export function combinedNormalization(fns: NormalizationFunction[]): NormalizationFunction {
	return (text) => {
		for (const fn of fns) {
			text = fn(text);
		}

		return text;
	};
}
