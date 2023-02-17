import { RGB } from 'color-convert/conversions';

import { Callout, CalloutID } from '../api';

import { IsolatedCalloutPreview, createIsolatedCalloutPreview } from './callout-preview';
import { parseColorRGB } from './util/color-parse';

/**
 * A class that fetches style information for callouts.
 * This keeps a Shadow DOM within the page document and uses getComputedStyles to get CSS variables.
 */
export class CalloutResolver {
	private hostElement: HTMLElement;
	private calloutPreview: IsolatedCalloutPreview<false>;

	public constructor() {
		this.hostElement = document.body.createDiv({
			cls: 'callout-manager-callout-resolver',
		});

		this.hostElement.style.setProperty('display', 'none', 'important');
		this.calloutPreview = createIsolatedCalloutPreview(this.hostElement.createDiv(), '');
	}

	/**
	 * Reloads the styles of the callout resolver.
	 * This is necessary to get up-to-date styles when the application CSS changes.
	 *
	 * Note: This will not reload the Obsidian app.css stylesheet.
	 * @param styles The new style elements to use.
	 */
	public reloadStyles(styles?: HTMLStyleElement[]) {
		const { providedStyleEls, customStyleEl } = this.calloutPreview;

		// If no style elements were provided, fetch them form the document head.
		if (styles === undefined) {
			styles = [];
			for (let node = window.document.head.firstElementChild; node != null; node = node.nextElementSibling) {
				if (node.tagName === 'STYLE') {
					styles.push(node as HTMLStyleElement);
				}
			}
		}

		// Replace the styles.
		let i, end;
		let lastNode = customStyleEl.previousSibling as HTMLElement;
		for (i = 0, end = Math.min(styles.length, providedStyleEls.length); i < end; i++) {
			const clone = styles[i].cloneNode(true) as HTMLStyleElement;
			providedStyleEls[i].replaceWith(clone);
			providedStyleEls[i] = clone;
			lastNode = clone;
		}

		// Add styles that didn't have anywhere to go.
		for (end = styles.length; i < end; i++) {
			const clone = styles[i].cloneNode(true) as HTMLStyleElement;
			lastNode.insertAdjacentElement('afterend', clone);
			providedStyleEls.push(clone);
		}

		// Remove extra styles.
		const toRemove = providedStyleEls.splice(i, providedStyleEls.length);
		for (const node of toRemove) {
			node.remove();
		}
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
		const result = callback(window.getComputedStyle(calloutEl));

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
