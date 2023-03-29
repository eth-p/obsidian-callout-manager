import { describe, expect, test } from '@jest/globals';

import {Callout} from "./index";
import { Precomputed, combinedComparison, compareColor, compareId } from './sort';

/**
 * Creates something for compareColor.
 */
function C(rgb: string): Precomputed<Callout, compareColor.T> {
	const callout = {
		id: '',
		color: rgb,
	};

	return {
		value: callout,
		computed: compareColor.precompute(callout),
	};
}

describe('compareColor', () => {
	test('shades', () => {
		expect(compareColor(C('255, 255, 255'), C('0, 0, 0'))).toBeGreaterThan(0);
		expect(compareColor(C('255, 255, 255'), C('127, 127, 127'))).toBeGreaterThan(0);
		expect(compareColor(C('255, 255, 255'), C('255, 255, 255'))).toBe(0);
	});

	test('shades and colors', () => {
		expect(compareColor(C('255, 0, 0'), C('255, 255, 255'))).toBeGreaterThan(0);
		expect(compareColor(C('255, 255, 254'), C('0, 0, 0'))).toBeGreaterThan(0);
	});

	test('hues', () => {
		expect(compareColor(C('168, 50, 50'), C('70, 168, 50'))).toBeLessThan(0);
		expect(compareColor(C('50, 54, 168'), C('70, 168, 50'))).toBeGreaterThan(0);
		expect(compareColor(C('255, 0, 0'), C('255, 0, 0'))).toBe(0);
	});

	test('equal hues', () => {
		expect(compareColor(C('0, 49, 255'), C('82, 116, 255'))).toBeGreaterThan(0); // higher saturation > lower saturation
		expect(compareColor(C('0, 49, 255'), C('1, 30, 145'))).toBeGreaterThan(0); // higher value > lower value
		expect(compareColor(C('7, 48, 232'), C('45, 68, 173'))).toBeGreaterThan(0); // higher both > lower both
	});

	test('validity', () => {
		expect(compareColor(C('255, 255, 255'), C('invalid'))).toBeGreaterThan(0);
		expect(compareColor(C('invalid'), C('127, 0, 0'))).toBeLessThan(0);
	});
});

/**
 * Creates something for compareId.
 */
function I(id: string): Precomputed<Callout, Record<string, never>> {
	const callout = {
		id,
		color: '',
	};

	return {
		value: callout,
		computed: {},
	};
}

describe('compareId', () => {
	test('basic', () => {
		expect(compareId(I('a'), I('b'))).toBeGreaterThan(0);
		expect(compareId(I('A'), I('B'))).toBeGreaterThan(0);
	});
});

describe('combinedComparison', () => {
	test('color then id', () => {
		const compare = combinedComparison([compareColor, compareId]);
		const P = (value) => ({ value, computed: compare.precompute(value) });

		expect(compare(P({ id: 'b', color: '255, 255, 255' }), P({ id: 'a', color: '0, 0, 0' }))).toBeGreaterThan(0);
		expect(compare(P({ id: 'b', color: '255, 255, 255' }), P({ id: 'a', color: '255, 255, 255' }))).toBeLessThan(0);
	});
});
