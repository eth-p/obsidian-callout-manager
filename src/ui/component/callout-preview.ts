import { Component, getIcon } from 'obsidian';
import { CalloutID } from 'obsidian-callout-manager';

import { RGB } from '&color';

const NO_ATTACH = Symbol();

export interface PreviewOptions {
	/**
	 * The callout ID.
	 */
	id: CalloutID;

	/**
	 * The icon to display in the callout.
	 * This should be known in advance.
	 */
	icon: string;

	/**
	 * The color of the callout.
	 */
	color?: RGB;

	/**
	 * The title to show.
	 * The callout ID will be used if this is omitted.
	 */
	title?: HTMLElement | DocumentFragment | string | ((titleEl: HTMLElement) => unknown);

	/**
	 * The content to show.
	 */
	content?: HTMLElement | DocumentFragment | string | ((contentEl: HTMLElement) => unknown);
}

/**
 * A component that displays a preview of a callout.
 */
export class CalloutPreviewComponent extends Component {
	public readonly calloutEl: HTMLElement;
	public readonly contentEl: HTMLElement | undefined;
	public readonly titleEl: HTMLElement;
	public readonly iconEl: HTMLElement;

	public constructor(containerEl: HTMLElement | typeof NO_ATTACH, options: PreviewOptions) {
		super();
		const { color, icon, id, title, content } = options;

		const frag = document.createDocumentFragment();

		// Build the callout.
		const calloutEl = (this.calloutEl = frag.createDiv({ cls: ['callout', 'callout-manager-preview'] }));
		const titleElContainer = calloutEl.createDiv({ cls: 'callout-title' });
		this.iconEl = titleElContainer.createDiv({ cls: 'callout-icon' });
		const titleEl = (this.titleEl = titleElContainer.createDiv({ cls: 'callout-title-inner' }));
		const contentEl = (this.contentEl =
			content === undefined ? undefined : calloutEl.createDiv({ cls: 'callout-content' }));

		this.setIcon(icon);
		this.setColor(color);
		this.setCalloutID(id);

		// Set the callout title.
		if (title == null) titleEl.textContent = id;
		else if (typeof title === 'function') title(titleEl);
		else if (typeof title === 'string') titleEl.textContent = title;
		else titleEl.appendChild(title);

		// Set the callout contents.
		if (contentEl != null) {
			if (typeof content === 'function') content(contentEl);
			else if (typeof content === 'string') contentEl.textContent = content;
			else contentEl.appendChild(content as HTMLElement | DocumentFragment);
		}

		// Attach to the container.
		if (containerEl != NO_ATTACH) {
			CalloutPreviewComponent.prototype.attachTo.call(this, containerEl);
		}
	}

	/**
	 * Changes the callout ID.
	 * This will *not* change the appearance of the preview.
	 *
	 * @param id The new ID to use.
	 */
	public setCalloutID(id: string): typeof this {
		const { calloutEl } = this;
		calloutEl.setAttribute('data-callout', id);
		return this;
	}

	/**
	 * Changes the callout icon.
	 *
	 * @param icon The ID of the new icon to use.
	 */
	public setIcon(icon: string): typeof this {
		const { iconEl, calloutEl } = this;

		// Change the icon style variable.
		calloutEl.style.setProperty('--callout-icon', icon);

		// Clear the icon element and append the SVG.
		iconEl.empty();
		const iconSvg = getIcon(icon);
		if (iconSvg != null) {
			this.iconEl.appendChild(iconSvg);
		}

		return this;
	}

	/**
	 * Changes the callout color.
	 *
	 * @param color The color to use.
	 */
	public setColor(color: RGB | undefined): typeof this {
		const { calloutEl } = this;

		if (color == null) {
			calloutEl.style.removeProperty('--callout-color');
			return this;
		}

		calloutEl.style.setProperty('--callout-color', `${color.r}, ${color.g}, ${color.b}`);
		return this;
	}

	/**
	 * Attaches the callout preview to a DOM element.
	 * This places it at the end of the element.
	 *
	 * @param containerEl The container to attach to.
	 */
	public attachTo(containerEl: HTMLElement): typeof this {
		containerEl.appendChild(this.calloutEl);
		return this;
	}

	/**
	 * Resets the `--callout-color` and `--callout-icon` CSS properties added to the callout element.
	 */
	public resetStylePropertyOverrides() {
		const { calloutEl } = this;
		calloutEl.style.removeProperty('--callout-color');
		calloutEl.style.removeProperty('--callout-icon');
	}
}

export interface IsolatedPreviewOptions extends PreviewOptions {
	colorScheme: 'dark' | 'light';

	focused?: boolean;
	viewType?: 'source' | 'reading';
	cssEls?: (HTMLStyleElement | HTMLLinkElement)[];
}

/**
 * An isolated callout preview.
 *
 * This uses the Shadow DOM to create a full DOM for the callout, and allows for custom styles to be used.
 */
