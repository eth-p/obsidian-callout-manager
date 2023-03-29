import { describe, expect, test } from '@jest/globals';

import {BitField, BitPosition, BitPositionRegistry} from "./bitfield";

describe('BitField', () => {
	test('fromPosition', () => {
		expect(BitField.fromPosition(0 as BitPosition)).toBe(1n);
		expect(BitField.fromPosition(1 as BitPosition)).toBe(2n);
		expect(BitField.fromPosition(8 as BitPosition)).toBe(256n);
	});

	test('fromPositionWithTrailing', () => {
		expect(BitField.fromPositionWithTrailing(-1 as BitPosition)).toBe(0b0n);
		expect(BitField.fromPositionWithTrailing(0 as BitPosition)).toBe(0b1n);
		expect(BitField.fromPositionWithTrailing(1 as BitPosition)).toBe(0b11n);
		expect(BitField.fromPositionWithTrailing(2 as BitPosition)).toBe(0b111n);
	});


	test('scanMostSignificant', () => {
		expect(BitField.scanMostSignificant(0b0n as BitField)).toBe(-1);
		expect(BitField.scanMostSignificant(0b1n as BitField)).toBe(0);
		expect(BitField.scanMostSignificant(0b10n as BitField)).toBe(1);
		expect(BitField.scanMostSignificant(0b101n as BitField)).toBe(2);
	});


	test('and', () => {
		expect(BitField.and(0n as BitField, 0n as BitField)).toBe(0n);
		expect(BitField.and(0n as BitField, 1n as BitField)).toBe(0n);
		expect(BitField.and(1n as BitField, 0n as BitField)).toBe(0n);
		expect(BitField.and(1n as BitField, 1n as BitField)).toBe(1n);
		expect(BitField.and(0b111n as BitField, 0b111n as BitField)).toBe(0b111n);
	});

	test('or', () => {
		expect(BitField.or(0n as BitField, 0n as BitField)).toBe(0n);
		expect(BitField.or(0n as BitField, 1n as BitField)).toBe(1n);
		expect(BitField.or(1n as BitField, 0n as BitField)).toBe(1n);
		expect(BitField.or(1n as BitField, 1n as BitField)).toBe(1n);
		expect(BitField.or(0b0110n as BitField, 0b1100n as BitField)).toBe(0b1110n);
	});

	test('not', () => {
		expect(BitField.not(0n as BitField, 0)).toBe(0n); // Special case.
		expect(BitField.not(0n as BitField, 1)).toBe(1n);
		expect(BitField.not(1n as BitField, 1)).toBe(0n);
		expect(BitField.not(0b10n as BitField, 2)).toBe(0b01n);
	});

	test('andNot', () => {
		expect(BitField.andNot(0n as BitField, 0n as BitField)).toBe(0n);
		expect(BitField.andNot(0n as BitField, 1n as BitField)).toBe(0n);
		expect(BitField.andNot(1n as BitField, 0n as BitField)).toBe(1n);
		expect(BitField.andNot(1n as BitField, 1n as BitField)).toBe(0n);
	});
});

describe('BitPositionRegistry', () => {
	test('claim', () => {
		const r = new BitPositionRegistry();
		expect(r.claim()).toBe(0);
		expect(r.claim()).toBe(1);
		expect(r.claim()).toBe(2);

		// 3 claimed.
		expect(r.size).toBe(3);
		expect(r.field).toBe(0b111n);
	});

	test('relinquish', () => {
		const r = new BitPositionRegistry();
		for (let i = 0; i < 10; i++) r.claim();

		r.relinquish(0 as BitPosition);
		expect(r.field).toBe(0b1111111110n);
		expect(r.claim()).toBe(0);
		expect(r.field).toBe(0b1111111111n);

		r.relinquish(2 as BitPosition);
		expect(r.field).toBe(0b1111111011n);
		expect(r.claim()).toBe(2);
		expect(r.field).toBe(0b1111111111n);

		expect(r.claim()).toBe(10);

		// 10 claimed -> 2 reclaimed -> 1 claimed = 11.
		expect(r.size).toBe(11);
	});
});
