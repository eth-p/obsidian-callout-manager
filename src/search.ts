import { prepareFuzzySearch } from 'obsidian';

import Callout from '&callout';

import { Comparator, combinedComparison, compareColor, compareId } from './sort';

/**
 * An optimized search index.
 *
 * The index collects all searchable properties and their possible values, stores them, and generates a bitmask for
 * every item that can be searched through. This allows for the search to be split into two stages, with all the
 * expensive fuzzy comparisons being performed in O(1) time as opposed to O(n).
 */
export class SearchIndex<Keys extends string> {
	private readonly knownValues: Map<Keys, SearchIndex.LookupMap>;
	private nextMaskBit = 0;
	private allEnabled = 0n;

	public constructor() {
		this.knownValues = new Map();
	}

	/**
	 * Adds a case-insensitive property to the index.
	 *
	 * @param property The property name.
	 * @param value The property value.
	 *
	 * @returns The bitmask for the property.
	 */
	public addIndex(property: Keys, value: string): SearchIndex.Mask {
		return this.addIndexCaseSensitive(property, value.toLocaleLowerCase());
	}

	/**
	 * Adds a case-sensitive property to the index.
	 *
	 * @param property The property name.
	 * @param value The property value.
	 *
	 * @returns The bitmask for the property.
	 */
	public addIndexCaseSensitive(property: Keys, value: string): SearchIndex.Mask {
		const map = this.getKnownValuesForProperty(property);
		const bit = this.getMaskForPropertyValue(map, value.trim());
		return 1n << BigInt(bit);
	}

	/**
	 * Gets the value-to-mask lookup map for a given property.
	 * If the map does not exist, it will be created.
	 *
	 * @param property The property.
	 * @returns The lookup map.
	 */
	protected getKnownValuesForProperty(property: Keys): SearchIndex.LookupMap {
		const map = this.knownValues.get(property);
		if (map != null) return map;

		const newMap = new Map();
		this.knownValues.set(property, newMap);
		return newMap;
	}

	/**
	 * Gets the index for the bit corresponding to the given value.
	 * If the given value does not have an associated bit index, one will be assigned.
	 *
	 * @param map The lookup map for the property in question.
	 * @param value The associated value of the bit.
	 * @returns The bit index.
	 */
	protected getMaskForPropertyValue(map: SearchIndex.LookupMap, value: string): SearchIndex.MaskBit {
		const bit = map.get(value);
		if (bit != null) return bit;

		const newBit = this.nextMaskBit;
		map.set(value, newBit);

		// Increase the mask size.
		this.allEnabled = (this.allEnabled << 1n) | 1n;
		this.nextMaskBit += 1;
		return newBit;
	}

	/**
	 * Returns a `bigint` mask that has all bits set to 1.
	 */
	public getMask(): bigint {
		return this.allEnabled;
	}

	/**
	 * Returns the length of the bit mask.
	 */
	public getMaskLength(): number {
		return this.nextMaskBit;
	}

	/**
	 * Returns an iterator of known values and their associated mask bit index for the given property.
	 * @param property The property.
	 */
	public entries(property: Keys): Iterable<[string, SearchIndex.MaskBit]> {
		return this.getKnownValuesForProperty(property).entries();
	}
}

export namespace SearchIndex {
	export type LookupMap = Map<string, MaskBit>;
	export type MaskBit = number;
	export type Mask = bigint;
}

/**
 * An object containing various precomputed values for a callout.
 * This is used by the search algorithm to filter out callouts.
 */
interface SearchItem {
	readonly value: Callout;
	readonly previewEl: HTMLElement;

	readonly searchMask: SearchIndex.Mask;
	readonly computed: Readonly<Record<string, unknown>>;
}

/**
 * A function that indexes some property of a callout.
 */
type IndexFactory<Keys extends string> = (callout: Readonly<Callout>, index: SearchIndex<Keys>) => SearchIndex.Mask;

/**
 * Creates a search item, added its properties to the index and generating a preview element.
 *
 * @param value The callout associated with the search item.
 * @param index The search index.
 * @param indexFactories One or more functions that can be used to generate a search mask.
 * @param previewFactory A function for generating a DOM tree that can be displayed for the preview.
 * @param comparePrecompute A function to precompute values needed to perform comparisons for sorting.
 */
function createSearchItem<Keys extends string>(
	value: Callout,
	index: SearchIndex<Keys>,
	indexFactories: ReadonlyArray<IndexFactory<Keys>>,
	previewFactory: (callout: Readonly<Callout>) => HTMLElement,
	comparePrecompute: (callout: Readonly<Callout>) => Record<string, unknown>,
): SearchItem {
	return {
		value: value,
		searchMask: indexFactories.reduce((a, fn) => a | fn(value, index), 0n),

		previewEl: previewFactory(value),
		computed: comparePrecompute(value),
	};
}

