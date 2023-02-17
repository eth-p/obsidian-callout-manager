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
}
