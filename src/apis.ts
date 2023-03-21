import { Plugin } from 'obsidian';

import CalloutManagerPlugin from '&plugin';

import { CalloutID, CalloutManager } from '../api';

import { destroy, emitter } from './api-common';
import { CalloutManagerAPI_V1 } from './api-v1';

export class CalloutManagerAPIs {
	private readonly handles: Map<Plugin, CalloutManagerAPI_V1>;
	private readonly plugin: CalloutManagerPlugin;

	public constructor(plugin: CalloutManagerPlugin) {
		this.plugin = plugin;
		this.handles = new Map();
	}

	/**
	 * Creates (or gets) an instance of the Callout Manager API for a plugin.
	 * If the plugin is undefined, only trivial functions are available.
	 *
	 * @param version The API version.
	 * @param consumerPlugin The plugin using the API.
	 *
	 * @internal
	 */
	public async newHandle(
		version: 'v1',
		consumerPlugin: Plugin | undefined,
		cleanupFunc: () => void,
	): Promise<CalloutManager> {
		if (version !== 'v1') throw new Error(`Unsupported Callout Manager API: ${version}`);

		// If we aren't trying to create an owned handle, create and return an unowned one.
		if (consumerPlugin == null) {
			return new CalloutManagerAPI_V1(this.plugin, undefined);
		}

		// Otherwise, give back the owned handle for the plugin if we already have one.
		const existing = this.handles.get(consumerPlugin);
		if (existing != null) {
			return existing;
		}

		// Register the provided clean-up function on the consumer plugin.
		// When the consumer plugin unloads, the cleanup function will call `destroyApiHandle`.
		consumerPlugin.register(cleanupFunc);

		// Create a new handle.
		const handle = new CalloutManagerAPI_V1(this.plugin, consumerPlugin);
		this.handles.set(consumerPlugin, handle);
		return handle;
	}

	/**
	 * Destroys an API handle created by {@link newHandle}.
	 *
	 * @param version The API version.
	 * @param consumerPlugin The plugin using the API.
	 *
	 * @internal
	 */
	public destroyHandle(version: 'v1', consumerPlugin: Plugin) {
		if (version !== 'v1') throw new Error(`Unsupported Callout Manager API: ${version}`);

		const handle = this.handles.get(consumerPlugin);
		if (handle == null) return;

		handle[destroy]();
		this.handles.delete(consumerPlugin);
	}

	public emitEventForCalloutChange(id?: CalloutID) {
		for (const handle of this.handles.values()) {
			handle[emitter].trigger('change');
		}
	}
}
