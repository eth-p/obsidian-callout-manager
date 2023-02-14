import { CalloutID } from '../api';

import { createIsolatedCalloutPreview } from './callout-preview';

/**
 * A class that fetches style information for callouts.
 * This keeps a Shadow DOM within the page document and uses getComputedStyles to get CSS variables.
 */
export class CalloutResolver {
	private hostElement: HTMLElement;
	private calloutElement: HTMLElement;

	public constructor() {
		this.hostElement = document.body.createDiv({
			cls: 'callout-manager-callout-resolver',
		});

		this.hostElement.style.setProperty('display', 'none', 'important');
		this.calloutElement = createIsolatedCalloutPreview(this.hostElement.createDiv(), '').calloutEl;
	}

	/**
	 * Removes the host element.
	 * This should be called when the plugin is unloading.
	 */
	public unload() {
		this.hostElement.detach();
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
		this.calloutElement.setAttribute('data-callout', id);

		// Run the callback.
		//   We need to use the callback to create the full set of desired return properties because
		//   window.getComputedStyle returns an object that will update itself automatically. The moment we
		//   change the host element, all the styles we want from it will be removed.
		const result = callback(window.getComputedStyle(this.calloutElement));

		return result;
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
}
