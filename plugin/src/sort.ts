/* eslint-disable @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any */
import Callout from '../plugin-api/callout';
import { getColorFromCallout } from '&callout-util';
import { HSV, toHSV } from '&color';

import { ArrayValues, Intersection } from './util/type-helpers';

/**
 * An object that associates some precomputed values to an object.
 * Given that sorting is not O(1), it's important that we compute values we are sorting on ahead of time.
 */
export type Precomputed<T, C> = {
	value: T;
	computed: C extends void ? {} : C;
};

/**
 * Extracts the computed data type out of a {@link Precomputed} object.
 */
export type PrecomputedValue<T, F> = F extends Comparator<T, infer C> ? C : never;

/**
 * A comparator function.
 *
 * This may contain a `precompute` property which will compute data necessary for the comparisons to work.
 */
export type Comparator<T, C> = ((a: Precomputed<T, C>, b: Precomputed<T, C>) => number) & { precompute?(value: T): C };

type CombinedPrecomputedOf<T, Ts extends [...unknown[]]> = Intersection<
	ArrayValues<{
		readonly [Index in keyof Ts]: PrecomputedValue<T, Ts[Index]>;
	}>
>;

type CombinedComparator<T, Fs extends Array<Comparator<T, any>>> = Comparator<T, CombinedPrecomputedOf<T, Fs>> & {
	precompute(value: T): CombinedPrecomputedOf<T, Fs>;
};

/**
 * Combines different sorting comparisons into a single comparison function where items are sorted on multiple criteria.
 *
 * @param fns The comparison functions.
 *
 * @returns A new comparison function that encompasses all the provided ones.
 */
export function combinedComparison<T, Fs extends Array<Comparator<T, any>> = Array<Comparator<T, any>>>(fns: Fs): CombinedComparator<T, Fs> {
	const compare: CombinedComparator<T, Fs> = (a, b) => {
		let delta = 0;
		for (const compare of fns) {
			delta = compare(a, b);
			if (delta !== 0) break;
		}
		return delta;
	};

	compare.precompute = (value) => {
		const obj: Partial<CombinedPrecomputedOf<T, Fs>> = {};
		for (const fn of fns) {
			if ('precompute' in fn) {
				Object.assign(obj, (fn.precompute as (value: T) => CombinedPrecomputedOf<T, Fs>)(value));
			}
		}
		return obj as CombinedPrecomputedOf<T, Fs>;
	};

	return compare;
}

/**
 * Sort by color.
 */
export function compareColor(
	{ computed: { colorValid: aValid, colorHSV: aHSV } }: Precomputed<Callout, compareColor.T>,
	{ computed: { colorValid: bValid, colorHSV: bHSV } }: Precomputed<Callout, compareColor.T>,
): number {
	const validityDelta = (aValid ? 1 : 0) - (bValid ? 1 : 0);
	if (validityDelta !== 0) return validityDelta;

	// Next: colors before shades.
	const saturatedDelta = (aHSV.s > 0 ? 1 : 0) - (bHSV.s > 0 ? 1 : 0);
	if (saturatedDelta !== 0) return saturatedDelta;

	// Next: hue.
	const hueDelta = aHSV.h - bHSV.h;
	if (Math.abs(hueDelta) > 2) return hueDelta;

	// Next: saturation + value;
	const svDelta = aHSV.s + aHSV.v - (bHSV.s + bHSV.v);
	if (svDelta !== 0) return svDelta;

	return 0;
}

export namespace compareColor {
	export type T = { colorValid: boolean; colorHSV: HSV };
	export function precompute(v: Callout): T {
		const color = getColorFromCallout(v);
		return {
			colorValid: color != null,
			colorHSV: color == null ? { h: 0, s: 0, v: 0 } : toHSV(color),
		};
	}
}

/**
 * Sort by ID.
 */
export function compareId(
	{ value: { id: aId } }: Precomputed<Callout, void>,
	{ value: { id: bId } }: Precomputed<Callout, void>,
) {
	return bId.localeCompare(aId);
}
