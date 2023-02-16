import { Setting } from 'obsidian';

import CalloutManagerPlugin from '../main';

import { CMSettingPane } from './CMSettingTab';
import { EditCalloutPane } from './EditCalloutPane';

export class CreateCalloutPane extends CMSettingPane {
	public readonly title = { title: 'Callouts', subtitle: 'New Callout' };
	private readonly plugin: CalloutManagerPlugin;

	private btnCreate: HTMLButtonElement;
	private fieldId: Setting;
	private fieldIdEl!: HTMLInputElement;

	public constructor(plugin: CalloutManagerPlugin) {
		super();
		this.plugin = plugin;

		const btnCreate = (this.btnCreate = document.createElement('button'));
		btnCreate.textContent = 'Create';
		btnCreate.addEventListener('click', (evt) => {
			if (!this.areInputsValid()) {
				return;
			}

			const id = this.fieldIdEl.value;
			this.plugin.createCustomCallout(id);
			this.nav.replace(new EditCalloutPane(this.plugin, id, false));
		});

		this.fieldId = new Setting(document.createElement('div'))
			.setHeading()
			.setName('Callout Name')
			.setDesc('This is how you will refer to your callout in Markdown.')
			.addText((cmp) => {
				cmp.setPlaceholder('my-awesome-callout')
					.onChange(() => this.validateInputs())
					.then(({ inputEl }) => (this.fieldIdEl = inputEl))
					.then(({ inputEl }) => inputEl.setAttribute('pattern', '[a-z-]{1,}'))
					.then(({ inputEl }) => inputEl.setAttribute('required', 'required'));
			});

		this.validateInputs();
	}

	protected validateInputs() {
		this.btnCreate.disabled = !this.areInputsValid();
	}

	protected areInputsValid() {
		if (!this.fieldIdEl.validity.valid) return false;
		return true;
	}

	/** @override */
	public display(): void {
		const { containerEl } = this;

		containerEl.appendChild(this.fieldId.settingEl);
		containerEl.createDiv().appendChild(this.btnCreate);
	}
}
