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
		const { containerEl } = this;
		new Setting(containerEl)
			.setName('Manage Callouts')
			.setDesc('Create or edit Markdown callouts.')
			.addButton((btn) => {
				btn.setButtonText('Manage Callouts');
				btn.onClick(() => this.nav.open(new ManageCalloutsPane(this.plugin)));
			});

		containerEl.createEl('h2', { text: 'Callout Detection' });
		new Setting(containerEl).setName('Obsidian').setDesc('Find built-in callouts.');
		new Setting(containerEl).setName('Theme').setDesc('Find theme-provided callouts.');
		new Setting(containerEl).setName('Snippet').setDesc('Find callouts in custom CSS snippets.');
	}
}
