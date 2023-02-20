import { ButtonComponent, ExtraButtonComponent, Setting, getIcon } from 'obsidian';

import { Callout } from '../../../api';
import CalloutManagerPlugin from '../../main';
import { ResetButtonComponent } from '../component/reset-button';
import { SelectIconPane } from '../../panes/select-icon-pane';
import { UIPaneNavigation } from '&ui/pane';

/**
 * An Obsidian {@link Setting} for picking the icon of a callout.
 */
export class CalloutIconSetting extends Setting {
	private readonly callout: Callout;
	private buttonComponent!: ButtonComponent;
	private resetComponent!: ExtraButtonComponent;

	private isDefault: boolean;
	private iconName: string | undefined;
	private onChanged: ((value: string | undefined) => void) | undefined;

	public constructor(
		containerEl: HTMLElement,
		callout: Callout,
		plugin: CalloutManagerPlugin,
		getNav: () => UIPaneNavigation,
	) {
		super(containerEl);
		this.onChanged = undefined;
		this.callout = callout;
		this.isDefault = true;
		this.iconName = undefined;

		// Create the setting archetype.
		this.addButton((btn) => {
			this.buttonComponent = btn;
			btn.onClick(() => {
				getNav().open(
					new SelectIconPane(plugin, 'Select Icon', { onChoose: (icon) => this.onChanged?.(icon) }),
				);
			});
		});

		this.components.push(
			new ResetButtonComponent(this.controlEl).then((btn) => {
				this.resetComponent = btn;
				btn.onClick(() => this.onChanged?.(undefined));
			}),
		);

		this.setIcon(undefined);
	}

	/**
	 * Sets the icon.
	 *
	 * @param icon The icon name or undefined to reset the color to default.
	 * @returns `this`, for chaining.
	 */
	public setIcon(icon: string | undefined): typeof this {
		const isDefault = (this.isDefault = icon == null);
		const iconName = (this.iconName = icon ?? this.callout.icon);
		const iconExists = getIcon(iconName) != null;

		// Update components.
		if (iconExists) {
			this.buttonComponent.setIcon(iconName);
		} else {
			this.buttonComponent.setButtonText(iconExists ? '' : `(missing icon: ${iconName})`);
		}

		this.resetComponent.setDisabled(isDefault).setTooltip(isDefault ? '' : 'Reset Icon');
		return this;
	}

	public getIcon(): string {
		return this.iconName ?? this.callout.icon;
	}

	public isDefaultIcon(): boolean {
		return this.isDefault;
	}

	public onChange(cb: (value: string | undefined) => void): typeof this {
		this.onChanged = cb;
		return this;
	}
}
