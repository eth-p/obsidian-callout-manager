import { describe, expect, test } from '@jest/globals';

import { getCalloutsFromCSS } from './css-parser';

describe('getCalloutsFromCSS', () => {
	test('no quotes', () => {
		expect(getCalloutsFromCSS('[data-callout=foo]')).toStrictEqual(['foo']);
		expect(getCalloutsFromCSS('[data-callout=foo-bar-baz]')).toStrictEqual(['foo-bar-baz']);
	});

	test('single quotes', () => {
		expect(getCalloutsFromCSS('[data-callout=\'foo\']')).toStrictEqual(['foo']);
		expect(getCalloutsFromCSS('[data-callout=\'foo-bar-baz\']')).toStrictEqual(['foo-bar-baz']);
	});

	test('double quotes', () => {
		expect(getCalloutsFromCSS('[data-callout="foo"]')).toStrictEqual(['foo']);
		expect(getCalloutsFromCSS('[data-callout="foo-bar-baz"]')).toStrictEqual(['foo-bar-baz']);
	});

	test('allows matching start-of-attribute', () => {
		expect(getCalloutsFromCSS('[data-callout^=foo]')).toStrictEqual(['foo']);
	});

	test('ignores partial matches', () => {
		expect(getCalloutsFromCSS('[data-callout*=foo]')).toStrictEqual([]); // contains
		expect(getCalloutsFromCSS('[data-callout~=foo]')).toStrictEqual([]); // within space-delimited list
		expect(getCalloutsFromCSS('[data-callout|=foo]')).toStrictEqual([]); // within dash-delimited list
		expect(getCalloutsFromCSS('[data-callout$=foo]')).toStrictEqual([]); // ends-with
	});

	test('styles are complex', () => {
		expect(getCalloutsFromCSS('div.foo[data-callout=foo]{background-color: red !important}')).toStrictEqual(['foo']);
		expect(getCalloutsFromCSS('div:is([data-callout=foo])')).toStrictEqual(['foo']);
	});

	test('styles have multiple selectors', () => {
		expect(getCalloutsFromCSS('div.foo[data-callout=foo], [data-callout=bar]')).toStrictEqual(['foo', 'bar']);
	});

	test('styles have newline', () => {
		expect(getCalloutsFromCSS('[data-callout=foo]\n[data-callout=bar]')).toStrictEqual(['foo', 'bar']);
	});
});
