/**
 * Converts a type union to a type intersection.
 */
export type Intersection<Ts> = (Ts extends any ? (k: Ts) => void : never) extends (k: infer I) => void ? I : never;

/**
 * Extracts values out of an array.
 */
export type ArrayValues<Ts extends ReadonlyArray<unknown>> = Ts[number];
