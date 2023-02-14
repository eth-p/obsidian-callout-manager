import { CalloutID } from '../api';

/**
 * Extracts a list of callout IDs from a stylesheet.
 *
 * @param css The CSS to extract from.
 * @returns The callout IDs found.
 */
export function getCalloutsFromCSS(css: string): CalloutID[] {
	const REGEX_CALLOUT_SELECTOR = /\[data-callout([^\]]*)\]/gmi;
	const REGEX_MATCH_QUOTED_STRING: {[key: string]: RegExp} = {
		"'": /^'([^']+)'( i)?$/,
		'"': /^"([^"]+)"( i)?$/,
		'': /^([^\]]+)$/,
	};

	// Get a list of attribute selectors.
	const attributeSelectors = [];
	let matches;
	while ((matches = REGEX_CALLOUT_SELECTOR.exec(css)) != null) {
		attributeSelectors.push(matches[1]);
		REGEX_CALLOUT_SELECTOR.lastIndex = matches.index + matches[0].length;
	}

	// Try to find exact matches within the list.
	const ids = [];
	for (const attributeSelector of attributeSelectors) {
		let selectorString: null | string;
		if (attributeSelector.startsWith('=')) {
			selectorString = attributeSelector.substring(1);
		} else if (attributeSelector.startsWith('^=')){
			selectorString = attributeSelector.substring(2);
		} else {
			continue;
		}

		// Try to extract the string from the attribute selector.
		const quoteChar = selectorString.charAt(0);
		const stringRegex = REGEX_MATCH_QUOTED_STRING[quoteChar] ?? REGEX_MATCH_QUOTED_STRING[''];
		const matches = stringRegex.exec(selectorString);
		if (matches != null && matches[1] != null) {
			ids.push(matches[1]);
		}
	}

	return ids;
}
