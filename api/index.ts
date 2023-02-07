import type { App, Plugin } from 'obsidian';
import type { CalloutManager } from './functions';

export * from './functions';
export * from "./callout";

export const PLUGIN_ID = 'obsidian-callout-manager';

export function getApi(plugin: Plugin): CalloutManager<true> | undefined;
export function getApi(): CalloutManager<false> | undefined;

/**
 * @internal
 */
export function getApi(plugin?: Plugin): CalloutManager | undefined {
	type ObsidianAppWithPlugins = App & {
		enabledPlugins: string[];
		plugins: { [key: string]: Plugin };
	};

	type CalloutManagerPlugin = Plugin & {
		newApiHandle(plugin: Plugin | undefined): CalloutManager<true | false>;
	};

	// Check if the plugin is available and loaded.
	const app = (plugin?.app ?? globalThis.app) as ObsidianAppWithPlugins;
	if (!app.enabledPlugins.includes(PLUGIN_ID)) {
		return undefined;
	}

	// Get the plugin instance and return access to the API.
	const calloutManagerInstance = app.plugins[PLUGIN_ID] as CalloutManagerPlugin;
	return calloutManagerInstance.newApiHandle(plugin);
}
