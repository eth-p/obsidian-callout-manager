import { CalloutID } from '&callout';
import { CalloutSettings } from './callout-settings';


/**
 * The Callout Manager plugin settings.
 */
export default interface Settings {
	callouts: {
		custom: string[];
		settings: Record<CalloutID, CalloutSettings>;
	};

	calloutDetection: {
		obsidianFallbackForced: boolean;
		obsidian: boolean;
		theme: boolean;
		snippet: boolean;
	};
}

/**
 * Creates default settings for the plugin.
 */
export function defaultSettings(): Settings {
	return {
		callouts: {
			custom: [],
			settings: {},
		},
		calloutDetection: {
			obsidianFallbackForced: false,
			obsidian: true,
			theme: true,
			snippet: true,
		},
	};
}

/**
 * Merges settings.
 *
 * @param into The object to merge into.
 * @param from The settings to add.
 * @returns The merged settings.
 */
export function mergeSettings(into: Settings, from: Settings | undefined) {
	return Object.assign(into, {
		...from,
		calloutDetection: {
			...into.calloutDetection,
			...(from?.calloutDetection ?? {}),
		},
	});
}
