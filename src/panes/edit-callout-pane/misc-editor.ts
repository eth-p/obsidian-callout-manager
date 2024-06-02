import { EditCalloutPane } from '.';

import { Setting, TextComponent } from 'obsidian';

import { Callout } from '&callout';
import CalloutManagerPlugin from '&plugin';

import { UIPaneNavigation } from '&ui/pane';

import { ValiditySet } from '../../util/validity-set';
import { makeTextComponentValidateCalloutID } from '../create-callout-pane';

/**
 * An editor UI to change a callout's misc settings.
 */
export class MiscEditor {
	public plugin: CalloutManagerPlugin;

	public nav!: UIPaneNavigation;
	public viewOnly: boolean;
	public callout: Callout;
	public containerEl: HTMLElement;

	private renameSetting: Setting | null;

	constructor(plugin: CalloutManagerPlugin, callout: Callout, containerEl: HTMLElement, viewOnly: boolean) {
		this.plugin = plugin;
		this.callout = callout;
		this.containerEl = containerEl;
		this.viewOnly = viewOnly;

		this.renameSetting = this.createRenameSetting();
	}

	/**
	 * Renders the editors.
	 */
	public render(): void {
		this.containerEl.empty();
		if (this.viewOnly) return;

		if (this.renameSetting != null) this.containerEl.appendChild(this.renameSetting.settingEl);
	}

	protected createRenameSetting(): Setting | null {
		const { plugin, containerEl, callout } = this;
		if (callout.sources.length !== 1 || callout.sources[0].type !== 'custom') return null;

		const validity = new ValiditySet(ValiditySet.AllValid);
		const desc = document.createDocumentFragment();
		desc.createEl('p', { text: 'Change the name of this callout.' });
		desc.createEl('p', { text: 'This will not update any references in your notes!', cls: 'mod-warning' });

		let newIdComponent!: TextComponent;
		return new Setting(containerEl)
			.setName(`Rename`)
			.setDesc(desc)
			.addText((cmp) => {
				newIdComponent = cmp;
				cmp.setValue(callout.id).setPlaceholder(callout.id);

				// Ensure the ID is not already in use.
				const isUnusedId = validity.addSource('unused');
				cmp.onChange((value) => {
					const alreadyExists = plugin.callouts.has(value);
					isUnusedId(!alreadyExists);
					cmp.inputEl.classList.toggle('invalid', alreadyExists);
				});

				// Ensure the ID is valid.
				makeTextComponentValidateCalloutID(cmp, 'id', validity);
			})
			.addButton((btn) => {
				validity.onChangeUpdateDisabled(btn);
				btn.setIcon('lucide-clipboard-signature')
					.setTooltip('Rename')
					.then(({ buttonEl }) => buttonEl.classList.add('clickable-icon', 'mod-warning'))
					.onClick(() => {
						if (!validity.valid) return;
						const newId = newIdComponent.getValue();
						plugin.renameCustomCallout(callout.id, newId);
						this.nav.replace(new EditCalloutPane(plugin, newId, this.viewOnly));
					});
			});
	}
}