export class IsolatedCalloutPreviewComponent extends CalloutPreviewComponent {
	protected readonly styleEls: HTMLStyleElement[];
	protected readonly shadowBody: HTMLBodyElement;
	protected readonly shadowHead: HTMLHeadElement;
	protected readonly shadowHostEl: HTMLElement;
	protected readonly shadowRoot: ShadowRoot;

	public readonly customStyleEl: HTMLStyleElement;

	public constructor(containerEl: HTMLElement, options: IsolatedPreviewOptions) {
		super(NO_ATTACH, options);

		const frag = document.createDocumentFragment();
		const focused = options.focused ?? false;
		const colorScheme = options.colorScheme;
		const readingView = (options.viewType ?? 'reading') === 'reading';
		const cssEls = options?.cssEls ?? getCurrentStyles(containerEl?.doc);

		// Create a shadow dom.
		const shadowHostEl = (this.shadowHostEl = frag.createDiv());
		const shadowRoot = (this.shadowRoot = shadowHostEl.attachShadow({ delegatesFocus: false, mode: 'closed' }));
		const shadowHead = (this.shadowHead = shadowRoot.createEl('head'));
		const shadowBody = (this.shadowBody = shadowRoot.createEl('body'));

		// Copy the styles into the shadow head.
		const styleEls = (this.styleEls = [] as HTMLStyleElement[]);
		for (const cssEl of cssEls) {
			const cssElClone = cssEl.cloneNode(true);
			if (cssEl.tagName === 'STYLE') {
				styleEls.push(cssElClone as HTMLStyleElement);
			}

			shadowHead.appendChild(cssElClone);
		}

		// Add styles to reset all properties on everything above the callout.
		//
		// This is so we can keep the selectors consistent between real Obsidian and our fake one, without
		// having those elements affect the display of the callout itself.
		shadowHead.createEl('style', { text: SHADOW_DOM_RESET_STYLES });

		// Add a custom style element.
		this.customStyleEl = shadowHead.createEl('style', { attr: { 'data-custom-styles': 'true' } });

		// Create a fake DOM tree inside the shadow body to host the callout.
		shadowBody.classList.add(`theme-${colorScheme}`, 'obsidian-app');
		const viewContentEl = shadowBody
			.createDiv({ cls: 'app-container' })
			.createDiv({ cls: 'horizontal-main-container' })
			.createDiv({ cls: 'workspace' })
			.createDiv({ cls: 'workspace-split mod-root' })
			.createDiv({ cls: `workspace-tabs ${focused ? 'mod-active' : ''}` })
			.createDiv({ cls: 'workspace-tab-container' })
			.createDiv({ cls: `workspace-leaf ${focused ? 'mod-active' : ''}` })
			.createDiv({ cls: 'workspace-leaf-content' })
			.createDiv({ cls: 'view-content' });

		const calloutParentEl = readingView
			? createReadingViewContainer(viewContentEl)
			: createLiveViewContainer(viewContentEl);

		calloutParentEl.appendChild(this.calloutEl);

		// Attach to the container.
		if (containerEl != null) {
			IsolatedCalloutPreviewComponent.prototype.attachTo.call(this, containerEl);
		}
	}

	/**
	 * Replaces the `<style>` elements used by the isolated callout preview with the latest ones.
	 */
	public updateStyles(): typeof this {
		return this.updateStylesWith(
			getCurrentStyles(this.shadowHostEl.doc)
				.filter((e) => e.tagName === 'STYLE')
				.map((e) => e.cloneNode(true) as HTMLStyleElement),
		);
	}

	/**
	 * Replaces the `<style>` elements used by the isolated callout preview.
	 * This can be used to update the preview with the latest styles.
	 *
	 * @param styleEls The new style elements to use. These will *not* be cloned.
	 */
	public updateStylesWith(styleEls: HTMLStyleElement[]): typeof this {
		const { styleEls: oldStyleEls, customStyleEl } = this;

		// Replace the styles.
		let i, end;
		let lastNode = customStyleEl.previousSibling as HTMLElement;
		for (i = 0, end = Math.min(styleEls.length, oldStyleEls.length); i < end; i++) {
			const el = styleEls[i];
			oldStyleEls[i].replaceWith(el);
			lastNode = el;
		}

		// Add styles that didn't have anywhere to go.
		for (end = styleEls.length; i < end; i++) {
			const el = styleEls[i];
			lastNode.insertAdjacentElement('afterend', el);
			oldStyleEls.push(el);
		}

		// Remove extra styles.
		const toRemove = oldStyleEls.splice(i, oldStyleEls.length - i);
		for (const node of toRemove) {
			node.remove();
		}

		return this;
	}

	/**
	 * Removes matching style elements.
	 * @param predicate The predicate function. If it returns true, the element is removed.
	 */
	public removeStyles(predicate: (el: HTMLStyleElement) => boolean) {
		for (let i = 0; i < this.styleEls.length; i++) {
			const el = this.styleEls[i];
			if (predicate(el)) {
				el.remove();
				this.styleEls.splice(i, 1);
				i--;
			}
		}
	}

