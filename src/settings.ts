import { ThemeID } from 'obsidian-undocumented';

import { CalloutID } from '../api/callout';

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

// Callout settings type definitions.

export type CalloutSettingsConditionType = 'theme' | 'colorScheme' | 'and' | 'or';

export type CalloutSettingsThemeCondition = { theme: ThemeID | '<default>' };
export type CalloutSettingsColorSchemeCondition = { colorScheme: 'dark' | 'light' };
export type CalloutSettingsElementaryConditions = CalloutSettingsThemeCondition | CalloutSettingsColorSchemeCondition;
export type CalloutSettingsCombinatoryConditions =
	| { and: CalloutSettingsCondition[] }
	| { or: CalloutSettingsCondition[] };

/**
 * Changes that can be applied to callouts.
 */
export type CalloutSettingsChanges = {
	color?: string;
	icon?: string;
	customStyles?: string;
};

/**
 * Conditions that affect when callout changes are applied.
 */
export type CalloutSettingsCondition =
	| undefined
	| CalloutSettingsElementaryConditions
	| CalloutSettingsCombinatoryConditions;

export type CalloutSetting<C extends CalloutSettingsCondition = CalloutSettingsCondition> = {
	condition: C;
	changes: CalloutSettingsChanges;
};

export type CalloutSettings<C extends CalloutSettingsCondition = CalloutSettingsCondition> = Array<CalloutSetting<C>>;

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

export function mergeSettings(into: Settings, from: Settings | undefined) {
	return Object.assign(into, {
		...from,
		calloutDetection: {
			...into.calloutDetection,
			...(from?.calloutDetection ?? {}),
		},
	});
}
