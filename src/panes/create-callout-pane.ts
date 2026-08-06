import { Setting, TextComponent } from 'obsidian';

import CalloutManagerPlugin from '&plugin';

import { UIPane } from '&ui/pane';

import { ValiditySet } from '../util/validity-set';

import { EditCalloutPane } from './edit-callout-pane';

export class CreateCalloutPane extends UIPane {
	public readonly title = { title: 'Callouts', subtitle: 'New Callout' };
	private readonly plugin: CalloutManagerPlugin;

	private btnCreate: HTMLButtonElement;
	private fieldId: Setting;
	private fieldIdComponent!: TextComponent;
	private validity: ValiditySet;

	public constructor(plugin: CalloutManagerPlugin) {
		super();
		this.plugin = plugin;
		this.validity = new ValiditySet(ValiditySet.AllValid);

		const btnCreate = (this.btnCreate = document.createElement('button'));
		btnCreate.textContent = 'Create';
		btnCreate.addEventListener('click', (evt) => {
			if (!this.validity.valid) {
				return;
			}

			const id = this.fieldIdComponent.getValue();
			this.plugin.createCustomCallout(id);
			this.nav.replace(new EditCalloutPane(this.plugin, id, false));
		});

		this.fieldId = new Setting(document.createElement('div'))
			.setHeading()
			.setName('Callout Name')
			.setDesc('This is how you will refer to your callout in Markdown.')
			.addText((cmp) => {
				this.fieldIdComponent = cmp;
				cmp.setPlaceholder('my-awesome-callout');

				makeTextComponentValidateCalloutID(cmp, 'id', this.validity);
			});

		this.validity.onChange((valid) => {
			this.btnCreate.disabled = !valid;
		});
	}

	/** @override */
	public display(): void {
		const { containerEl } = this;

		containerEl.appendChild(this.fieldId.settingEl);
		containerEl.createDiv().appendChild(this.btnCreate);
	}
}

export function makeTextComponentValidateCalloutID(cmp: TextComponent, id: string, vs: ValiditySet): void {
	cmp.then(({ inputEl }) => {
		const update = vs.addSource(id);

		inputEl.setAttribute('pattern', '^[\p{L}\p{M}\\-]+$');
		inputEl.setAttribute('required', 'required');
		inputEl.addEventListener('change', onChange);
		inputEl.addEventListener('input', onChange);

		update(inputEl.validity.valid);
		function onChange() {
			update(inputEl.validity.valid);
		}
	});
}
