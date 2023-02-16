import {
	// Editor,
	// MarkdownFileInfo,
	// MarkdownView,
	// Modal,
	// Notice,
	Plugin, // Setting,
} from 'obsidian';

import type { CalloutManager } from '../api';

import { CalloutManagerAPI_V1 } from './api-v1';
import { CalloutCollection } from './callout-collection';
import builtinCallouts from './callout-fallback-obsidian.json';
import { CalloutResolver } from './callout-resolver';
import { getCalloutsFromCSS } from './css-parser';
import StylesheetWatcher, { ObsidianStylesheet, SnippetStylesheet, ThemeStylesheet } from './css-watcher';
import Settings, { defaultSettings, mergeSettings } from './settings';
import { CMSettingTab } from './settings/CMSettingTab';
import { ManageCalloutsPane } from './settings/ManageCalloutsPane';
import { ManagePluginPane } from './settings/ManagePluginPane';

export default class CalloutManagerPlugin extends Plugin {
	public settings!: Settings;
	public cssWatcher!: StylesheetWatcher;
	public calloutResolver!: CalloutResolver;

	public callouts!: CalloutCollection;
	// private removeStyles: CleanupFunction;

	public settingTab!: CMSettingTab;

	/** @override */
	public async onload() {
		await this.loadSettings();
		await this.saveSettings();
		const { settings } = this;

		// Create the callout resolver.
		// This needs to be created as early as possible to ensure the Obsidian stylesheet within the shadow DOM has loaded.
		// We also register an event to ensure that it tracks any changes to the loaded styles.
		this.calloutResolver = new CalloutResolver();
		this.register(() => this.calloutResolver.unload());
		this.registerEvent(this.app.workspace.on('css-change', () => this.calloutResolver.reloadStyles()));

		// Create the callout collection.
		// Use getCalloutProperties to resolve the callout's color and icon.
		this.callouts = new CalloutCollection((id) => {
			const { icon, color } = this.calloutResolver.getCalloutProperties(id);
			return {
				id,
				icon,
				color,
			};
		});

		// Create the stylesheet watcher.
		// This will let us update the callout collection whenever any styles change.
		this.cssWatcher = new StylesheetWatcher(this.app, settings.calloutDetection.obsidianFallbackForced);
		this.cssWatcher.on('add', this.updateCalloutSource.bind(this));
		this.cssWatcher.on('change', this.updateCalloutSource.bind(this));
		this.cssWatcher.on('remove', this.removeCalloutSource.bind(this));
		this.cssWatcher.on('checkComplete', () => this.maybeRefreshCalloutBuiltinsWithFallback());
		this.app.workspace.onLayoutReady(() => {
			this.calloutResolver.reloadStyles();
			this.register(this.cssWatcher.watch());
		});

		// DEBUG: Testing
		(window as any).TEST = this;
		this.register(() => ((window as any).TEST = null));

		// Register setting tab.
		this.settingTab = new CMSettingTab(this, () => new ManagePluginPane(this));
		this.addSettingTab(this.settingTab);

		// Register modal commands.
		this.addCommand({
			id: 'manage-callouts',
			name: 'Edit callouts',
			callback: () => {
				this.settingTab.openWithPane(new ManageCalloutsPane(this));
			},
		});

		// // This creates an icon in the left ribbon.
		// const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
		// 	// Called when the user clicks the icon.
		// 	new Notice('This is a notice!');
		// });
		// // Perform additional things with the ribbon
		// ribbonIconEl.addClass('my-plugin-ribbon-class');

		// // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		// const statusBarItemEl = this.addStatusBarItem();
		// statusBarItemEl.setText('Status Bar Text');

		// // This adds a simple command that can be triggered anywhere

		// // This adds an editor command that can perform some operation on the current editor instance
		// this.addCommand({
		// 	id: 'sample-editor-command',
		// 	name: 'Sample editor command',
		// 	editorCallback: (editor: Editor, view: MarkdownView | MarkdownFileInfo) => {
		// 		console.log(editor.getSelection());
		// 		editor.replaceSelection('Sample Editor Command');
		// 	},
		// });
		// // This adds a complex command that can check whether the current state of the app allows execution of the command
		// this.addCommand({
		// 	id: 'open-sample-modal-complex',
		// 	name: 'Open sample modal (complex)',
		// 	checkCallback: (checking: boolean) => {
		// 		// Conditions to check
		// 		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		// 		if (markdownView) {
		// 			// If checking is true, we're simply "checking" if the command can be run.
		// 			// If checking is false, then we want to actually perform the operation.
		// 			if (!checking) {
		// 				new SampleModal(this.app).open();
		// 			}

		// 			// This command will only show up in Command Palette when the check function returns true
		// 			return true;
		// 		}
		// 	},
		// });

		// // This adds a settings tab so the user can configure various aspects of the plugin
		// this.addSettingTab(new SampleSettingTab(this.app, this));

		// // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// // Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
		// 	console.log('click', evt);
		// });

		// // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	/** @override */
	public onunload() {}

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
	 * Creates an instance of the Callout Manager API for a plugin.
	 * If the plugin is undefined, only trivial functions are available.
	 *
	 * @param version The API version.
	 * @param consumerPlugin The plugin using the API.
	 *
	 * @internal
	 */
	public newApiHandle(version: 'v1', consumerPlugin: Plugin | undefined): CalloutManager {
		return new CalloutManagerAPI_V1();
	}
}
