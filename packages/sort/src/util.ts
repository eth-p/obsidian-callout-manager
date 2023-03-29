/* eslint-disable @typescript-eslint/no-explicit-any */
import { AnyObject } from './type-utils';
import { ComparatorWithCache, ComparatorWithoutCache, Prepared } from './types';

/**
 * Creates a comparator from a comparison function.
 * @param compare The compare function.
 */
export function createComparator<T>(compare: (a: T, b: T) => number): ComparatorWithoutCache<T>;

/**
 * Creates a comparator from a comparison function and cache computation function.
 * @param compare The compare function.
 * @param compute The compute function.
 */
export function createComparator<T, Cache extends AnyObject>(
	compare: (a: Prepared<T, Cache>, b: Prepared<T, Cache>) => number,
	compute: (item: T) => Cache,
): ComparatorWithCache<T, Cache>;

/**
 * @internal
 */
export function createComparator<T, Cache extends AnyObject | void = void>(
	compare: ((a: T, b: T) => number) | ((a: Prepared<T, Cache>, b: Prepared<T, Cache>) => number),
	compute?: (item: T) => Cache,
): unknown {
	if (compute != null) return Object.assign(compare, { compute });
	return ({ value: a }: Prepared<T>, { value: b }: Prepared<T>) => (compare as (a: T, b: T) => number)(a, b);
}
