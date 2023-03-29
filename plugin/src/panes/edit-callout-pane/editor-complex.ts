import { ButtonComponent } from 'obsidian';

import { CalloutSettings } from '&callout-settings';

import { AppearanceEditor } from './appearance-editor';
import { ComplexAppearance } from './appearance-type';

export default class ComplexAppearanceEditor extends AppearanceEditor<ComplexAppearance> {
	/** @override */
	public toSettings(): CalloutSettings {
		return this.appearance.settings;
	}

	/** @override */
	public render() {
		const { containerEl } = this;
		const { settings } = this.appearance;

		const complexJson = JSON.stringify(settings, undefined, '  ');
		containerEl.createEl('p', {
			text:
				"This callout has been configured using the plugin's data.json file. " +
				'To prevent unintentional changes to the configuration, you need to edit it manually.',
		});

		containerEl.createEl('code', { cls: 'calloutmanager-edit-callout-appearance-json' }, (el) => {
			el.createEl('pre', { text: complexJson });
		});

		containerEl.createEl('p', {
			text: 'Alternatively, you can reset the callout by clicking the button below twice.',
		});

		let resetButtonClicked = false;
		const resetButton = new ButtonComponent(containerEl)
			.setButtonText('Reset Callout')
			.setClass('calloutmanager-edit-callout-appearance-reset')
			.setWarning()
			.onClick(() => {
				if (!resetButtonClicked) {
					resetButtonClicked = true;
					resetButton.setButtonText('Are you sure?');
					return;
				}

				this.setAppearance({ type: 'unified', color: undefined, otherChanges: {} });
			});
	}
}
