/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, test } from '@jest/globals';

import { equals as condEquals, includes as condIncludes, matches as condMatches, startsWith } from './condition';
import { add as effectAdd, filter as effectFilter, remove as effectRemove } from './effect';
import {
	QueryOp,
	QueryParserContext,
	parseEscapeSequence,
	parseOperation,
	parseOperationCondition,
	parseOperationEffect,
	parseOperationField,
	parseQuery,
	parseText,
} from './query';

describe('QueryParserContext', () => {
	test('next', () => {
		const ctx = new QueryParserContext('foo bar baz');

		expect(ctx.take.next(1)).toBe('f');
		expect(ctx.take.next(3)).toBe('oo ');
		expect(ctx.take.next(3)).toBe('bar');
		expect(() => ctx.take.next(5)).toThrow();
	});

	test('maybeNext', () => {
		const ctx = new QueryParserContext('foo bar baz');

		expect(ctx.take.maybeNext(1)).toBe('f');
		expect(ctx.take.maybeNext(3)).toBe('oo ');
		expect(ctx.take.maybeNext(3)).toBe('bar');

		expect(() => ctx.take.maybeNext(5)).not.toThrow();
	});

	test('prefix', () => {
		const ctx = new QueryParserContext('foo bar baz');

		expect(ctx.take.prefix('foo')).toBe(true);
		expect(ctx.take.prefix('cat')).toBe(false);
		expect(ctx.take.prefix(' bar')).toBe(true);

		// Should not throw if the prefix goes past the end.
		expect(() => ctx.take.prefix('this quick brown fox')).not.toThrow();
		expect(ctx.done).toBe(false);
	});

	test('trim', () => {
		const ctx = new QueryParserContext('foo bar baz');

		expect(ctx.take.trim()).toBe('');
		expect(ctx.take.next(3)).toBe('foo');
		expect(ctx.take.trim()).toBe(' ');

		// Should not be done, so we take the rest to assert that trim won't throw at the end.
		expect(ctx.done).toBe(false);
		expect(ctx.take.remaining()).toBe('bar baz');
		expect(() => ctx.take.trim()).not.toThrow();
	});

	test('remaining', () => {
		const ctx = new QueryParserContext('foo bar baz');

		expect(ctx.take.next(3)).toBe('foo');
		expect(ctx.done).toBe(false);
		expect(ctx.take.remaining()).toBe(' bar baz');
		expect(ctx.done).toBe(true);
		expect(ctx.take.remaining()).toBe('');
		expect(ctx.done).toBe(true);
	});

	test('findFirstRegex', () => {
		let ctx = new QueryParserContext('foo bar baz');
		expect(ctx.take.findFirstRegex(/bar/y)[0]).toBeNull();
		expect(ctx.take.findFirstRegex(/foo/y)[0]).not.toBeNull();

		// Check return values.
		ctx = new QueryParserContext('foo bar baz');
		expect(ctx.take.findFirstRegex(/o b/g)[0]![0]).toBe('o b');
		const instance = /ar/g;
		expect(ctx.take.findFirstRegex(instance)[1]).toBe(instance);

		// Check with global regex.
		ctx = new QueryParserContext('foo bar baz');
		expect(ctx.take.findFirstRegex(/cat/g)[0]).toBeNull();
		expect(ctx.take.findFirstRegex(/bar/g)[0]).not.toBeNull();
		expect(ctx.peek.remaining()).toBe(' baz');

		// Check with many regexes.
		ctx = new QueryParserContext('foo bar baz');
		expect(ctx.take.findFirstRegex(/bar/g, /baz/g)[0]![0]).toBe('bar');
	});

	test('findLongestRegex', () => {
		let ctx = new QueryParserContext('foo bar baz');
		expect(ctx.take.findLongestRegex(/bar/y)[0]).toBeNull();
		expect(ctx.take.findLongestRegex(/foo/y)[0]).not.toBeNull();

		// Check return values.
		ctx = new QueryParserContext('foo bar baz');
		expect(ctx.take.findLongestRegex(/o b/g)[0]![0]).toBe('o b');
		const instance = /ar/g;
		expect(ctx.take.findLongestRegex(instance)[1]).toBe(instance);

		// Check with global regex.
		ctx = new QueryParserContext('foo bar baz');
		expect(ctx.take.findLongestRegex(/cat/g)[0]).toBeNull();
		expect(ctx.take.findLongestRegex(/bar/g)[0]).not.toBeNull();
		expect(ctx.peek.remaining()).toBe(' baz');

		// Check with many regexes.
		ctx = new QueryParserContext('foo bar baz');
		expect(ctx.take.findLongestRegex(/bar/g, /foo b/g)[0]![0]).toBe('foo b');
	});

	test('peek', () => {
		const ctx = new QueryParserContext('foo bar baz');

		expect(ctx.peek.next(3)).toBe('foo');
		expect(ctx.peek.remaining()).toBe('foo bar baz');
	});
});

