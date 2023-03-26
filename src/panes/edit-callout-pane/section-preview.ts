import { Component, MarkdownRenderer, TextAreaComponent, getIcon } from 'obsidian';
import { getCurrentColorScheme } from 'obsidian-extra';

import { Callout } from '&callout';
import { CalloutSettings, calloutSettingsToCSS, currentCalloutEnvironment } from '&callout-settings';
import { getTitleFromCallout } from '&callout-util';
import CalloutManagerPlugin from '&plugin';

import { IsolatedCalloutPreviewComponent } from '&ui/component/callout-preview';

/**
 * A callout preview for the edit callout pane.
 *
 * This allows the preview text to be edited.
 */
export class EditCalloutPanePreview {
	public readonly preview: IsolatedCalloutPreviewComponent;

	private readonly plugin: CalloutManagerPlugin;
	private readonly sectionEl: HTMLElement;
	private readonly calloutId: string;

	private previewMarkdown = 'Lorem ipsum dolor sit amet.';
	private previewEditorEl: HTMLTextAreaElement | null = null;

	private calloutHasIconReady: boolean;

	public constructor(plugin: CalloutManagerPlugin, callout: Callout, viewOnly: boolean) {
		this.calloutHasIconReady = false;
		this.calloutId = callout.id;
		this.plugin = plugin;

		// Create the callout preview.
		const frag = document.createDocumentFragment();
		this.sectionEl = frag.createDiv({
			cls: ['calloutmanager-preview-container', 'calloutmanager-edit-callout-preview'],
		});

		this.preview = new IsolatedCalloutPreviewComponent(this.sectionEl, {
			id: callout.id,
			title: getTitleFromCallout(callout),
			icon: callout.icon,
			colorScheme: getCurrentColorScheme(plugin.app),
			content: (containerEl) => {
				containerEl.createEl('p', { text: this.previewMarkdown });
			},
		});

		// Make the preview editable.
		if (!viewOnly) {
			this.makeEditable();
		}
	}

	private makeEditable(): void {
		const contentEl = this.preview.contentEl as HTMLElement;

		// Add a click handler to change the preview.
		this.previewEditorEl = null;
		this.preview.calloutEl.addEventListener('click', () => {
			if (this.previewEditorEl != null) {
				return;
			}

			const height = contentEl.getBoundingClientRect().height;
			contentEl.empty();
			new TextAreaComponent(contentEl)
				.setValue(this.previewMarkdown)
				.setPlaceholder('Preview Markdown...')
				.then((c) => {
					const inputEl = (this.previewEditorEl = c.inputEl);
					inputEl.style.setProperty('height', `${height}px`);
					inputEl.classList.add('calloutmanager-preview-editor');
					inputEl.focus();
					inputEl.addEventListener('blur', () => {
						const value = c.getValue();
						this.previewEditorEl = null;
						this.previewMarkdown = value;
						this.changeContent(value);
					});
				});
		});
	}

	/**
	 * Refreshes the callout preview's icon.
	 * We need to do this after the preview is attached to DOM, as we can't get the correct icon until that happens.
	 */
	protected refreshPreviewIcon(): void {
		const { iconEl, calloutEl } = this.preview;

		if (window.document.contains(this.sectionEl)) {
			const icon = window.getComputedStyle(calloutEl).getPropertyValue('--callout-icon').trim();
			const iconSvg = getIcon(icon) ?? document.createElement('svg');

			iconEl.empty();
			iconEl.appendChild(iconSvg);

			this.calloutHasIconReady = true;
		}
	}

	/**
	 * Changes the preview that is displayed inside the callout.
	 *
	 * @param markdown The markdown to render.
	 */
	public async changeContent(markdown: string): Promise<void> {
		const contentEl = this.preview.contentEl as HTMLElement;
		contentEl.empty();

		try {
			await MarkdownRenderer.renderMarkdown(markdown, contentEl, '', undefined as unknown as Component);
		} catch (ex) {
			contentEl.createEl('code').createEl('pre', { text: markdown });
		}
	}

	/**
	 * Changes the settings for the callout.
	 * This can be used to show the customized callout.
	 *
	 * @param settings The settings to use.
	 */
	public async changeSettings(settings: CalloutSettings): Promise<void> {
		const { preview } = this;
		const styles = calloutSettingsToCSS(this.calloutId, settings, currentCalloutEnvironment(this.plugin.app));

		// Update the custom stylesheet of the callout preview.
		preview.customStyleEl.textContent = styles;
		preview.resetStylePropertyOverrides();
		preview.removeStyles((el) => el.getAttribute('data-callout-manager') === 'style-overrides');

		this.calloutHasIconReady = false;

		// Remove the preview styles added by callout manager.
		// Now that we changed the settings, having the old styles would lead to inconsistency.
		preview.removeStyles((el) => el.getAttribute('data-inject-id') === 'callout-settings');
	}

	/**
	 * Attaches the preview to a container.
	 * @param containerEl The container element.
	 */
	public attach(containerEl: HTMLElement) {
		containerEl.appendChild(this.sectionEl);

		if (!this.calloutHasIconReady) {
			this.refreshPreviewIcon();
		}
	}
}

declare const STYLES: `
	// Ensure the preview takes a certain height.
	.calloutmanager-edit-callout-preview {
		padding-bottom: var(--size-4-8);
		min-height: 14em;

		body.is-mobile & {
			min-height: 35vh;
		}
	}

	// The text box that allows the preview to be changed.
	.calloutmanager-preview-editor {
		resize: vertical;
		width: 100%;
		min-height: 6em;

		margin-top: var(--size-4-3);

		// Try to be as transparent as possible.
		background: transparent;
		font-size: var(--font-text-size);
		font-family: var(--font-text);
		line-height: var(--line-height-normal);
	}
`;
