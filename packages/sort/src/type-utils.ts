/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Any object.
 */
export type AnyObject = Record<PropertyKey, any>;

/**
 * An empty object.
 */
export type EmptyObject = {};

/**
 * Converts a type union to a type intersection.
 */
export type Intersection<Ts> = (Ts extends any ? (k: Ts) => void : never) extends (k: infer I) => void ? I : never;

/**
 * Extracts values out of an array.
 */
export type AnyArrayValues<Ts extends ReadonlyArray<any>> = Ts[number];

/**
 * Extracts values out of an array.
 */
export type AllArrayValues<Ts extends ReadonlyArray<any>> = Intersection<AnyArrayValues<Ts>>;

/**
 * An object consisting of all the properties from zero or more objects.
 */
export type MergedObject<Ts extends [...AnyObject[]]> = AllArrayValues<{
	[Index in keyof Ts]-?: Ts[Index];
}>;