	/**
	 * Changes the color scheme.
	 * @param colorScheme The color scheme to use.
	 */
	public setColorScheme(colorScheme: 'dark' | 'light'): typeof this {
		const { classList } = this.shadowBody;
		classList.toggle('theme-dark', colorScheme === 'dark');
		classList.toggle('theme-light', colorScheme === 'light');
		return this;
	}

	/**
	 * Attaches the callout preview to a DOM element.
	 * This places it at the end of the element.
	 *
	 * @param containerEl The container to attach to.
	 * @override
	 */
	public attachTo(containerEl: HTMLElement): typeof this {
		containerEl.appendChild(this.shadowHostEl);
		return this;
	}
}

/**
 * Gets the currently-applied Obsidian stylesheets and styles.
 *
 * @param doc The document to take the styles from.
 * @returns An array of **uncloned** `style` and `link` nodes.
 */
function getCurrentStyles(doc?: Document): Array<HTMLStyleElement | HTMLLinkElement> {
	const els: Array<HTMLStyleElement | HTMLLinkElement> = [];
	let node = (doc ?? window.document).head.firstElementChild;
	for (; node != null; node = node.nextElementSibling) {
		const nodeTag = node.tagName;
		if (nodeTag === 'STYLE' || (nodeTag === 'LINK' && node.getAttribute('rel')?.toLowerCase() === 'stylesheet')) {
			els.push(node as HTMLStyleElement | HTMLLinkElement);
		}
	}
	return els;
}

/**
 * Creates a DOM representation of the Obsidian reading view.
 * A callout placed within the returned container will act as though it is inside a Markdown document's reading view.
 *
 * @param viewContentEl The `.view-content` container element.
 * @returns A container to attach a callout to.
 */
function createReadingViewContainer(viewContentEl: HTMLDivElement): HTMLDivElement {
	// div.markdown-reading-view div.markdown-preview-vie.markdown-rendered .markdown-preview-section
	// div div.callout[data-callout]
	return viewContentEl
		.createDiv({ cls: 'markdown-reading-view' })
		.createDiv({ cls: 'markdown-preview-view markdown-rendered' })
		.createDiv({ cls: 'markdown-preview-section' })
		.createDiv();
}

/**
 * Creates a DOM representation of the Obsidian live editor view.
 * A callout placed within the returned container will act as though it is inside a Markdown document's CodeMirror editor.
 *
 * @param viewContentEl The `.view-content` container element.
 * @returns A container to attach a callout to.
 */
function createLiveViewContainer(viewContentEl: HTMLDivElement): HTMLDivElement {
	// div.markdown-source-view.cm-s-obsidian.mod-cm6.is-live-preview div.cm-editor.ͼ1.ͼ2.ͼq div.cm-scroller
	// div.cm-sizer div.cm-contentContainer div.cm-content div.cm-embed-block.markdown-rendered.cm-callout
	return viewContentEl
		.createDiv({ cls: 'markdown-source-view cm-s-obsidian mod-cm6 is-live-preview' })
		.createDiv({ cls: 'cm-editor ͼ1 ͼ2 ͼq' })
		.createDiv({ cls: 'cm-scroller' })
		.createDiv({ cls: 'cm-sizer' })
		.createDiv({ cls: 'cm-contentContainer' })
		.createDiv({ cls: 'cm-content' })
		.createDiv({ cls: 'cm-embed-block markdown-rendered cm-callout' });
}

// ---------------------------------------------------------------------------------------------------------------------
// Styles:
// ---------------------------------------------------------------------------------------------------------------------

declare const STYLES: `
	// Reset the blend mode of the preview.
	// The rendering of the callouts will be broken unless this is reset.
	.callout.callout-manager-preview {
		mix-blend-mode: unset !important;
		margin: 0 !important;
	}

	.callout-manager-preview-container {
		margin-top: 0.5em;
		margin-bottom: 0.5em;
	}
`;

const SHADOW_DOM_RESET_STYLES = `
/* Reset layout and stylings for all properties up to the callout. */
.app-container,
.horizontal-main-container,
.workspace,
.workspace-split,
.workspace-tabs,
.workspace-tab-container,
.workspace-leaf,
.workspace-leaf-content,
.view-content,
.markdown-reading-view,
.markdown-source-view,
.cm-editor.ͼ1.ͼ2.ͼq,
.cm-editor.ͼ1.ͼ2.ͼq > .cm-scroller,
.cm-sizer,
.cm-contentContainer,
.cm-content,
.markdown-preview-view {
	all: initial !important;
	display: block !important;
}

/* Set the text color of the container for the callout. */
.markdown-preview-section,
.cm-callout {
	color: var(--text-normal) !important;
}

/* Override margin on callout to keep the preview as small as possible. */
.markdown-preview-section > div > .callout,
.cm-callout > .callout,
.callout-manager-preview.callout {
	margin: 0 !important;
}

/* Set the font properties of the callout. */
.cm-callout,
.callout {
	font-size: var(--font-text-size) !important;
	font-family: var(--font-text) !important;
	line-height: var(--line-height-normal) !important;
}

/* Use transparent background color. */
body {
	background-color: transparent !important;
}
`;
