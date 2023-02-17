import { Component, MarkdownRenderer, TextAreaComponent, getIcon } from 'obsidian';

import { Callout } from '../../api';
import { IsolatedCalloutPreview, createIsolatedCalloutPreview } from '../callout-preview';
import { calloutSettingsToCSS, currentCalloutEnvironment } from '../callout-settings';
import CalloutManagerPlugin from '../main';
import { CalloutSettings } from '../settings';

/**
 * A callout preview for the edit callout pane.
 *
 * This allows the preview text to be edited.
 */
export class EditCalloutPanePreview {
	public readonly preview: IsolatedCalloutPreview<false> & { contentEl: HTMLElement };

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
			cls: ['callout-manager-preview-container', 'callout-manager-edit-callout-preview'],
		});

		this.preview = createIsolatedCalloutPreview(this.sectionEl.createDiv(), callout.id, {
			title: callout.id,
			overrideIcon: callout.icon, // Needed since we can't determine the icon until it's attached to the DOM.
			contents: (containerEl) => {
				containerEl.createEl('p', { text: this.previewMarkdown });
			},
		}) as IsolatedCalloutPreview<false> & { contentEl: HTMLElement };

		// Make the preview editable.
		if (!viewOnly) {
			this.makeEditable();
		}
	}

	private makeEditable(): void {
		const { contentEl } = this.preview;

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
					inputEl.classList.add('callout-manager-preview-editor');
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
		const { contentEl } = this.preview;
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
		const {calloutEl, customStyleEl, providedStyleEls} = this.preview;
		const styles = calloutSettingsToCSS(this.calloutId, settings, currentCalloutEnvironment(this.plugin.app));
		customStyleEl.textContent = styles;

		this.calloutHasIconReady = false;

		// Remove any overridden styles.
		calloutEl.style.removeProperty('--callout-icon');
		calloutEl.style.removeProperty('--callout-color');

		// Remove the preview styles added by callout manager.
		// Now that we changed the settings, having the old styles would lead to inconsistency.
		providedStyleEls.forEach(el => {
			if (el.getAttribute('data-inject-id') === 'callout-settings') {
				el.remove();
			}
		})
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
