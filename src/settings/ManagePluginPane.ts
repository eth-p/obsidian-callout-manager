import { Setting } from 'obsidian';

import CalloutManagerPlugin from '../main';

import { CMSettingPane } from './CMSettingTab';
import { ManageCalloutsPane } from './ManageCalloutsPane';

export class ManagePluginPane extends CMSettingPane {
	public readonly title = 'Callout Manager Settings';
	private plugin: CalloutManagerPlugin;

	public constructor(plugin: CalloutManagerPlugin) {
		super();
		this.plugin = plugin;
	}

	/** @override */
	public display(): void {
		const { containerEl, plugin } = this;

		// -----------------------------------------------------------------------------------------------------
		// Navigation.
		// -----------------------------------------------------------------------------------------------------
		new Setting(containerEl)
			.setName('Manage Callouts')
			.setDesc('Create or edit Markdown callouts.')
			.addButton((btn) => {
				btn.setButtonText('Manage Callouts');
				btn.onClick(() => this.nav.open(new ManageCalloutsPane(plugin)));
			});

		// -----------------------------------------------------------------------------------------------------
		// Section: Callout Detection
		// -----------------------------------------------------------------------------------------------------
		containerEl.createEl('h2', { text: 'Callout Detection' });

		new Setting(containerEl)
			.setName('Obsidian')
			.setDesc(
				(() => {
					const desc = document.createDocumentFragment();
					const container = desc.createDiv();

					container.createDiv({
						text: plugin.settings.calloutDetection.obsidianFallbackForced
							? 'Include the built-in Obsidian callouts.'
							: 'Find built-in Obsidian callouts.',
					});

					if (
						!plugin.cssWatcher.isObsidianStylesheetSupported() &&
						!plugin.settings.calloutDetection.obsidianFallbackForced
					) {
						container.createDiv({
							cls: 'mod-warning',
							text: 'Your current platform does not support automatic detection. A fallback list will be used.',
						});
					}

					return desc;
				})(),
			)
			.addToggle((setting) => {
				setting.setValue(plugin.settings.calloutDetection.obsidian).onChange((v) => {
					plugin.settings.calloutDetection.obsidian = v;
					plugin.saveSettings();
					plugin.refreshCalloutSources();
				});
			});

		new Setting(containerEl)
			.setName('Theme')
			.setDesc('Find theme-provided callouts.')
			.addToggle((setting) => {
				setting.setValue(plugin.settings.calloutDetection.theme).onChange((v) => {
					plugin.settings.calloutDetection.theme = v;
					plugin.saveSettings();
					plugin.refreshCalloutSources();
				});
			});

		new Setting(containerEl)
			.setName('Snippet')
			.setDesc('Find callouts in custom CSS snippets.')
			.addToggle((setting) => {
				setting.setValue(plugin.settings.calloutDetection.snippet).onChange((v) => {
					plugin.settings.calloutDetection.snippet = v;
					plugin.saveSettings();
					plugin.refreshCalloutSources();
				});
			});
	}
}
