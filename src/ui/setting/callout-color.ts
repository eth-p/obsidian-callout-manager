import { ColorComponent, ExtraButtonComponent, Setting } from 'obsidian';

import { RGB, parseColorRGB } from '&color';
import { Callout } from '&callout';

import { ResetButtonComponent } from '&ui/component/reset-button';

import { getColorFromCallout } from '../../callout-resolver';

/**
 * An Obsidian {@link Setting} for picking the color of a callout.
 */
export class CalloutColorSetting extends Setting {
	private readonly callout: Callout;
	private colorComponent!: ColorComponent;
	private resetComponent!: ExtraButtonComponent;

	private isDefault: boolean;
	private onChanged: ((value: string | undefined) => void) | undefined;

	public constructor(containerEl: HTMLElement, callout: Callout) {
		super(containerEl);
		this.onChanged = undefined;
		this.callout = callout;
		this.isDefault = true;

		// Create the setting archetype.
		this.addColorPicker((picker) => {
			this.colorComponent = picker;
			picker.onChange(() => {
				const { r, g, b } = this.getColor();
				this.onChanged?.(`${r}, ${g}, ${b}`);
			});
		});

		this.components.push(
			new ResetButtonComponent(this.controlEl).then((btn) => {
				this.resetComponent = btn;
				btn.onClick(() => this.onChanged?.(undefined));
			}),
		);

		this.setColor(undefined);
	}

	/**
	 * Sets the color string.
	 * This only accepts comma-delimited RGB values.
	 *
	 * @param color The color (e.g. `255, 10, 25`) or undefined to reset the color to default.
	 * @returns `this`, for chaining.
	 */
	public setColorString(color: string | undefined): typeof this {
		if (color == null) {
			return this.setColor(undefined);
		}

		return this.setColor(parseColorRGB(`rgb(${color})`) ?? { r: 0, g: 0, b: 0 });
	}

	/**
	 * Sets the color.
	 *
	 * @param color The color or undefined to reset the color to default.
	 * @returns `this`, for chaining.
	 */
	public setColor(color: RGB | undefined): typeof this {
		const isDefault = (this.isDefault = color == null);
		if (color == null) {
			color = getColorFromCallout(this.callout) ?? { r: 0, g: 0, b: 0 };
		}

		// Convert color to Obsidian RGB format.
		if (color instanceof Array) {
			color = { r: color[0], g: color[1], b: color[2] };
		}

		// Update components.
		this.colorComponent.setValueRgb(color);
		this.resetComponent.setDisabled(isDefault).setTooltip(isDefault ? '' : 'Reset Color');

		return this;
	}

	public getColor(): RGB {
		return this.colorComponent.getValueRgb();
	}

	public isDefaultColor(): boolean {
		return this.isDefault;
	}

	public onChange(cb: (value: string | undefined) => void): typeof this {
		this.onChanged = cb;
		return this;
	}
}
