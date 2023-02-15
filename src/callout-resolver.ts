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
	 * Reloads the styles of the callout resolver.
	 * This is necessary to get up-to-date styles when the application CSS changes.
	 *
	 * Note: This will not reload the Obsidian app.css stylesheet.
	 * @param styles The new style elements to use.
	 */
	public reloadStyles(styles?: HTMLStyleElement[]) {
		// If no style elements were provided, fetch them form the document head.
		if (styles === undefined) {
			styles = [];
			for (let node = window.document.head.firstElementChild; node != null; node = node.nextElementSibling) {
				if (node.tagName === 'STYLE') {
					styles.push(node as HTMLStyleElement);
				}
			}
		}

		// Get the top of the shadow DOM.
		let shadowBody = this.calloutElement.parentElement as HTMLElement;
		while (shadowBody?.parentElement != null) {
			shadowBody = shadowBody.parentElement;
		}

		// Remove all style elements in the callout's shadow DOM.
		// The first non-style element is where we should start inserting new styles.
		let prevSibling = shadowBody.previousElementSibling;
		let firstNonStyleSibling = null;
		while (prevSibling != null) {
			if (prevSibling.tagName === 'STYLE') {
				const styleSibling = prevSibling;
				prevSibling = prevSibling.previousElementSibling;
				styleSibling.detach();
				continue;
			}

			if (firstNonStyleSibling == null) {
				firstNonStyleSibling = prevSibling;
			}

			prevSibling = prevSibling.previousElementSibling;
		}

		// Add new style elements.
		prevSibling = firstNonStyleSibling;
		for (const style of styles) {
			const styleClone = style.cloneNode(true) as HTMLStyleElement;
			prevSibling?.insertAdjacentElement('afterend', styleClone);
			prevSibling = styleClone;
		}
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