type IndexedSearchKey<Extra extends string | void> = Exclude<
	| 'id' // The callout ID.
	| 'icon' // The callout icon.
	| 'from' // The callout source.
	| Extra, // User-added properties.
	void
>;

interface Options {
	/**
	 * A function for generating callout previews.
	 * Since DOM functions are expensive, we generate previews ahead of time instead of after each search.
	 *
	 * @param callout The callout to generate the preview for.
	 * @returns The preview element for the callout.
	 */
	previewFactory?: (callout: Readonly<Callout>) => HTMLElement;

	/**
	 * If `true` or `undefined`, having no search terms will cause the search to return all callouts.
	 */
	emptySearchIncludesAll?: boolean;

	/**
	 * If `false`, search score will not influence the order in which results are returned.
	 */
	compareWithScore?: boolean;

	/**
	 * A function for comparing search results.
	 */
	compareFunction?: Comparator<Callout, Record<string, unknown>>;

	/** Allows for searching by callout ID. */
	byId?: boolean;

	/** Allows for searching by icon. */
	byIcon?: boolean;

	/** Allows for searching by source. */
	bySource?: boolean;
}

interface OptionsWithIndexFactory<ExtraKeys extends string> extends Options {
	/**
	 * A function for adding custom search properties for callouts.
	 *
	 * @param callout The callout to add custom search properties for.
	 * @param index The search index.
	 */
	indexFactory?: (callout: Readonly<Callout>, index: SearchIndex<ExtraKeys>) => void;
}

/**
 * Search options.
 */
export type CalloutSearchOptions<ExtraKeys extends string | void = void> = Options &
	(ExtraKeys extends string ? OptionsWithIndexFactory<ExtraKeys> : Record<string, unknown>);

export default class CalloutSearch<ExtraKeys extends string | void = void> {
	private readonly callouts: SearchItem[];
	private readonly index: SearchIndex<IndexedSearchKey<ExtraKeys>>;
	private readonly emptySearchIncludesAll: boolean;

	private currentSearchMask: bigint;
	private currentSearchResults: null | CalloutSearchResult[];
	private currentSearchScores: number[];

	private compareFn: Comparator<Callout, Record<string, unknown>>;
	private compareWithScore: boolean;

	public constructor(callouts: ReadonlyArray<Callout>, options?: CalloutSearchOptions<ExtraKeys>) {
		const { previewFactory, indexFactory, emptySearchIncludesAll, compareFunction, compareWithScore, ...indexed } =
			{
				previewFactory: () => document.createElement('div'),
				indexFactory: undefined,
				emptySearchIncludesAll: true,
				compareWithScore: true,
				compareFunction: combinedComparison<Callout>([compareColor, compareId]),
				byId: true,
				byIcon: true,
				bySource: true,

				...(options ?? {}),
			};

		// Generate the search items.
		const indexFactories = [
			indexed.byId ? indexCalloutId : null,
			indexed.byIcon ? indexCalloutIcon : null,
			indexed.bySource ? indexCalloutSource : null,
			indexFactory,
		];

		this.index = new SearchIndex();
		this.callouts = callouts.map((callout) =>
			createSearchItem(
				callout,
				this.index,
				indexFactories.filter((fn) => fn != null) as IndexFactory<IndexedSearchKey<ExtraKeys>>[],
				previewFactory,
				compareFunction.precompute ?? (() => ({})),
			),
		);

		// Construct variables.
		this.compareFn = compareFunction as Comparator<Callout, Record<string, unknown>>;
		this.compareWithScore = compareWithScore;

		this.emptySearchIncludesAll = emptySearchIncludesAll;
		this.currentSearchMask = emptySearchIncludesAll ? this.index.getMask() : 0n;
		this.currentSearchResults = null;
		this.currentSearchScores = new Array(this.index.getMaskLength()).fill(0);
	}

	/**
	 * Resets the current search.
	 */
	public reset(): void {
		this.currentSearchMask = this.emptySearchIncludesAll ? this.index.getMask() : 0n;
		this.currentSearchResults = null;
		this.currentSearchScores.fill(0);
	}

	/**
	 * Runs a search operation.
	 *
	 * @param property The indexed property to search against.
	 * @param operation The search operation.
	 * @param text The text to search with.
	 * @param action How the search should affect the search mask.
	 * @param weight How heavily the results should weigh on the result sorting.
	 */
	public search(
		property: IndexedSearchKey<ExtraKeys>,
		operation: (
			index: Iterable<[string, SearchIndex.MaskBit]>,
			query: string,
			scores: number[],
		) => SearchIndex.Mask,
		text: string,
		action: (a: bigint, b: bigint) => bigint,
		weight?: number,
	): void {
		const scores = new Array(this.currentSearchScores.length).fill(0);
		const searchResult = operation(this.index.entries(property), text, scores);

		// Adjust the search mask.
		this.currentSearchMask = action(this.currentSearchMask, searchResult);

		// Adjust the search scores.
		const scoreWeight = weight ?? 1;
		for (let i = 0, end = scores.length; i < end; i++) {
			this.currentSearchScores[i] += scores[i] * scoreWeight;
		}
	}

