import Callout from '&callout';
import { getColorFromCallout } from '&callout-util';
import { HSV, toHSV } from '&color';

/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * An object containing a callout and some precomputed values.
 * Given that sorting is not O(1), it's important that we compute values we are sorting on ahead of time.
 */
export type Precomputed<T> = {
	callout: Callout;
	computed: T;
};

export type NoPrecomputed = Precomputed<{}>;

type Intersection<Ts> = (Ts extends any ? (k: Ts) => void : never) extends (k: infer I) => void ? I : never;
type ArrayValues<Ts extends ReadonlyArray<unknown>> = Ts[number];

export type Comparator<T> = ((a: Precomputed<T>, b: Precomputed<T>) => number) & { precompute?(callout: Callout): T };
type PrecomputedOf<F> = F extends Comparator<infer T> ? T : never;

type CombinedPrecomputedOf<Ts extends [...unknown[]]> = Intersection<
	ArrayValues<{
		readonly [Index in keyof Ts]: PrecomputedOf<Ts[Index]>;
	}>
>;

type CombinedComparator<Fs extends Array<Comparator<any>>> = Comparator<CombinedPrecomputedOf<Fs>> & {
	precompute(callout: Callout): CombinedPrecomputedOf<Fs>;
};

/**
 * Combines different sorting comparisons into a single comparison function where items are sorted on multiple criteria.
 *
 * @param fns The comparison functions.
 *
 * @returns A new comparison function that encompasses all the provided ones.
 */
export function combinedComparison<Fs extends Array<Comparator<any>>>(fns: Fs): CombinedComparator<Fs> {
	const compare: CombinedComparator<Fs> = (a, b) => {
		let delta = 0;
		for (const compare of fns) {
			delta = compare(a, b);
			if (delta !== 0) break;
		}
		return delta;
	};

	compare.precompute = (callout) => {
		const obj: Partial<CombinedPrecomputedOf<Fs>> = {};
		for (const fn of fns) {
			if ('precompute' in fn) {
				Object.assign(obj, (fn.precompute as (callout: Callout) => CombinedPrecomputedOf<Fs>)(callout));
			}
		}
		return obj as CombinedPrecomputedOf<Fs>;
	};

	return compare;
}

/**
 * Sort by color.
 */
export function compareColor(
	{ computed: { colorValid: aValid, colorHSV: aHSV } }: Precomputed<compareColor.T>,
	{ computed: { colorValid: bValid, colorHSV: bHSV } }: Precomputed<compareColor.T>,
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
export function compareId({ callout: { id: aId } }: NoPrecomputed, { callout: { id: bId } }: NoPrecomputed) {
	return bId.localeCompare(aId);
}
