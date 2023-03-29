import { describe, expect, test } from '@jest/globals';

import { BitField } from './bitfield';
import { equals, includes, startsWith } from './condition';
import { add, filter, remove } from './effect';
import { Search, SearchOptions } from './search';

function createSearch(items: string[], options?: SearchOptions<string>): Search<string, 'test'> {
	const search = new Search<string, 'test'>({
		...(options ?? {}),
		columns: {
			test: {},
		},
		indexItem(item, index) {
			return BitField.fromPosition(index.column('test').add(item));
		},
	});

	search.addItems(items);
	search.reset();
	return search;
}

describe('Search', () => {
	test('resetToAll', () => {
		const s = createSearch(['foo'], { resetToAll: true, resultRanking: false });
		expect(s.results).toStrictEqual(['foo']);
	});

	test('works', () => {
		const s = createSearch(['foo', 'bar', 'baz'], { resetToAll: true, resultRanking: false });

		s.reset();
		s.search('test', startsWith, 'ba', filter);
		expect(s.results.slice(0).sort()).toStrictEqual(['bar', 'baz'].sort());
	});

	test('combinations work', () => {
		const s = createSearch(['foo', 'bar', 'baz'], { resetToAll: true, resultRanking: false });

		s.reset();
		s.search('test', startsWith, 'ba', filter);
		s.search('test', includes, 'ar', filter);
		s.search('test', equals, 'foo', add);
		expect(s.results.slice(0).sort()).toStrictEqual(['foo', 'bar'].sort());

		s.reset();
		s.search('test', startsWith, 'ba', filter);
		s.search('test', equals, 'bar', remove);
		expect(s.results.slice(0).sort()).toStrictEqual(['baz'].sort());
	});

	test('ranking works', () => {
		const s = createSearch(['doge', 'dog'], { resetToAll: true, resultRanking: true });

		s.reset();
		s.search('test', startsWith, 'dog', filter);
		expect(s.results).toStrictEqual(['dog', 'doge']);
	});
});
