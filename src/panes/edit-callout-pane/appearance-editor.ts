import { Callout } from '&callout';
import { CalloutSettings } from '&callout-settings';
import CalloutManagerPlugin from '&plugin';

import { UIPaneNavigation } from '&ui/pane';

import { Appearance } from './appearance-type';

/**
 * An editor UI to change a callout's appearance settings.
 */
export abstract class AppearanceEditor<T extends Appearance> {
	public plugin!: CalloutManagerPlugin;

	public nav!: UIPaneNavigation;
	public callout!: Callout;
	public appearance!: T;
	public containerEl!: HTMLElement;

	/**
	 * Changes the appearance.
	 */
	public setAppearance!: (appearance: Appearance) => void;

	/**
	 * Converts the current appearance into {@link CalloutSettings}.
	 * @param appearance The appearance to convert.
	 */
	public abstract toSettings(): CalloutSettings;

	/**
	 * Renders the appearance.
	 */
	public abstract render(): void;
}
