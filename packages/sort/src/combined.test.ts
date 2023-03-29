import { describe, expect, test } from '@jest/globals';

import { combined } from './combined';
import { ComparatorWithCache, SortedType } from './types';
import { createComparator } from './util';

const compareString = createComparator((a: string, b: string) => a.localeCompare(b));

const compareStringFromSecond = createComparator((a: string, b: string) =>
	a.substring(1).localeCompare(b.substring(1)),
);

const compareStringByLeadingNumbers = createComparator(
	({ computed: { leading: a } }, { computed: { leading: b } }) => a - b,
	(item: string) => ({ leading: parseInt(/^([0-9]+)/.exec(item)?.[1] ?? '0') }),
);

const compareStringByTrailingNumbers = createComparator(
	({ computed: { trailing: a } }, { computed: { trailing: b } }) => (a as number) - (b as number),
	(item: string) => ({ trailing: parseInt(/([0-9]+)$/.exec(item)?.[1] ?? '0') }),
);

describe('sanity check for test functions', () => {
	test('compareString', () => {
		expect(compareString({ value: 'a' }, { value: 'b' })).toBeLessThan(0);
		expect(compareString({ value: 'a' }, { value: 'a' })).toBe(0);
	});

	test('compareStringFromSecond', () => {
		expect(compareStringFromSecond({ value: 'ad' }, { value: 'ab' })).toBeGreaterThan(0);
	});

	test('compareStringByLeadingNumbers', () => {
		expect(
			compareStringByLeadingNumbers(
				{ value: 'c', computed: { leading: 0 } },
				{ value: 'b', computed: { leading: 2 } },
			),
		).toBeLessThan(0);

		expect(compareStringByLeadingNumbers.compute('abc')).toStrictEqual({ leading: 0 });
		expect(compareStringByLeadingNumbers.compute('2bc')).toStrictEqual({ leading: 2 });
	});

	test('compareStringByTrailingNumbers', () => {
		expect(
			compareStringByTrailingNumbers(
				{ value: 'c', computed: { trailing: 0 } },
				{ value: 'b', computed: { trailing: 2 } },
			),
		).toBeLessThan(0);

		expect(compareStringByTrailingNumbers.compute('abc')).toStrictEqual({ trailing: 0 });
		expect(compareStringByTrailingNumbers.compute('ab2')).toStrictEqual({ trailing: 2 });
	});
});

describe('combine', () => {
	test('no cache, order', () => {
		const cmp = combined([compareStringFromSecond, compareString]);

		expect(cmp({ value: 'axe' }, { value: 'cat' })).toBeGreaterThan(0); // compareFromSecond is different
		expect(cmp({ value: 'cat' }, { value: 'hat' })).toBeLessThan(0); // compareString is different
		expect(cmp({ value: 'cat' }, { value: 'cat' })).toBe(0); // both same
	});

	test('no cache, compute', () => {
		const cmp = combined([compareStringFromSecond, compareString]) as unknown as ComparatorWithCache<
			string,
			Record<string, never>
		>;

		expect(cmp.compute('foo')).toStrictEqual({});
	});

	test('with cache, order', () => {
		const cmp = combined([compareStringByLeadingNumbers, compareStringByTrailingNumbers]);
		const P = (v: SortedType<typeof cmp>) => ({value: v, computed: cmp.compute(v)});

		expect(cmp(P('1b3'), P('0b9'))).toBeGreaterThan(0); // compareStringByLeadingNumbers is different
		expect(cmp(P('1b0'), P('1b9'))).toBeLessThan(0); // compareStringByTrailingNumbers is different
		expect(cmp(P('1a1'), P('1x1'))).toBe(0); // both same
	});

	test('with cache, compute', () => {
		const cmp = combined([compareStringByLeadingNumbers, compareStringByTrailingNumbers]);
		expect(cmp.compute('12-34')).toStrictEqual({ leading: 12, trailing: 34 });
	});


	test('mixed cache, order', () => {
		const cmp = combined([compareStringByTrailingNumbers, compareString]);
		const P = (v: SortedType<typeof cmp>) => ({value: v, computed: cmp.compute(v)});

		expect(cmp(P('1b10'), P('0b9'))).toBeGreaterThan(0); // compareStringByLeadingNumbers is different
		expect(cmp(P('abc0'), P('abc00'))).toBeLessThan(0); // compareString is different
		expect(cmp(P('abc'), P('abc'))).toBe(0); // both same
	});

	test('mixed cache, compute', () => {
		const cmp = combined([compareStringByTrailingNumbers, compareString]);
		expect(cmp.compute('abc3')).toStrictEqual({ trailing: 3 });
	});

});
