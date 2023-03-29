import { describe, expect, jest, test } from '@jest/globals';
import { Spied } from 'jest-mock';

import { BitPositionRegistry } from './bitfield';
import { ColumnDescription, SearchIndexColumn } from './search-index';

/**
 * Creates a new column for testing.
 *
 * @param opts The column options.
 * @returns The column, an associated registry, and some spied functions.
 */
function newColumn(
	opts?: ColumnDescription,
	setup?: (col: SearchIndexColumn) => void,
): [
	SearchIndexColumn,
	{
		reg: BitPositionRegistry;
		_claim: Spied<BitPositionRegistry['claim']>;
		_relinquish: Spied<BitPositionRegistry['relinquish']>;
	},
] {
	const reg = new BitPositionRegistry();
	const col = new SearchIndexColumn(reg, opts);

	setup?.(col);

	const _claim = jest.spyOn(reg, 'claim');
	const _relinquish = jest.spyOn(reg, 'relinquish');
	return [col, { reg, _claim, _relinquish }];
}

describe('SearchIndexColumn', () => {
	test('add', () => {
		const [col, { _claim, _relinquish }] = newColumn();

		// Initial assumptions.
		expect(col.size).toBe(0); // Empty
		expect(Array.from(col)).toHaveLength(0); // Empty

		// We add a unique entry.
		col.add('abc');
		expect(col.size).toBe(1);
		expect(Array.from(col)).toStrictEqual([['abc', 0]]);
		expect(_claim).toBeCalledTimes(1);
		expect(col.get('abc')).not.toBeUndefined();

		// We add another unique entry.
		col.add('def');
		expect(col.size).toBe(2);
		expect(col.get('def')).not.toBeUndefined();
		expect(_claim).toBeCalledTimes(2);
		expect(Array.from(col)).toStrictEqual([
			['abc', 0],
			['def', 1],
		]);

		// We add a duplicate entry.
		// This should *not* claim anything.
		col.add('abc');
		expect(col.size).toBe(2);
		expect(col.get('abc')).not.toBeUndefined();
		expect(_claim).toBeCalledTimes(2);
		expect(Array.from(col)).toStrictEqual([
			['abc', 0],
			['def', 1],
		]);

		// Final assertions.
		expect(_relinquish).not.toBeCalled();
	});

	test('delete', () => {
		const [col, { _claim, _relinquish }] = newColumn(undefined, (col) => {
			col.add('abc');
			col.add('def');
			col.add('ghi');
		});

		// Initial assumptions.
		const initSize = col.size;
		const initValues = Array.from(col);
		expect(Array.from(col)).toHaveLength(initSize);
		expect(_claim).not.toBeCalled();
		expect(_relinquish).not.toBeCalled();

		// Remove an entry that does not exist.
		//  -> nothing changes.
		col.delete('no-exist');
		expect(col.size).toBe(initSize);
		expect(Array.from(col)).toStrictEqual(initValues);
		expect(_claim).not.toBeCalled();
		expect(_relinquish).not.toBeCalled();

		// Remove an entry that does exist.
		//  -> relinquishes bit, removes it from the list.
		col.delete(initValues[0][0]);
		expect(col.size).toBe(initSize - 1);
		expect(Array.from(col)).not.toContain(initValues[0]);
		expect(col.get(initValues[0][0])).toBeUndefined();
		expect(_claim).not.toBeCalled();
		expect(_relinquish).toBeCalledTimes(1);
	});

	test('normalize', () => {
		const [col] = newColumn({
			normalize: (a) => a.toLowerCase(),
		});

		// Initial assumptions.
		expect(col.size).toBe(0); // Empty
		expect(Array.from(col)).toHaveLength(0); // Empty

		// Check that normalization works.
		expect(col.normalize("Abc")).toBe("abc");

		// Check that the normalization function is used for adding.
		const _normalize = jest.spyOn(col, 'normalize');

		col.add("Abc");
		expect(_normalize).toBeCalledTimes(1);
		expect(col.size).toBe(1);

		col.add("ABC");
		expect(_normalize).toBeCalledTimes(2);
		expect(col.size).toBe(1);

		// Check that the normalization function is used for getting.
		expect(col.get("AbC")).not.toBeUndefined();
		expect(_normalize).toBeCalledTimes(3);

		// Check that the normalization function is used for deleting.
		col.delete("abC")
		expect(_normalize).toBeCalledTimes(4);
		expect(col.size).toBe(0);
	});
});
