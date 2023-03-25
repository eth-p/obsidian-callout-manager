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
		obsidian: boolean;
		theme: boolean;
		snippet: boolean;

		/** @deprecated */
		obsidianFallbackForced?: boolean;
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
			obsidian: true,
			theme: true,
			snippet: true,
		},
	};
}

/**
 * Migrates settings.
 *
 * @param into The object to merge into.
 * @param from The settings to add.
 * @returns The merged settings.
 */
export function migrateSettings(into: Settings, from: Settings | undefined) {
	const merged = Object.assign(into, {
		...from,
		calloutDetection: {
			...into.calloutDetection,
			...(from?.calloutDetection ?? {}),
		},
	});

	delete merged.calloutDetection.obsidianFallbackForced;
	return merged;
}