	/**
	 * Gets the combined results from all the search operations made since the last {@link reset}.
	 */
	public get results(): ReadonlyArray<CalloutSearchResult> {
		const cached = this.currentSearchResults;
		if (cached != null) return cached;

		// Filter all the callouts to only include the ones that were selected.
		const resMask = this.currentSearchMask;
		const resScores = this.currentSearchScores;

		const filtered = this.callouts.filter(({ searchMask }) => (searchMask & resMask) > 0n);
		const scores = filtered.map(({ searchMask }) => {
			let score = 0;

			for (let index = 0; searchMask > 0n; index++, searchMask >>= 1n) {
				if ((searchMask & 1n) !== 0n) score += resScores[index];
			}

			return score;
		});

		const results: CalloutSearchResult[] = filtered
			.map((v, i) => [v, scores[i]] as [SearchItem, number])
			.sort(([a, aScore], [b, bScore]) => {
				if (this.compareWithScore) {
					const scoreDelta = aScore - bScore;
					if (scoreDelta !== 0) return scoreDelta;
				}

				return this.compareFn(a, b);
			})
			.map(([v]) => ({
				callout: v.value,
				previewEl: v.previewEl,
			}));

		this.currentSearchResults = results;
		return results;
	}
}

/**
 * A search result.
 */
export interface CalloutSearchResult {
	readonly callout: Readonly<Callout>;
	readonly previewEl: HTMLElement;
}

// ---------------------------------------------------------------------------------------------------------------------
// Property Indexing
// ---------------------------------------------------------------------------------------------------------------------

function indexCalloutId(callout: Readonly<Callout>, index: SearchIndex<IndexedSearchKey<void>>) {
	return index.addIndex('id', callout.id);
}

function indexCalloutIcon(callout: Readonly<Callout>, index: SearchIndex<IndexedSearchKey<void>>) {
	return index.addIndex('icon', callout.icon);
}

function indexCalloutSource(callout: Readonly<Callout>, index: SearchIndex<IndexedSearchKey<void>>) {
	let mask = 0n;
	for (const source of callout.sources) {
		mask |= index.addIndex('from', source.type);

		switch (source.type) {
			case 'snippet':
				mask |= index.addIndex('from', source.snippet);
				mask |= index.addIndex('from', source.snippet + '.css');
				break;

			case 'theme':
				mask |= index.addIndex('from', source.theme);
				break;
		}
	}

	return mask;
}

// ---------------------------------------------------------------------------------------------------------------------
// Index Matching
// ---------------------------------------------------------------------------------------------------------------------

export namespace Operation {
	/**
	 * The query fuzzily matches a property.
	 */
	export function matches(index: Iterable<[string, SearchIndex.MaskBit]>, textToMatch: string, scores: number[]) {
		const matchesQuery = prepareFuzzySearch(textToMatch.trim());
		let mask = 0n;

		for (const [text, bit] of index) {
			const res = matchesQuery(text);
			if (res != null) {
				mask |= 1n << BigInt(bit);
				scores[bit] += res.score;
			}
		}

		return mask;
	}

	/**
	 * The query is a substring of the property.
	 */
	export function includes(index: Iterable<[string, SearchIndex.MaskBit]>, textToInclude: string, scores: number[]) {
		const cleaned = textToInclude.trim();
		let mask = 0n;

		for (const [text, bit] of index) {
			if (text.includes(cleaned)) {
				mask |= 1n << BigInt(bit);
				scores[bit] += text.length / cleaned.length;
			}
		}

		return mask;
	}

	/**
	 * The query exactly matches the property.
	 */
	export function equals(index: Iterable<[string, SearchIndex.MaskBit]>, textToHave: string, scores: number[]) {
		const cleaned = textToHave.trim();
		let mask = 0n;

		for (const [text, bit] of index) {
			if (text.includes(cleaned)) {
				mask |= 1n << BigInt(bit);
				scores[bit] += text.length / cleaned.length;
			}
		}

		return mask;
	}
}

// ---------------------------------------------------------------------------------------------------------------------
// Mask Operations
// ---------------------------------------------------------------------------------------------------------------------

export namespace Actions {
	export function add(a: bigint, b: bigint): bigint {
		return a | b;
	}

	export function remove(a: bigint, b: bigint): bigint {
		return a & ~b;
	}

	export function filter(a: bigint, b: bigint): bigint {
		return a & b;
	}
}
