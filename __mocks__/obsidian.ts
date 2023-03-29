import type { SearchResult } from 'obsidian';

export function prepareFuzzySearch(query: string): (text: string) => SearchResult | null {
	return (text) => {
		// TODO: A real fuzzy search mock.
		if (text.includes(query)) {
			return { score: text.length / query.length, matches: [] };
		}

		return null;
	};
}
