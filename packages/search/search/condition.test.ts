import { describe, expect, test } from '@jest/globals';

import { BitField, BitPosition, BitPositionRegistry } from './bitfield';
import { SearchCondition, equals as _equals, includes as _includes, startsWith as _startsWith } from './condition';
import { SearchIndexColumn } from './search-index';

function createColumn<T extends Array<string>>(
	...values: T
): SearchIndexColumn & { scoreBuffer: Float32Array; fieldWhere(...values: Array<T[keyof T]>): BitField } {
	const reg = new BitPositionRegistry();
	const col = new SearchIndexColumn(reg);
	values.forEach(col.add.bind(col));

	return Object.assign(col, {
		scoreBuffer: new Float32Array(col.size),
		fieldWhere(...values: Array<T[keyof T]>): BitField {
			return values
				.map((v) => col.normalize(v as string))
				.map((n) => col.get(n) as BitPosition)
				.map((p) => BitField.fromPosition(p))
				.reduce(BitField.or, 0n as BitField);
		},
	});
}

/**
 * Wraps a condition so we can check what values are matched from it.
 */
function wrapCondition(col: ReturnType<typeof createColumn>, cond: SearchCondition): (text: string) => BitField {
	return (v: string) => cond(col, col.normalize(v), col.scoreBuffer);
}

/**
 * Wraps a condition so we can check the score delta between two values.
 */
function wrapConditionForScoreDelta<T extends Array<string>, Column extends ReturnType<typeof createColumn<T>>>(
	col: Column,
	cond: SearchCondition,
): (v: T[keyof T]) => (a: string, b: string) => number {
	return (v: T[keyof T]) => {
		const valuePosition = col.get(col.normalize(v as string)) as number;
		return (a: string, b: string) => {
			const aScore = col.scoreBuffer.map(() => 0);
			const bScore = aScore.slice();

			cond(col, col.normalize(a), aScore);
			cond(col, col.normalize(b), bScore);

			return aScore[valuePosition] - bScore[valuePosition];
		};
	};
}

describe('includes', () => {
	test('should', () => {
		const col = createColumn('foo', 'bar', 'baz');
		const includes = wrapCondition(col, _includes);

		expect(includes('ba')).toBe(col.fieldWhere('bar', 'baz'));
		expect(includes('z')).toBe(col.fieldWhere('baz'));
		expect(includes('')).toBe(col.fieldWhere('foo', 'bar', 'baz'));
	});

	test('should not', () => {
		const col = createColumn('foo', 'bar', 'baz');
		const includes = wrapCondition(col, _includes);

		expect(includes('d')).toBe(col.fieldWhere());
		expect(includes('fooz')).toBe(col.fieldWhere());
	});

	test('scores', () => {
		const col = createColumn('foo', 'bar', 'baz');
		const includes = wrapConditionForScoreDelta(col, _includes);

		expect(includes('bar')("ba", "r")).toBeGreaterThan(0);
		expect(includes('bar')("ba", "ba")).toBe(0);
		expect(includes('bar')("b", "ba")).toBeLessThan(0);
	});
});

describe('equals', () => {
	test('should', () => {
		const col = createColumn('foo', 'bar', 'baz');
		const equals = wrapCondition(col, _equals);

		expect(equals('foo')).toBe(col.fieldWhere('foo'));
		expect(equals('food')).toBe(col.fieldWhere());
	});

	test('should not', () => {
		const col = createColumn('foo', 'bar', 'baz');
		const equals = wrapCondition(col, _equals);

		expect(equals('d')).toBe(col.fieldWhere());
		expect(equals('fooz')).toBe(col.fieldWhere());
	});

	test('scores', () => {
		const col = createColumn('foo', 'bar', 'baz');
		const equals = wrapConditionForScoreDelta(col, _equals);

		expect(equals('bar')("bar", "ba")).toBeGreaterThan(0);
		expect(equals('bar')("bar", "bart")).toBe(1);
		expect(equals('bar')("xxx", "yyy")).toBe(0);
	});
});

describe('startsWith', () => {
	test('should', () => {
		const col = createColumn('foo', 'far', 'bar', 'baz');
		const startsWith = wrapCondition(col, _startsWith);

		expect(startsWith('f')).toBe(col.fieldWhere('foo', 'far'));
		expect(startsWith('fo')).toBe(col.fieldWhere('foo'));
		expect(startsWith('')).toBe(col.fieldWhere('foo', 'far', 'bar', 'baz'));
	});

	test('should not', () => {
		const col = createColumn('foo', 'bar', 'baz');
		const startsWith = wrapCondition(col, _startsWith);

		expect(startsWith('a')).toBe(col.fieldWhere());
		expect(startsWith('bax')).toBe(col.fieldWhere());
	});

	test('scores', () => {
		const col = createColumn('foo', 'bar', 'baz');
		const startsWith = wrapConditionForScoreDelta(col, _startsWith);

		expect(startsWith('bar')("b", "ba")).toBeLessThan(0);
		expect(startsWith('bar')("ba", "bar")).toBeLessThan(0);
		expect(startsWith('bar')("bar", "b")).toBeGreaterThan(0);
		expect(startsWith('bar')("bar", "")).toBe(1);
		expect(startsWith('bar')("z", "yyy")).toBe(0);
	});
});
