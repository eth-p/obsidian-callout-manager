import type { App, Plugin } from 'obsidian';

import type { CalloutManager } from './functions';

export * from './functions';
export * from './callout';
export * from './events';

type ObsidianAppWithPlugins = App & {
	plugins: {
		enabledPlugins: Set<string>;
		manifests: { [key: string]: unknown };
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
		): Promise<CalloutManager<true | false>>;

		destroyApiHandle(version: string, plugin: Plugin | undefined): CalloutManager<true | false>;
	};

	// Check if the plugin is installed and enabled.
	const app = (plugin?.app ?? globalThis.app) as ObsidianAppWithPlugins;
	if (!isInstalled(app)) {
		return undefined;
	}

	// Get the plugin instance.
	// We may need to wait until it's loaded.
	const { plugins } = app;
	const calloutManagerInstance = await waitFor<CalloutManagerPlugin>((resolve) => {
		const instance = plugins.plugins[PLUGIN_ID] as CalloutManagerPlugin;
		if (instance != null) resolve(instance);
	});

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
	const plugins = ((app ?? globalThis.app) as ObsidianAppWithPlugins).plugins;
	return PLUGIN_ID in plugins.manifests && plugins.enabledPlugins.has(PLUGIN_ID);
}

/**
 * Runs a function every 10 milliseconds, returning a promise that resolves when the function resolves.
 *
 * @param fn A function that runs periodically, waiting for something to happen.
 * @returns A promise that resolves to whatever the function wants to return.
 */
function waitFor<T>(fn: (resolve: (value: T) => void) => void | PromiseLike<void>): Promise<T> {
	return new Promise((doResolve, reject) => {
		let queueAttempt = () => {
			setTimeout(attempt, 10);
		};

		const resolve = (value: T) => {
			queueAttempt = () => {};
			doResolve(value);
		};

		function attempt() {
			try {
				const promise = fn(resolve);
				if (promise === undefined) {
					queueAttempt();
					return;
				}

				promise.then(queueAttempt, (ex) => reject(ex));
			} catch (ex) {
				reject(ex);
			}
		}

		attempt();
	});
}
