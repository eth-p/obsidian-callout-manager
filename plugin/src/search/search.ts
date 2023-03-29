import { BitField } from './bitfield';
import { SearchCondition } from './condition';
import { SearchEffect } from './effect';
import { ColumnDescription, ReadonlySearchIndex, SearchIndex } from './search-index';

/**
 * An item that exists within a search.
 * This contains the item itself, along with associated data.
 */
type SearchItem<T> = {
	readonly value: Readonly<T>;
	readonly mask: BitField;
	score: number;
};

export interface SearchOptions<T> {
	/**
	 * If `true`, resetting the search will reinitialize the search results to include every item.
	 * This is useful when you want to treat the search like a filter operation.
	 */
	resetToAll?: boolean;

	/**
	 * If `false`, search score will not influence the order in which results are returned.
	 */
	resultRanking?: boolean;

	/**
	 * A comparison function that will be used to sort results with equal score.
	 * If not provided, results with equal score will not be sorted.
	 */
	compareItem?: (a: T, b: T) => number;
}

interface ConstructorOptions<T, Columns extends string> extends SearchOptions<T> {
	/**
	 * A list of columns that will be indexed.
	 */
	columns: Record<Columns, ColumnDescription>;

	/**
	 * A function that adds an item to the index.
	 *
	 * @param item The item to be indexed.
	 * @param index The index to which the item's properties will be added.
	 * @returns The mask for the item.
	 */
	indexItem: (item: Readonly<T>, index: SearchIndex<Columns>) => BitField;
}

/**
 * A wrapper around a {@link SearchIndex} that provides a simple search-oriented API with result sorting and
 * support for executing multiple conditions.
 */
export class Search<T, Columns extends string> implements SealedSearch<T, Columns> {
	private readonly indexedItems: SearchItem<T>[];
	public readonly index: SearchIndex<Columns>;

	private currentMask: BitField;
	private currentResults: null | ReadonlyArray<T>;
	private currentScores: Float32Array;

	private reusableCurrentScoresBuffer: Float32Array;
	private resetToAll: boolean;

	private fnIndex: (item: T, index: SearchIndex<Columns>) => BitField;
	private fnCompare: (a: SearchItem<T>, b: SearchItem<T>) => number;

	public constructor(options: ConstructorOptions<T, Columns>) {
		this.resetToAll = options?.resetToAll ?? false;
		this.index = new SearchIndex(options.columns);
		this.indexedItems = [];

		// Save functions.
		const suppliedFnCompare = options.compareItem ?? ((a, b) => 0);
		this.fnIndex = options.indexItem;

		// Initial values.
		this.currentMask = 0n as BitField;
		this.currentResults = null;
		this.currentScores = new Float32Array(0);
		this.reusableCurrentScoresBuffer = new Float32Array(0);

		// Create the compare function.
		this.fnCompare =
			(options.resultRanking ?? true) === false
				? (a, b) => suppliedFnCompare(a.value, b.value)
				: (a, b) => {
						const delta = b.score - a.score; // Sort higher to the top.
						if (delta !== 0) return delta;
						return suppliedFnCompare(b.value, a.value);
				  };
	}

	/**
	 * Adds items to the search.
	 * This will index the items.
	 *
	 * @param items The items to add.
	 */
	public addItems(items: ReadonlyArray<Readonly<T>>): void {
		const { index, indexedItems } = this;

		// Index the items.
		for (const item of items) {
			const mask = this.fnIndex(item, index);
			indexedItems.push({
				value: item,
				mask,
				score: 0,
			});
		}

		// Resize the score arrays if needed.
		const { size: newLength } = index;
		if (newLength > this.currentScores.length) {
			const { currentScores: oldScore } = this;
			this.reusableCurrentScoresBuffer = new Float32Array(newLength);
			this.currentScores = new Float32Array(newLength);
			this.currentScores.set(oldScore, 0);
		}
	}

	public reset(): void {
		const { index } = this;
		this.currentMask = this.resetToAll ? index.bitfield : (0n as BitField);
		this.currentResults = null;
		this.currentScores = new Float32Array(index.size);
	}

	public search(
		property: Columns,
		condition: SearchCondition,
		text: string,
		effect: SearchEffect,
		weight?: number,
	): void {
		const newScores = this.reusableCurrentScoresBuffer.fill(0);
		this.currentResults = null;

		// Run the search.
		const column = this.index.column(property);
		const searchResult = condition(column, column.normalize(text), newScores);

		// Adjust the search mask.
		this.currentMask = effect(this.currentMask, searchResult);

		// Adjust the search scores.
		const scoreWeight = weight ?? 1;
		const scores = this.currentScores;
		for (let i = 0, end = scores.length; i < end; i++) {
			scores[i] += newScores[i] * scoreWeight;
		}
	}

	public get results(): ReadonlyArray<Readonly<T>> {
		const cached = this.currentResults;
		if (cached != null) return cached;

		// Filter all the items to only include the ones that were selected.
		const { currentMask, currentScores, fnCompare } = this;
		const results = this.indexedItems.filter(({ mask }) => (currentMask & mask) > 0n);

		// Add the scores to the items.
		results.forEach((item) => {
			let mask = item.mask as bigint;
			let score = 0;

			for (let index = 0; mask > 0n; index++, mask >>= 1n) {
				if ((mask & 1n) !== 0n) score += currentScores[index];
			}

			item.score = score;
		});

		// Sort the results.
		results.sort(fnCompare);

		// Return the results.
		return (this.currentResults = results.map(({ value }) => value));
	}
}

/**
 * A {@link Search} class where no more items can be added.
 */
export interface SealedSearch<T, Columns extends string> {
	/**
	 * The search index.
	 */
	readonly index: ReadonlySearchIndex<Columns>;

	/**
	 * Resets the current search.
	 */
	reset(): void;

	/**
	 * Runs a search operation.
	 *
	 * @param property The indexed property to search against.
	 * @param condition The search condition.
	 * @param text The text to search with.
	 * @param effect How the search should affect the search mask.
	 * @param weight How heavily the results should weigh on the result sorting.
	 */
	search(property: Columns, condition: SearchCondition, text: string, effect: SearchEffect, weight?: number): void;

	/**
	 * Gets the combined results from all the search operations made since the last {@link reset}.
	 */
	get results(): ReadonlyArray<Readonly<T>>;
}

/**
 * Extracts the columns from a {@link Search} or {@link SealedSearch}.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SearchColumns<T extends SealedSearch<any, any>> = T extends SealedSearch<any, infer C> ? C : never;

/**
 * Extracts the values from a {@link Search} or {@link SealedSearch}.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SearchValues<T extends SealedSearch<any, any>> = T extends SealedSearch<infer V, any> ? V : never;
