/**
 * A type representing the ID of a callout.
 */
export type CalloutID = string;

/**
 * A description of a markdown callout.
 */
export type Callout = CalloutProperties & {
	/**
	 * The list of known sources for the callout.
	 * A source is a stylesheet that provides styles for a callout with this ID.
	 */
	sources: CalloutSource[];
};

export interface CalloutProperties {
	/**
	 * The ID of the callout.
	 * This is the part that goes in the callout header.
	 */
	id: CalloutID;

	/**
	 * The current color of the callout.
	 */
	color: string;

	/**
	 * The icon associated with the callout.
	 */
	icon: string;
}

/**
 * The source of a callout.
 * This is what declares the style information for the callout with the given ID.
 */
export type CalloutSource = CalloutSourceObsidian | CalloutSourceSnippet | CalloutSourceTheme | CalloutSourceCustom;

/**
 * The callout is a built-in Obsidian callout.
 */
export interface CalloutSourceObsidian {
	type: 'builtin';
}

/**
 * The callout is from a snippet.
 */
export interface CalloutSourceSnippet {
	type: 'snippet';
	snippet: string;
}

/**
 * The callout is from a theme.
 */
export interface CalloutSourceTheme {
	type: 'theme';
	theme: string;
}

/**
 * The callout was added by the user.
 */
export interface CalloutSourceCustom {
	type: 'custom';
}

export default Callout;
