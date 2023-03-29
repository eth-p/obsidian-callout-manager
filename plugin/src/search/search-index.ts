import { BitField, type BitPosition, BitPositionRegistry } from './bitfield';
import { type NormalizationFunction, NormalizedValue } from './normalize';

/**
 * An optimized search index.
 *
 * This serves to collect a finite, unique list of `m_1, m_2, ... m_k` normalized properties and bijectively associate
 * them to a specific bit in a bitmask. Matching against a specific property can then be done in `O(m_k)` time to
 * generate a bitmask where each `1` in the mask represents a successful match for the associated `(property, value)` tuple.
 * Under average circumstances where many tuples are common between `n` items, this will be significantly less expensive
 * than performing a search against each individual item in `O(n)` time.
 *
 * Further, performing matches against multiple criteria may be done by performing bitwise operations on the unique masks
 * created by the individual operations.
 *
 * All in all, this search index is designed to:
 *
 *  1. Require normalization of property values as up-front work to be done when building the index, thereby
 *     preventing redundant computations inside hot loops;
 *
 *  2. Promote the use of set operations (union, intersection, difference) without falling back to `O(n^k)` time
 *     (where `k` is the number of operations).
 */
export class SearchIndex<Columns extends string> implements ReadonlySearchIndex<Columns> {
	private readonly columns: Map<Columns, SearchIndexColumn>;
	private readonly registry: BitPositionRegistry;

	public constructor(columns: Record<Columns, ColumnDescription>) {
		this.columns = new Map();
		this.registry = new BitPositionRegistry();

		for (const [col, description] of Object.entries<ColumnDescription>(columns)) {
			this.columns.set(col as Columns, new SearchIndexColumn(this.registry, description));
		}
	}

	public get bitfield(): BitField {
		return this.registry.field;
	}

	public get size(): number {
		return this.registry.size;
	}

	public column(name: Columns): SearchIndexColumn {
		const col = this.columns.get(name);
		if (col === undefined) throw new NoSuchColumnError(name);
		return col;
	}
}

/**
 * An immutable {@link SearchIndex}.
 */
export interface ReadonlySearchIndex<Columns extends string> {
	/**
	 * A bitfield for all possible indices.
	 */
	get bitfield(): BitField;

	/**
	 * The number of indices in all columns.
	 */
	get size(): number;

	/**
	 * Gets a column from the index.
	 *
	 * @param name The column name.
	 * @throws {NoSuchColumnError} If the column does not exist.
	 */
	column(name: Columns): ReadonlySearchIndexColumn;
}

export class NoSuchColumnError extends Error {
	constructor(column: string) {
		super(`No such column in index: ${column}`);
	}
}

/**
 * Options for creating an {@link SearchIndexColumn}.
 */
export interface ColumnDescription {
	normalize?: NormalizationFunction;
}

/**
 * An indexed property (i.e. a column).
 * This stores a bijective (perfect one-to-one) mapping between property values and their associated bit mask.
 *
 * @internal
 */
export class SearchIndexColumn {
	private readonly bitReg: BitPositionRegistry;
	protected readonly entries: Map<NormalizedValue, BitPosition>;

	public constructor(registry: BitPositionRegistry, options?: ColumnDescription) {
		this.entries = new Map();
		this.bitReg = registry;
		this.normalize = (options?.normalize ?? ((n) => n)) as (value: string) => NormalizedValue;
	}

	/**
	 * Using the normalization rules for this indexed property, surjectively normalize the provided string.
	 *
	 * @param value The input string.
	 * @return The normalized version of the input string.
	 */
	public readonly normalize: (value: string) => NormalizedValue;

	/**
	 * Adds a value to the column.
	 *
	 * @param value The value to add.
	 * @returns The associated bit position of the value.
	 */
	public add(value: string): BitPosition {
		const { entries } = this;
		const normalized = this.normalize(value);

		// If we already have this value, reuse it.
		const existingBit = entries.get(normalized);
		if (existingBit !== undefined) return existingBit;

		// If we don't, we need to make it.
		const newBit = this.bitReg.claim();
		entries.set(normalized, newBit);
		return newBit;
	}

	/**
	 * Removes a value from the column.
	 * @param value The value to remove.
	 */
	public delete(value: string): void {
		const { entries } = this;
		const normalized = this.normalize(value);

		// Get the position.
		const existingBit = entries.get(normalized);
		if (existingBit === undefined) return;

		// Remove it.
		this.bitReg.relinquish(existingBit);
		entries.delete(normalized);
	}

	/**
	 * Gets a value from the column.
	 *
	 * @param value The value to get.
	 * @returns The associated bit position, or undefined if it is not in the column.
	 */
	public get(value: string): BitPosition | undefined {
		return this.entries.get(this.normalize(value));
	}

	/**
	 * The number of indices in this column.
	 */
	public get size(): number {
		return this.entries.size;
	}

	public [Symbol.iterator](): Iterator<[NormalizedValue, BitPosition]> {
		return this.entries.entries();
	}
}

/**
 * A read-only {@link SearchIndexColumn}.
 */
export type ReadonlySearchIndexColumn = Pick<
	Readonly<SearchIndexColumn>,
	'get' | 'normalize' | 'size' | (typeof Symbol)['iterator']
>;
