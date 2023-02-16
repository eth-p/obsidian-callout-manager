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

type CalloutSettingsElementaryCondition = { theme: ThemeID | '<default>' } | { appearance: 'dark' | 'light' };
export type CalloutSettingsCondition =
	| undefined
	| CalloutSettingsElementaryCondition
	| { and: CalloutSettingsCondition[] }
	| { or: CalloutSettingsCondition[] };

export type CalloutSettings = Array<{
	condition: CalloutSettingsCondition;
	changes: {
		color: string;
		icon: string;
		customStyles: string;
	};
}>;

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
