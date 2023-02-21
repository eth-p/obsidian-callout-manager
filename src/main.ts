import { Plugin } from 'obsidian';
import { CustomStyleSheet, createCustomStyleSheet } from 'obsidian-extra';

import { UISettingTab } from '&ui/paned-setting-tab';

import type { CalloutID, CalloutManager } from '../api';

import { CalloutManagerAPI_V1 } from './api-v1';
import { CalloutCollection } from './callout-collection';
import builtinCallouts from './callout-fallback-obsidian.json';
import { CalloutResolver } from './callout-resolver';
import { CalloutSettings, calloutSettingsToCSS, currentCalloutEnvironment } from './callout-settings';
import { getCalloutsFromCSS } from './css-parser';
import StylesheetWatcher, { ObsidianStylesheet, SnippetStylesheet, ThemeStylesheet } from './css-watcher';
import { ManageCalloutsPane } from './panes/manage-callouts-pane';
import { ManagePluginPane } from './panes/manage-plugin-pane';
import Settings, { defaultSettings, mergeSettings } from './settings';

export default class CalloutManagerPlugin extends Plugin {
	public settings!: Settings;
	public cssWatcher!: StylesheetWatcher;
	public cssApplier!: CustomStyleSheet;

	public calloutResolver!: CalloutResolver;
	public callouts!: CalloutCollection;

	public apiHandles!: Map<Plugin, CalloutManagerAPI_V1>;

	public settingTab!: UISettingTab;

	/** @override */
	public async onload() {
		this.apiHandles = new Map();

		await this.loadSettings();
		await this.saveSettings();
		const { settings } = this;

		// Create the callout resolver.
		// This needs to be created as early as possible to ensure the Obsidian stylesheet within the shadow DOM has loaded.
		// We also register an event to ensure that it tracks any changes to the loaded styles.
		this.calloutResolver = new CalloutResolver();
		this.register(() => this.calloutResolver.unload());

		// Create the callout collection.
		// Use getCalloutProperties to resolve the callout's color and icon.
		this.callouts = new CalloutCollection((id) => {
			const { icon, color } = this.calloutResolver.getCalloutProperties(id);
			console.debug('Resolved Callout:', id, { icon, color });
			return {
				id,
				icon,
				color,
			};
		});

		// Add the custom callouts.
		this.callouts.custom.add(...settings.callouts.custom);

		// Create a plugin-managed style sheet.
		//  -> This is used to apply the user's custom styles to callouts.
		this.cssApplier = createCustomStyleSheet(this.app, this);
		this.cssApplier.setAttribute('data-callout-manager', 'style-overrides');
		this.register(this.cssApplier);
		this.applyStyles();

		// Create the stylesheet watcher.
		// This will let us update the callout collection whenever any styles change.
		this.cssWatcher = new StylesheetWatcher(this.app, settings.calloutDetection.obsidianFallbackForced);
		this.cssWatcher.on('add', this.updateCalloutSource.bind(this));
		this.cssWatcher.on('change', this.updateCalloutSource.bind(this));
		this.cssWatcher.on('remove', this.removeCalloutSource.bind(this));
		this.cssWatcher.on('checkComplete', () => this.maybeRefreshCalloutBuiltinsWithFallback());

		this.cssWatcher.on('checkComplete', (anyChanges) => {
			if (anyChanges) {
				this.emitApiEventChange();
			}
		});

		this.app.workspace.onLayoutReady(() => {
			this.register(this.cssWatcher.watch());
		});

		// Register a listener for whenever the CSS changes.
		//   Since the styles for a callout can change, we need to reload the styles in the resolver.
		//   It's also a good idea to reapply our own styles, since the color scheme or theme could have changed.
		this.registerEvent(
			this.app.workspace.on('css-change', () => {
				this.calloutResolver.reloadStyles();
				this.applyStyles();
			}),
		);

		// Register setting tab.
		this.settingTab = new UISettingTab(this, () => new ManagePluginPane(this));
		this.addSettingTab(this.settingTab);

		// Register modal commands.
		this.addCommand({
			id: 'manage-callouts',
			name: 'Edit callouts',
			callback: () => {
				this.settingTab.openWithPane(new ManageCalloutsPane(this));
			},
		});
	}

