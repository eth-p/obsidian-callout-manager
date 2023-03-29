/* eslint-disable @typescript-eslint/no-explicit-any */
import { AnyObject, EmptyObject } from './type-utils';

/**
 * An object that is prepared for sorting.
 *
 * @template T The object type that is being sorted.
 * @template Cache Pre-computed values used in comparisons.
 */
export type Prepared<T, Cache extends unknown | void | AnyObject = void> = Cache extends void
	? { readonly value: T }
	: {
			readonly value: T;
			readonly computed: Readonly<Cache>;
	  };

type SortedTypeInPrepared<P extends Prepared<any, any>> = P extends Prepared<infer T, any> ? T : never;
type SortedTypeInComparator<P extends Comparator<any, any>> = P extends Comparator<infer T, any> ? T : never;

// prettier-ignore
type CachedTypeInPrepared<P extends Prepared<any, any>> = P extends Prepared<any, infer T>
	?  (T extends void ? EmptyObject : (T extends AnyObject ? T : EmptyObject))
	: never;

// prettier-ignore
type CachedTypeInComparator<P extends Comparator<any, any>> = P extends Comparator<any, infer T>
	?  (T extends void ? EmptyObject : (T extends AnyObject ? T : EmptyObject))
	: never;

// prettier-ignore
type ComparatorOrPrepared<T, Cache extends unknown | void | AnyObject> =
	| Prepared<T, Cache>
	| Comparator<T, Cache>;

/**
 * Extracts the type of object being sorted from a {@link Prepared} type.
 *
 * @template P The {@link Prepared} type.
 * @returns The type of object being sorted.
 */
// prettier-ignore
export type SortedType<P extends ComparatorOrPrepared<any, any>> =
	P extends Prepared<any, any> ? SortedTypeInPrepared<P> :
	P extends Comparator<any, any> ? SortedTypeInComparator<P> :
	never;

/**
 * Extracts the cached values from a {@link Prepared} type.
 *
 * @template P The {@link Prepared} type.
 * @returns The caches being used.
 */
// prettier-ignore
export type CachedType<P extends ComparatorOrPrepared<any, any>> =
	P extends Prepared<any, any> ? CachedTypeInPrepared<P> :
	P extends Comparator<any, any> ? CachedTypeInComparator<P> :
	never;

/**
 * A comparator function that needs to operate on pre-computed data.
 *
 * This compares {@link Prepared} objects.
 *
 * @template T The object type that is being sorted.
 * @template Cache Pre-computed values used in comparisons.
 */
export interface ComparatorWithCache<T, Cache extends AnyObject> {
	(this: void, a: Prepared<T, Cache>, b: Prepared<T, Cache>): number;

	/**
	 * Computes a cache for some sortable property of the item.
	 *
	 * @param item The item.
	 * @returns The cache for the item.
	 */
	compute(item: T): Cache;
}

/**
 * A comparator function that can compare objects without cache.
 * This compares {@link Prepared} objects.
 *
 * @template T The object type that is being sorted.
 */
export interface ComparatorWithoutCache<T> {
	(this: void, a: Prepared<T, void>, b: Prepared<T, void>): number;
}

/**
 * A comparator function.
 * This compares {@link Prepared} objects.
 *
 * @template T The object type that is being sorted.
 */
// prettier-ignore
export type Comparator<T, Cache extends AnyObject | void | unknown = void> =
	Cache extends AnyObject ? ComparatorWithCache<T, Cache> : ComparatorWithoutCache<T>;
