import { getCurrentColorScheme } from 'obsidian-extra';

import { RGB, parseColorRGB } from '&color';
import { IsolatedCalloutPreviewComponent } from '&ui/component/callout-preview';

import { Callout, CalloutID } from '../api';

/**
 * A class that fetches style information for callouts.
 * This keeps a Shadow DOM within the page document and uses getComputedStyles to get CSS variables.
 */
export class CalloutResolver {
	private readonly hostElement: HTMLElement;
	private readonly calloutPreview: IsolatedCalloutPreviewComponent;

	public constructor() {
		this.hostElement = document.body.createDiv({
			cls: 'callout-manager-callout-resolver',
		});

		this.hostElement.style.setProperty('display', 'none', 'important');
		this.calloutPreview = new IsolatedCalloutPreviewComponent(this.hostElement, {
			id: '',
			icon: '',
			colorScheme: 'dark',
		});

		this.calloutPreview.resetStylePropertyOverrides();
	}

	/**
	 * Reloads the styles of the callout resolver.
	 * This is necessary to get up-to-date styles when the application CSS changes.
	 *
	 * Note: This will not reload the Obsidian app.css stylesheet.
	 * @param styles The new style elements to use.
	 */
	public reloadStyles(): void {
		this.calloutPreview.setColorScheme(getCurrentColorScheme(app));
		this.calloutPreview.updateStyles();
		this.calloutPreview.removeStyles((el) => el.getAttribute('data-inject-id') === 'callout-settings');
	}

	/**
	 * Removes the host element.
	 * This should be called when the plugin is unloading.
	 */
	public unload() {
		this.hostElement.remove();
	}

	/**
	 * Gets the computed styles for a given type of callout.
	 * This uses the current Obsidian styles, themes, and snippets.
	 *
	 * @param id The callout ID.
	 * @param callback A callback function to run. The styles may only be accessed through this.
	 * @returns Whatever the callback function returned.
	 */
	public getCalloutStyles<T>(id: CalloutID, callback: (styles: CSSStyleDeclaration) => T): T {
		const { calloutEl } = this.calloutPreview;
		calloutEl.setAttribute('data-callout', id);

		// Run the callback.
		//   We need to use the callback to create the full set of desired return properties because
		//   window.getComputedStyle returns an object that will update itself automatically. The moment we
		//   change the host element, all the styles we want from it will be removed.
		return callback(window.getComputedStyle(calloutEl));
	}

	/**
	 * Gets the icon and color for a given type of callout.
	 * This uses the current Obsidian styles, themes, and snippets.
	 *
	 * @param id The callout ID.
	 * @returns The callout icon and color.
	 */
	public getCalloutProperties(id: CalloutID): { icon: string; color: string } {
		return this.getCalloutStyles(id, (styles) => ({
			icon: styles.getPropertyValue('--callout-icon').trim(),
			color: styles.getPropertyValue('--callout-color').trim(),
		}));
	}

	public get customStyleEl(): HTMLStyleElement {
		return this.calloutPreview.customStyleEl as HTMLStyleElement;
	}
}

/**
 * Gets the color (as a {@link RGB}) from a {@link Callout}.
 * This will try to do basic parsing on the color field.
 *
 * @param callout The callout.
 * @returns The callout's color, or null if not valid.
 */
export function getColorFromCallout(callout: Callout): RGB | null {
	return parseColorRGB(`rgb(${callout.color})`);
}
