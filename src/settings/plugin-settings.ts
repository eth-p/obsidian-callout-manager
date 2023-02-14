import { Setting } from 'obsidian';

import CalloutManagerPlugin from '../main';
import { Pane } from '../ui/Pane';

import { CalloutSettings } from './callout-settings';

/**
 * The settings tab (UI) that will show up under Obsidian's settings.
 *
 * This implements stacked navigation, where {@link SettingsSection}s may be stacked on top of eachother.
 */
export class PluginSettings extends Pane {
	private plugin: CalloutManagerPlugin;
	public titleEl!: HTMLElement;

	public constructor(plugin: CalloutManagerPlugin) {
		super();
		this.plugin = plugin;
	}

	public render(): void {
		this.titleEl.textContent = this.plugin.manifest.name;

		new Setting(this.contentEl)
			.setName('Manage Callouts')
			.setDesc('Create or edit Markdown callouts.')
			.addButton((btn) => {
				btn.setButtonText('Manage Callouts');
				btn.onClick(() => this.nav.open(new CalloutSettings(this.plugin)));
			});

		this.contentEl.createEl('h2', { text: 'Callout Detection' });
		new Setting(this.contentEl)
			.setName('Obsidian')
			.setDesc('Find built-in callouts.');

		new Setting(this.contentEl)
			.setName('Theme')
			.setDesc('Find theme-provided callouts.');

		new Setting(this.contentEl)
			.setName('Snippet')
			.setDesc('Find callouts in custom CSS snippets.');
	}
}