	async loadSettings() {
		this.settings = mergeSettings(defaultSettings(), await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * Takes in a stylesheet from the watcher and updates the callout collection.
	 * @param ss The stylesheet.
	 */
	protected updateCalloutSource(ss: ThemeStylesheet | ObsidianStylesheet | SnippetStylesheet): void {
		const callouts = getCalloutsFromCSS(ss.styles);
		const { calloutDetection } = this.settings;

		switch (ss.type) {
			case 'obsidian':
				if (calloutDetection.obsidian === true && !calloutDetection.obsidianFallbackForced) {
					this.callouts.builtin.set(callouts);
				}
				return;

			case 'theme':
				if (calloutDetection.theme) {
					this.callouts.theme.set(ss.theme, callouts);
				}
				return;

			case 'snippet':
				if (calloutDetection.snippet) {
					this.callouts.snippets.set(ss.snippet, callouts);
				}
				return;
		}
	}

	/**
	 * Forces the callout sources to be refreshed.
	 * This is used to re-detect the sources when settings are changed.
	 */
	public refreshCalloutSources(): void {
		this.callouts.snippets.clear();
		this.callouts.theme.delete();
		this.callouts.builtin.set([]);

		this.cssWatcher.checkForChanges(true).then(() => {
			this.maybeRefreshCalloutBuiltinsWithFallback();
		});
	}

	/**
	 * Create a custom callout and add it to Obsidian.
	 * @param id The custom callout ID.
	 */
	public createCustomCallout(id: CalloutID): void {
		const { callouts, settings } = this;
		callouts.custom.add(id);
		settings.callouts.custom = callouts.custom.keys();
		this.saveSettings();
		this.emitApiEventChange(id);
	}

	/**
	 * Delete a custom callout.
	 * @param id The custom callout ID.
	 */
	public removeCustomCallout(id: CalloutID): void {
		const { callouts, settings } = this;
		callouts.custom.delete(id);
		settings.callouts.custom = callouts.custom.keys();
		this.saveSettings();
		this.emitApiEventChange(id);
	}

	/**
	 * Gets the custom settings for a callout.
	 *
	 * @param id The callout ID.
	 * @returns The custom settings, or undefined if there are none.
	 */
	public getCalloutSettings(id: CalloutID): CalloutSettings | undefined {
		const calloutSettings = this.settings.callouts.settings;
		if (!Object.prototype.hasOwnProperty.call(calloutSettings, id)) {
			return undefined;
		}

		return calloutSettings[id];
	}

	/**
	 * Sets the custom settings for a callout.
	 *
	 * @param id The callout ID.
	 * @param settings The callout settings.
	 */
	public setCalloutSettings(id: CalloutID, settings: CalloutSettings | undefined) {
		const calloutSettings = this.settings.callouts.settings;

		// Update settings.
		if (settings === undefined) {
			delete calloutSettings[id];
		} else {
			calloutSettings[id] = settings;
		}

		// Save.
		this.saveSettings();

		// Reapply.
		this.applyStyles();
		this.callouts.invalidate(id);

		// Emit.
		this.emitApiEventChange(id);
	}

	/**
	 * Generates the stylesheet for the user's custom callout settings and applies it to the page and the callout
	 * resolver's custom stylesheet.
	 */
	public applyStyles() {
		const env = currentCalloutEnvironment(this.app);

		// Generate the CSS.
		const css = [];
		for (const [id, settings] of Object.entries(this.settings.callouts.settings)) {
			css.push(calloutSettingsToCSS(id, settings, env));
		}

		// Apply the CSS.
		const stylesheet = css.join('\n\n');
		this.cssApplier.css = stylesheet;
		this.calloutResolver.customStyleEl.textContent = stylesheet;
	}

	/**
	 * If the fallback list is forced or obsidian stylesheet detection is unsupported,
	 * add the embedded fallback list to the callout collection.
	 */
	protected maybeRefreshCalloutBuiltinsWithFallback(): void {
		const { calloutDetection } = this.settings;
		if (!calloutDetection.obsidian) {
			return;
		}

		if (calloutDetection.obsidianFallbackForced || !this.cssWatcher.isObsidianStylesheetSupported()) {
			this.callouts.builtin.set(builtinCallouts);
		}
	}

	/**
	 * Takes in a stylesheet from the watcher and removes its callouts from the callout collection.
	 * @param ss The stylesheet.
	 */
	protected removeCalloutSource(ss: ThemeStylesheet | ObsidianStylesheet | SnippetStylesheet) {
		switch (ss.type) {
			case 'obsidian':
				this.callouts.builtin.set([]);
				return;

			case 'theme':
				this.callouts.theme.delete();
				return;

			case 'snippet':
				this.callouts.snippets.delete(ss.snippet);
				return;
		}
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
	public newApiHandle(version: 'v1', consumerPlugin: Plugin | undefined, cleanupFunc: () => void): CalloutManager {
		if (version !== 'v1') throw new Error(`Unsupported Callout Manager API: ${version}`);
		if (consumerPlugin == null) {
			return new CalloutManagerAPI_V1(this, undefined);
		}

		const existing = this.apiHandles.get(consumerPlugin);
		if (existing != null) {
			return existing;
		}

		// Register the provided clean-up function on the consumer plugin.
		// When the consumer plugin unloads, the cleanup function will call `destroyApiHandle`.
		consumerPlugin.register(cleanupFunc);

		// Create a new handle.
		const handle = new CalloutManagerAPI_V1(this, consumerPlugin);
		this.apiHandles.set(consumerPlugin, handle);
		return handle;
	}

	public destroyApiHandle(version: 'v1', consumerPlugin: Plugin) {
		if (version !== 'v1') throw new Error(`Unsupported Callout Manager API: ${version}`);

		const handle = this.apiHandles.get(consumerPlugin);
		if (handle == null) return;

		handle.destroy();
		this.apiHandles.delete(consumerPlugin);
	}

	public emitApiEventChange(callout?: CalloutID): void {
		for (const handle of this.apiHandles.values()) {
			handle._emit('change');
		}
	}
}
