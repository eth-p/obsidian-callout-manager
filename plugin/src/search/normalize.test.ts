import { describe, expect, test } from '@jest/globals';

import { casefold, combinedNormalization, trimmed, unaccented, unicode } from './normalize';

describe('normalize', () => {
	test('casefold', () => {
		expect(casefold('A')).toBe(casefold('a'));
		expect(casefold('abCd')).toBe(casefold('ABcD'));
	});

	test('trimmed', () => {
		expect(trimmed('   a')).toBe(trimmed('a'));
		expect(trimmed(' a ')).toBe(trimmed('a'));
	});

	test('unicode', () => {
		expect(unicode('\u{00E0}')).toBe(unicode('a\u{0300}')); // "a" with grave.
	});

	test('unaccented', () => {
		expect(unaccented('\u{00E0}')).toBe('a'); // "a" with grave.
	});

	test('combinedNormalizaion', () => {
		expect(combinedNormalization([trimmed, casefold])('  Fo  ')).toBe(casefold('Fo'));
	});
});
