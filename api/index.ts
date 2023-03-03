import type { App, Plugin } from 'obsidian';

import type { CalloutManager } from './functions';

export * from './functions';
export * from './callout';
export * from './events';

type ObsidianAppWithPlugins = App & {
	plugins: {
		enabledPlugins: Set<string>;
		plugins: { [key: string]: Plugin };
	};
};

export const PLUGIN_ID = 'callout-manager';
export const PLUGIN_API_VERSION = 'v1';

/**
 * Gets an owned handle to the Callout Manager plugin API.
 * The provided plugin will be used as the owner.
 */
export async function getApi(plugin: Plugin): Promise<CalloutManager<true> | undefined>;

/**
 * Gets an unowned handle to the Callout Manager plugin API.
 * This handle cannot be used to register events.
 */
export async function getApi(): Promise<CalloutManager<false> | undefined>;

/**
 * @internal
 */
export async function getApi(plugin?: Plugin): Promise<CalloutManager | undefined> {
	type CalloutManagerPlugin = Plugin & {
		newApiHandle(
			version: string,
			plugin: Plugin | undefined,
			cleanupFunc: () => void,
		): CalloutManager<true | false>;

		destroyApiHandle(version: string, plugin: Plugin | undefined): CalloutManager<true | false>;
	};

	// Check if the plugin is available and loaded.
	const app = (plugin?.app ?? globalThis.app) as ObsidianAppWithPlugins;
	const { plugins } = app;
	if (!plugins.enabledPlugins.has(PLUGIN_ID)) {
		return undefined;
	}

	// Get the plugin instance.
	// We may need to wait until it's loaded.
	const calloutManagerInstance = (await new Promise((resolve, reject) => {
		const instance = plugins.plugins[PLUGIN_ID] as CalloutManagerPlugin | undefined;
		if (instance !== undefined) {
			return resolve(instance);
		}

		const interval = setInterval(() => {
			const instance = plugins.plugins[PLUGIN_ID] as CalloutManagerPlugin | undefined;
			if (instance !== undefined) {
				clearInterval(interval);
				resolve(instance);
			}
		}, 10);
	})) as CalloutManagerPlugin;

	// Create a new API handle.
	return calloutManagerInstance.newApiHandle(PLUGIN_API_VERSION, plugin, () => {
		calloutManagerInstance.destroyApiHandle(PLUGIN_API_VERSION, plugin);
	});
}

/**
 * Checks if Callout Manager is installed.
 */
export function isInstalled(app?: App) {
	// Check if the plugin is available and loaded.
	const appWithPlugins = (app ?? globalThis.app) as ObsidianAppWithPlugins;
	return appWithPlugins.plugins.enabledPlugins.has(PLUGIN_ID);
}
