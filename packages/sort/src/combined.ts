/* eslint-disable @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any */
import { AnyObject, MergedObject } from './type-utils';
import { CachedType, Comparator, ComparatorWithCache, ComparatorWithoutCache, Prepared } from './types';

/**
 * Gets the combined cache type of multiple comparators.
 *
 * @template T The object type that is being sorted.
 * @template Comparators The comparators that are being combined.
 */
type CombinedCacheOfComparators<T, Comparators extends Array<Comparator<T, any>>> = MergedObject<{
	[Index in keyof Comparators]: CachedType<Comparators[Index]>;
}>;

/**
 * Gets the sorted object type of multiple comparators.
 * If the comparators share a different type, this will return never.
 *
 * @template Comparators The comparators that are being combined.
 */
type TypeOfComparators<Comparators extends Array<Comparator<any, any>>> = Comparators extends Array<
	Comparator<infer T, any>
>
	? T
	: never;

/**
 * A comparator created from the combination of other comparators.
 *
 * @template T The object type that is being sorted.
 * @template Comparators The comparators that are being combined.
 */
// prettier-ignore
export type CombinedComparator<T, Comparators extends Array<Comparator<T, any>>> =
	CombinedCacheOfComparators<T, Comparators> extends Record<any, never>
	? ComparatorWithoutCache<T>
	: (CombinedCacheOfComparators<T, Comparators> extends AnyObject
		? ComparatorWithCache<T, CombinedCacheOfComparators<T, Comparators>>
		: ComparatorWithoutCache<T>)

const CombinedComparators = Symbol('comparators');
const CombinedThis = Symbol('bound this');

interface CompareCombinedThis {
	[CombinedComparators]: Array<Comparator<unknown, unknown>>;
}

type CompareCombinedBound = ComparatorWithCache<unknown, any> & {
	[CombinedThis]: CompareCombinedThis;
};

/**
 * The function which executes each of the comparators inside a {@link combined} comparators.
 *
 * @param this A bound `this`-argument that holds the comparators.
 *
 * @param a The first object to compare.
 * @param b The second object to compare.
 *
 * @returns The comparison result.
 */
function compareCombined<T>(this: CompareCombinedThis, a: Prepared<T, AnyObject>, b: Prepared<T, AnyObject>): number {
	for (const compare of this[CombinedComparators]) {
		const delta = compare(a, b);
		if (delta !== 0) return delta;
	}

	return 0;
}

/**
 * The function which computes the cache for a {@link combined} comparator.
 * This calls the `compute` function for each of comparators and merges the result.
 *
 * @param this A bound `this`-argument that holds the comparators.
 *
 * @param item The item to compute the cache for.
 *
 * @returns The cache.
 */
function computeCombined<T, Comparators extends Array<Comparator<T, any>>>(
	this: CompareCombinedThis,
	item: T,
): CachedType<CombinedComparator<T, Comparators>> {
	return Object.assign(
		{},
		...(this[CombinedComparators] as Array<Partial<ComparatorWithCache<T, any>>>).map(
			(compare) => compare.compute?.(item) ?? {},
		),
	);
}

/**
 * Combines different comparators into a single comparator which compares based on the priority of multiple different
 * criterions.
 *
 * @param comparators The comparators.
 * @returns A new comparison function that encompasses all the provided ones.
 *
 * @template T The object type that is being sorted.
 * @template Comparators The comparators that are being combined.
 */
export function combined<Comparators extends Array<Comparator<any, any>>>(
	comparators: Comparators,
): CombinedComparator<TypeOfComparators<Comparators>, Comparators> {
	const thisComparators = comparators.flatMap(extractCombined) as Array<Comparator<unknown, unknown>>;
	const thisArg: CompareCombinedThis = {
		[CombinedComparators]: thisComparators,
	};

	const compareFn = compareCombined.bind(thisArg) as unknown as CompareCombinedBound;
	compareFn[CombinedThis] = thisArg;
	compareFn.compute = computeCombined.bind(thisArg);
	return compareFn as any;
}

/**
 * Tests if a {@link Comparator} is a combined comparator.
 *
 * @param comparator The comparator to test.
 * @returns True if combined.
 */
export function isCombined(comparator: Comparator<any, any>): boolean {
	return CombinedThis in comparator;
}

/**
 * Extracts the comparators used in a combined comparator.
 *
 * @param comparator The combined comparator.
 * @returns The comparators that were combined.
 */
function extractCombined<T>(comparator: Comparator<T, any>): Array<Comparator<T, unknown>> {
	if (!(CombinedThis in comparator)) return [comparator];

	const thisarg = comparator[CombinedThis] as CompareCombinedThis;
	return thisarg[CombinedComparators];
}