describe('QueryParser', () => {
	const C = (text: string) => new QueryParserContext(text);

	test('parseEscapeSequence', () => {
		expect(() => parseEscapeSequence(C('not an escape'))).toThrow();
		expect(() => parseEscapeSequence(C('\\?'))).toThrow();
		expect(parseEscapeSequence(C('\\n'))).toBe('\n');
		expect(parseEscapeSequence(C('\\r'))).toBe('\r');
		expect(parseEscapeSequence(C('\\\\'))).toBe('\\');
		expect(parseEscapeSequence(C('\\"'))).toBe('"');
		expect(parseEscapeSequence(C("\\'"))).toBe("'");
		expect(parseEscapeSequence(C('\\ '))).toBe(' ');

		// By codepoint: hex
		expect(parseEscapeSequence(C('\\x1B'))).toBe('\x1B');
		expect(parseEscapeSequence(C('\\x1b'))).toBe('\x1b');
		expect(() => parseEscapeSequence(C('\\x1K'))).toThrow();
		expect(() => parseEscapeSequence(C('\\x1'))).toThrow();
		expect(() => parseEscapeSequence(C('\\x'))).toThrow();

		// By codepoint: Unicode
		expect(parseEscapeSequence(C('\\u1234'))).toBe('\u1234');
		expect(parseEscapeSequence(C('\\u{1234}'))).toBe('\u{1234}');
		expect(() => parseEscapeSequence(C('\\u123'))).toThrow();
		expect(() => parseEscapeSequence(C('\\u12'))).toThrow();
		expect(() => parseEscapeSequence(C('\\u1'))).toThrow();
		expect(() => parseEscapeSequence(C('\\u'))).toThrow();
		expect(() => parseEscapeSequence(C('\\u{}'))).toThrow();
		expect(() => parseEscapeSequence(C('\\u123K'))).toThrow();
		expect(() => parseEscapeSequence(C('\\u{K123}'))).toThrow();

		// Check it consumes only the escape.
		const ctx = C('\\n1234');
		parseEscapeSequence(ctx);
		expect(ctx.peek.remaining()).toBe('1234');
	});

	test('parseText', () => {
		expect(parseText(C('foo bar'))).toBe('foo');
		expect(parseText(C('foo'))).toBe('foo');
		expect(parseText(C(' bar'))).toBe('');
		expect(parseText(C('"foo bar"'))).toBe('foo bar');

		// Only spaces, quotes, and backslashes are metacharacters.
		expect(parseText(C('cat&dog'))).toBe('cat&dog');

		// Handles escape sequences.
		expect(parseText(C('foo\\ bar'))).toBe('foo bar');
		expect(parseText(C('foo\\"bar'))).toBe('foo"bar');

		// Invalid texts:
		expect(() => parseText(C('"foo'))).toThrow();
		expect(() => parseText(C('foo"'))).toThrow();

		// Check it consumes the text.
		const ctx = C('foo bar');
		parseText(ctx);
		expect(ctx.peek.remaining()).toBe(' bar');
	});

	test('parseOperationField', () => {
		// No condition.
		expect(parseOperationField(C('foobar'))).toBe('foobar');
		expect(parseOperationField(C('foo-bar'))).toBe('foo-bar');
		expect(parseOperationField(C('foo:bar'))).toBe('foo');
		expect(parseOperationField(C('=foobar'))).toBe('');

		// Check it consumes the text.
		const ctx = C('foo:bar');
		parseOperationField(ctx);
		expect(ctx.peek.remaining()).toBe(':bar');
	});

	test('parseOperationCondition', () => {
		// No condition.
		expect(parseOperationCondition(C(''))).toBe(null);
		{
			const ctx = C('foo');
			expect(parseOperationCondition(ctx)).toBe(null);
			expect(ctx.peek.remaining()).toBe('foo');
		}

		// Matches condition.
		expect(parseOperationCondition(C(':foo'))).toBe(condMatches);
		expect(parseOperationCondition(C('[matches]:foo'))).toBe(condMatches);

		// Equals condition.
		expect(parseOperationCondition(C('=foo'))).toBe(condEquals);
		expect(parseOperationCondition(C('[is]:foo'))).toBe(condEquals);
		expect(parseOperationCondition(C('[equals]:foo'))).toBe(condEquals);

		// Includes condition.
		expect(parseOperationCondition(C('%=foo'))).toBe(condIncludes);
		expect(parseOperationCondition(C('[includes]:foo'))).toBe(condIncludes);
		expect(parseOperationCondition(C('[contains]:foo'))).toBe(condIncludes);

		// Starts with condition.
		expect(parseOperationCondition(C('^=foo'))).toBe(startsWith);

		// Invalid.
		expect(() => parseOperationCondition(C('~='))).toThrow();
		expect(() => parseOperationCondition(C('=='))).toThrow();

		// Check it consumes the text.
		const ctx = C('[includes]:foo bar');
		parseOperationCondition(ctx);
		expect(ctx.peek.remaining()).toBe('foo bar');
	});

	test('parseOperationEffect', () => {
		// No effect.
		expect(parseOperationEffect(C(''))).toBeNull();
		{
			const ctx = C('foo');
			expect(parseOperationEffect(ctx)).toBe(null);
			expect(ctx.peek.remaining()).toBe('foo');
		}

		// Valid.
		expect(parseOperationEffect(C('+'))).toBe(effectAdd);
		expect(parseOperationEffect(C('-'))).toBe(effectRemove);
		expect(parseOperationEffect(C('&'))).toBe(effectFilter);

		// Check it consumes the text.
		const ctx = C('&foobar:baz');
		parseOperationEffect(ctx);
		expect(ctx.peek.remaining()).toBe('foobar:baz');
	});

	test('parseOperation', () => {
		// All fields.
		expect(parseOperation(C('-animal:dog'))).toStrictEqual({
			field: 'animal',
			text: 'dog',
			condition: condMatches,
			effect: effectRemove,
		} as QueryOp);

		// Without effect.
		expect(parseOperation(C('animal:dog'))).toStrictEqual({
			field: 'animal',
			text: 'dog',
			condition: condMatches,
			effect: null,
		} as QueryOp);

		// Without field.
		expect(parseOperation(C('+dog'))).toStrictEqual({
			field: null,
			text: 'dog',
			condition: null,
			effect: effectAdd,
		} as QueryOp);

		// Without text.
		expect(parseOperation(C('animal:'))).toStrictEqual({
			field: 'animal',
			text: null,
			condition: condMatches,
			effect: null,
		} as QueryOp);

		// All fields, complex.
		expect(parseOperation(C('-animal-scientific="\\"Canis lupus\\""'))).toStrictEqual({
			field: 'animal-scientific',
			text: '"Canis lupus"',
			condition: condEquals,
			effect: effectRemove,
		} as QueryOp);

		// Invalid.
		expect(() => parseOperation(C(''))).toThrow();
		expect(() => parseOperation(C('-'))).toThrow();
	});

	test('parseQuery', () => {
		expect(parseQuery('-animal:dog frog')).toStrictEqual([
			{
				field: 'animal',
				text: 'dog',
				condition: condMatches,
				effect: effectRemove,
			},
			{
				field: null,
				text: 'frog',
				condition: null,
				effect: null,
			},
		] as QueryOp[]);
	});
});
