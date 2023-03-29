/* eslint-disable @typescript-eslint/ban-types */
import { Comparator, Precomputed, combinedComparison } from '../sort';

import { BitField } from './bitfield';
import { type NormalizationFunction } from './normalize';
import { SealedSearch, Search, SearchOptions } from './search';
import { type ColumnDescription, SearchIndex } from './search-index';

// eslint-disable-next-line @typescript-eslint/ban-types
type NonStringValues = number | boolean | bigint | symbol | null | undefined | Function | void;
type RecordWhereKeys<T, KeyIs> = { [K in keyof T as K extends KeyIs ? K : never]: T[K] };
type RecordWhereValues<T, ValueIs> = { [K in keyof T as T[K] extends ValueIs ? K : never]: T[K] };
type RecordWhereValuesNot<T, ValueIsNot> = { [K in keyof T as T[K] extends ValueIsNot ? never : K]: T[K] };

/**
 * Filters an object to only return properties where both the key and the value are *only* a `string`.
 */
type StringRecord<T> = {
	[K in keyof RecordWhereValuesNot<RecordWhereValues<RecordWhereKeys<T, string>, string>, NonStringValues>]: T[K];
};

/**
 * A function that can get a property and return it as a string.
 */
type PropertyGetter<T> = (target: T) => string[];

/**
 * The name of a string property, or a function that can return a stringified property of `T`.
 */
export type StringPropertyOrGetter<T> = keyof StringRecord<T> | PropertyGetter<T>;

/**
 * Creates {@link Search} instances using the factory pattern.
 */
export class SearchFactory<T, Columns extends string | never = never, Extra extends object = {}> {
	private columns: Array<{ name: Columns; getter: PropertyGetter<T>; desc: ColumnDescription }> = [];

	private metadataGenerators: Array<(obj: T) => Partial<Extra>> = [];
	private sortFunctions: Array<Comparator<T, unknown>> = [];

	private items: ReadonlyArray<T>;
	private options: SearchOptions<T> = {};

	/**
	 * @param objects The objects to search through.
	 */
	public constructor(objects: ReadonlyArray<T>) {
		this.items = objects;
	}

	/**
	 * Adds a column that can be searched.
	 *
	 * @param name The column name.
	 * @param property The property name of the string property to index, or a getter function to return some string.
	 * @param normalize A function to normalize the value.
	 */
	public withColumn<ColumnName extends Exclude<string, Columns>>(
		name: ColumnName,
		property: StringPropertyOrGetter<T>,
		normalize?: NormalizationFunction,
	): SearchFactory<T, Columns | ColumnName, Extra> {
		const getter = (typeof property === 'function' ? property : (obj: T) => [obj[property]]) as PropertyGetter<T>;

		this.columns.push({
			name: name as string as Columns,
			getter: getter,
			desc: {
				normalize,
			},
		});

		return this as SearchFactory<T, Columns | ColumnName, Extra>;
	}

	/**
	 * Adds metadata to the search result items.
	 * This is useful for attaching cached data such as search previews.
	 *
	 * @param generator A function to generate the metadata.
	 */
	public withMetadata<R extends object>(generator: (obj: T) => R): SearchFactory<T, Columns, Extra & R> {
		this.metadataGenerators.push(generator);
		return this as unknown as SearchFactory<T, Columns, Extra & R>;
	}

	/**
	 * Adds a sorting rule to the search result items.
	 * @param comparator The comparator for the sorting rule.
	 */
	public withSorting(comparator: Comparator<T, unknown>): SearchFactory<T, Columns, Extra> {
		this.sortFunctions.push(comparator);
		return this;
	}

	/**
	 * Changes if empty queries will be inclusive.
	 * @param enabled Whether enabled.
	 */
	public withInclusiveDefaults(enabled: boolean): SearchFactory<T, Columns, Extra> {
		this.options.resetToAll = enabled;
		return this;
	}

	/**
	 * Builds the index and returns a search class.
	 */
	public build(): SealedSearch<{ value: T } & Extra, Columns> {
		const { metadataGenerators, sortFunctions, columns: columnGenerators } = this;

		// Generate the comparison function.
		const compareFn =
			sortFunctions.length === 0
				? undefined
				: sortFunctions.length === 1
				? sortFunctions[0]
				: combinedComparison<T>(this.sortFunctions);

		// Generate the items.
		const items: Array<{ value: T } & Extra & Precomputed<T, unknown>> = this.items.map((item) =>
			Object.assign({}, ...metadataGenerators.map((fn) => fn(item)), {
				value: item,
				computed: compareFn?.precompute?.(item),
			}),
		);

		// Generate the column record and index function.
		const columns = Object.fromEntries(columnGenerators.map(({ name, desc }) => [name, desc])) as Record<
			Columns,
			ColumnDescription
		>;

		const indexFn = (item: { value: T } & Extra, index: SearchIndex<Columns>) => {
			let field = 0n as BitField;

			for (const { name, getter } of columnGenerators) {
				const column = index.column(name);
				for (const value of getter(item.value)) {
					field = BitField.or(field, BitField.fromPosition(column.add(value)));
				}
			}

			return field;
		};

		// Create the search instance and add the items.
		const search = new Search<{ value: T } & Extra & Precomputed<T, unknown>, Columns>({
			...this.options,
			columns,
			indexItem: indexFn,
			compareItem: compareFn,
		});

		search.addItems(items);

		// Return the search instance as a sealed search.
		return search as SealedSearch<{ value: T } & Extra, Columns>;
	}
}
