import Callout from '&callout';

import { SearchCondition, matches } from './search/condition';
import { filter } from './search/effect';
import { SearchFactory } from './search/factory';
import { casefold, combinedNormalization, trimmed, unicode } from './search/normalize';
import { parseQuery } from './search/query';
import { SearchColumns } from './search/search';
import { combinedComparison, compareColor, compareId } from './sort';

type MaybePreview<Preview extends HTMLElement | never> = Preview extends HTMLElement
	? { readonly preview: Preview }
	: { readonly preview?: never };

export type CalloutSearchResult<Preview extends HTMLElement | never = never> = MaybePreview<Preview> & {
	readonly callout: Callout;
};

/**
 * A function that will search a predefined list of callouts for the given query.
 */
export type CalloutSearch<Preview extends HTMLElement | never> = (
	query: string,
) => ReadonlyArray<CalloutSearchResult<Preview>>;

/**
 * Search options.
 */
interface CalloutSearchOptions {
	/**
	 * The type of searching to use for query operations.
	 * If not provided, the default will be `matches`.
	 */
	defaultCondition?: SearchCondition;
}

/**
 * Search options with a preview generator.
 */
interface CalloutSearchWithPreviewOptions<Preview extends HTMLElement = HTMLElement> extends CalloutSearchOptions {
	/**
	 * A function that generates a preview for each callout.
	 *
	 * @param callout The callout.
	 * @returns Its associated preview.
	 */
	preview: (callout: Callout) => Preview;
}

export function calloutSearch<
	Options extends CalloutSearchOptions | CalloutSearchWithPreviewOptions<HTMLElement>,
	Preview extends HTMLElement | never = Options extends CalloutSearchWithPreviewOptions<infer P> ? P : never,
>(callouts: ReadonlyArray<Callout>, options?: Options): CalloutSearch<Preview> {
	const preview = (options as Partial<CalloutSearchWithPreviewOptions<HTMLElement>>)?.preview;
	const defaultCondition = options?.defaultCondition ?? matches;

	const standardNormalization = combinedNormalization([
		casefold,
		unicode,
		trimmed,
		(v) => v.replace(/[ -_.]+/g, '-'),
	]);

	const standardSorting = combinedComparison<Callout>([compareColor, compareId]);
	const search = new SearchFactory<Callout, never>(callouts)
		.withColumn('id', 'id', standardNormalization)
		.withColumn('icon', 'icon', standardNormalization)
		.withColumn('source', sourceGetter, standardNormalization)
		.withColumn('snippet', snippetGetter, standardNormalization)
		.withMetadata((callout) => (preview == null ? {} : { preview: preview(callout) }))
		.withInclusiveDefaults(true)
		.withSorting(standardSorting)
		.build();

	type Columns = SearchColumns<typeof search>;
	return ((query: string) => {
		const ops = parseQuery(query);
		search.reset();
		for (const op of ops) {
			let field = op.field;
			if (field === '' || field == null) field = 'id';

			// Skip operations that don't have text.
			if (op.text === '' || op.text == null) continue;

			// Perform search.
			console.log(op);
			search.search(field as Columns, op.condition ?? defaultCondition, op.text, op.effect ?? filter);
		}

		console.log(search);
		return search.results as unknown as ReadonlyArray<CalloutSearchResult<Preview>>;
	}) as CalloutSearch<Preview>;
}

function snippetGetter(callout: Callout): string[] {
	const values = [] as string[];

	for (const source of callout.sources) {
		if (source.type !== 'snippet') continue;
		values.push(source.snippet);
	}

	return values;
}

function sourceGetter(callout: Callout): string[] {
	const sources = [] as string[];

	for (const source of callout.sources) {
		switch (source.type) {
			case 'builtin':
				sources.push('obsidian');
				sources.push('builtin');
				sources.push('built-in');
				break;

			case 'custom':
				sources.push('custom');
				sources.push('user');
				sources.push('callout-manager');
				break;

			default:
				sources.push(source.type);
		}
	}

	return sources;
}
