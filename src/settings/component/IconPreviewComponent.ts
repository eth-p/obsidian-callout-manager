import { Component, getIcon } from 'obsidian';

/**
 * A preview of an icon.
 *
 * This is a button that shows the icon graphic and its name.
 */
export class IconPreviewComponent extends Component {
	public readonly componentEl: HTMLElement;
	public readonly iconEl: HTMLElement;
	public readonly idEl: HTMLElement;

	public constructor(containerEl: HTMLElement) {
		super();
		this.componentEl = containerEl.createEl('button', { cls: 'calloutmanager-icon-preview' });
		this.iconEl = this.componentEl.createDiv({ cls: 'calloutmanager-icon-preview--icon' });
		this.idEl = this.componentEl.createDiv({ cls: 'calloutmanager-icon-preview--id' });
	}

	/**
	 * Sets the icon of the icon preview component.
	 * This will update the label and the icon SVG.
	 *
	 * @param icon The icon name.
	 * @returns This, for chaining.
	 */
	public setIcon(icon: string): typeof this {
		const iconSvg = getIcon(icon);

		this.componentEl.setAttribute('data-icon-id', icon);
		this.idEl.textContent = icon;
		this.iconEl.empty();
		if (iconSvg != null) {
			this.iconEl.appendChild(iconSvg);
		}

		return this;
	}

	/**
	 * Sets the `click` event listener for the component.
	 *
	 * @param listener The listener.
	 * @returns This, for chaining.
	 */
	public onClick(listener: (evt: MouseEvent) => void): typeof this {
		this.componentEl.onclick = listener;
		return this;
	}
}

declare const STYLES: `
	:root {
		--calloutmanager-icon-preview-icon-size: 1em;
		--calloutmanager-icon-preview-id-size: 0.8em;
	}

	.calloutmanager-icon-preview {
		position: relative;
		height: unset;
		min-height: 3em;

		display: flex;
		flex-direction: column;
	}

	.calloutmanager-icon-preview--icon {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, calc(-50% - 0.5em));

		--icon-size: var(--calloutmanager-icon-picker-icon-size);
	}

	.calloutmanager-icon-preview--id {
		width: 100%;
		margin-top: auto;

		// Break words.
		white-space: normal;
		word-break: break-word;
		hyphens: manual;

		font-size: var(--calloutmanager-icon-picker-id-size);
	}
`;
