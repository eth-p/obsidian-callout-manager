import { rgb } from 'color-convert';

import { Component, MarkdownRenderer, TextAreaComponent, getIcon } from 'obsidian';

import { Callout, CalloutSource } from '../../api';
import { IsolatedCalloutPreview, createIsolatedCalloutPreview } from '../callout-preview';
import { getColorFromCallout } from '../callout-resolver';
import { calloutSettingsToCSS, currentCalloutEnvironment } from '../callout-settings';
import CalloutManagerPlugin from '../main';
import { CalloutSettings } from '../settings';

import { CMSettingPane } from './CMSettingTab';
import { renderInfo } from './EditCalloutPane_Info';

const IMPOSSIBLE_CALLOUT_ID = '[not a real callout]';

export class EditCalloutPane extends CMSettingPane {
	public readonly title;
	private readonly viewOnly: boolean;
	private readonly plugin: CalloutManagerPlugin;

	private callout: Callout;
	private calloutPreview: IsolatedCalloutPreview<false>;
	private calloutContainerEl: HTMLElement;

	private previewContentEl!: HTMLElement;
	private previewMarkdown = 'Lorem ipsum dolor sit amet.';
	private previewEditorEl: HTMLTextAreaElement | null;

	private calloutHasIconReady: boolean;

	public constructor(plugin: CalloutManagerPlugin, id: string, viewOnly: boolean) {
		super();
		this.plugin = plugin;
		this.viewOnly = viewOnly;
		this.title = { title: 'Callout', subtitle: id };

		// Get the callout information.
		this.calloutHasIconReady = false;
		this.callout = plugin.callouts.get(id) ?? {
			sources: [{ type: 'custom' }],
			...plugin.calloutResolver.getCalloutProperties(IMPOSSIBLE_CALLOUT_ID),
			id,
		};

		// Create the callout preview.
		const frag = document.createDocumentFragment();
		this.calloutContainerEl = frag.createDiv(
			'callout-manager-preview-container callout-manager-edit-callout-preview',
		);
		this.calloutPreview = createIsolatedCalloutPreview(this.calloutContainerEl.createDiv(), id, {
			title: id,
			overrideIcon: this.callout.icon,
			contents: (containerEl) => {
				this.previewContentEl = containerEl;
				containerEl.createEl('p', { text: this.previewMarkdown });
			},
		});

		// Add a click handler to change the preview.
		this.previewEditorEl = null;
		this.calloutPreview.calloutEl.addEventListener('click', () => {
			if (this.previewEditorEl != null) {
				return;
			}

			const height = this.previewContentEl.getBoundingClientRect().height;
			this.previewContentEl.empty();
			new TextAreaComponent(this.previewContentEl)
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
						this.changePreview(value);
					});
				});
		});
	}

	/** @override */
	public display(): void {
		const { containerEl } = this;

		// Attach the callout.
		containerEl.appendChild(this.calloutContainerEl);
		if (!this.calloutHasIconReady) {
			this.refreshPreviewIcon();
		}

		// Attach the rest.
		renderInfo(this.plugin.app, this.callout, containerEl);
	}

	public async changeSettings(settings: CalloutSettings): Promise<void> {
		const styles = calloutSettingsToCSS(this.callout.id, settings, currentCalloutEnvironment(this.plugin.app));
		this.calloutPreview.customStyleEl.textContent = styles;
		this.calloutHasIconReady = false;
	}

	/**
	 * Changes the preview that is displayed inside the callout.
	 *
	 * @param markdown The markdown to render.
	 */
	public async changePreview(markdown: string): Promise<void> {
		this.previewContentEl.empty();

		try {
			await MarkdownRenderer.renderMarkdown(
				markdown,
				this.previewContentEl,
				'',
				undefined as unknown as Component,
			);
		} catch (ex) {
			this.previewContentEl.createEl('code').createEl('pre', { text: markdown });
		}
	}

	/**
	 * Refreshes the callout preview's icon.
	 * We need to do this after the preview is attached to DOM, as we can't get the correct icon until that happens.
	 */
	protected refreshPreviewIcon(): void {
		const { iconEl, calloutEl } = this.calloutPreview;

		if (window.document.contains(this.calloutContainerEl)) {
			const icon = window.getComputedStyle(calloutEl).getPropertyValue('--callout-icon');
			const iconSvg = getIcon(icon) ?? document.createElement('svg');

			iconEl.empty();
			iconEl.appendChild(iconSvg);

			this.calloutHasIconReady = true;
		}
	}

	protected renderInfoDetails(): void {}
	protected renderSettings(): void {}

	/** @override */
	public displayControls(): void {
		const { controlsEl } = this;
	}
}
