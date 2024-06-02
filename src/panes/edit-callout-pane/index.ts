import { ButtonComponent } from 'obsidian';

import { Callout, CalloutID } from '&callout';
import { CalloutSettings } from '&callout-settings';
import CalloutManagerPlugin from '&plugin';

import { UIPane } from '&ui/pane';

import { AppearanceEditor } from './appearance-editor';
import { Appearance, determineAppearanceType } from './appearance-type';
import ComplexAppearanceEditor from './editor-complex';
import PerSchemeAppearanceEditor from './editor-per-scheme';
import UnifiedAppearanceEditor from './editor-unified';
import { MiscEditor } from './misc-editor';
import { renderInfo } from './section-info';
import { EditCalloutPanePreview } from './section-preview';

const IMPOSSIBLE_CALLOUT_ID = '[not a real callout]';

export class EditCalloutPane extends UIPane {
	public readonly title;
	private readonly viewOnly: boolean;
	private readonly plugin: CalloutManagerPlugin;

	private callout: Callout;

	private previewSection: EditCalloutPanePreview;
	private appearanceEditorContainerEl: HTMLElement;
	private appearanceEditorEl: HTMLElement;
	private appearanceEditor!: AppearanceEditor<Appearance>;
	private miscEditor: MiscEditor;
	private miscEditorContainerEl: HTMLElement;
	private appearance!: Appearance;

	public constructor(plugin: CalloutManagerPlugin, id: CalloutID, viewOnly: boolean) {
		super();
		this.plugin = plugin;
		this.viewOnly = viewOnly;
		this.title = { title: 'Callout', subtitle: id };

		// Get the callout information.
		this.callout = plugin.callouts.get(id) ?? {
			sources: [{ type: 'custom' }],
			...plugin.calloutResolver.getCalloutProperties(IMPOSSIBLE_CALLOUT_ID),
			id,
		};

		// Create the preview.
		this.previewSection = new EditCalloutPanePreview(plugin, this.callout, false);

		// Create the misc editor.
		this.miscEditorContainerEl = document.createElement('div');
		this.miscEditorContainerEl.classList.add(
			'calloutmanager-edit-callout-section',
			'calloutmanager-edit-callout-section--noborder',
			'calloutmanager-edit-callout-misc',
		);

		this.miscEditor = new MiscEditor(plugin, this.callout, this.miscEditorContainerEl, viewOnly);
		Object.defineProperty(this.miscEditor, 'nav', {
			get: () => this.nav,
		});

		// Create the appearance editor.
		this.appearanceEditorContainerEl = document.createElement('div');
		this.appearanceEditorContainerEl.classList.add(
			'calloutmanager-edit-callout-section',
			'calloutmanager-edit-callout-appearance',
		);

		this.appearanceEditorContainerEl.createEl('h2', { text: 'Appearance' });
		this.appearanceEditorEl = this.appearanceEditorContainerEl.createDiv();

		this.changeSettings(plugin.getCalloutSettings(id) ?? []);
	}

	protected changeAppearanceEditor(newAppearance: Appearance) {
		const oldAppearance = this.appearance;
		this.appearance = newAppearance;

		if (newAppearance.type !== oldAppearance?.type) {
			this.appearanceEditor = new APPEARANCE_EDITORS[newAppearance.type]();

			Object.defineProperties(this.appearanceEditor, {
				nav: { get: () => this.nav },
				plugin: { value: this.plugin },
				containerEl: { value: this.appearanceEditorEl },
				setAppearance: { value: this.onSetAppearance.bind(this) },
			});
		}

		const { appearanceEditor } = this;
		appearanceEditor.appearance = newAppearance;
		appearanceEditor.callout = this.callout;
	}

	protected onSetAppearance(appearance: Appearance) {
		this.changeAppearanceEditor(appearance);
		const newSettings = this.appearanceEditor.toSettings();
		const { callout } = this;
		const { calloutResolver } = this.plugin;

		// Update the plugin settings.
		this.plugin.setCalloutSettings(callout.id, newSettings);

		// Update the callout properties.
		const { color, icon } = calloutResolver.getCalloutProperties(callout.id);
		callout.color = color;
		callout.icon = icon;

		// Rerender to show what changed.
		this.previewSection.changeSettings(newSettings);

		this.appearanceEditor.callout = callout;
		this.appearanceEditorEl.empty();
		this.appearanceEditor.render();

		this.containerEl.empty();
		this.display();
	}

	/** @override */
	public display(): void {
		const { containerEl, previewSection, appearanceEditorContainerEl, miscEditorContainerEl } = this;

		containerEl.empty();
		previewSection.attach(containerEl);
		renderInfo(this.plugin.app, this.callout, containerEl);
		containerEl.appendChild(miscEditorContainerEl);
		containerEl.appendChild(appearanceEditorContainerEl);
	}

	/** @override */
	public displayControls(): void {
		const { callout, controlsEl } = this;

		// Delete button.
		if (!this.viewOnly && callout.sources.length === 1 && callout.sources[0].type === 'custom') {
			new ButtonComponent(controlsEl)
				.setIcon('lucide-trash')
				.setTooltip('Delete Callout')
				.onClick(() => {
					this.plugin.removeCustomCallout(callout.id);
					this.nav.close();
				})
				.then(({ buttonEl }) => buttonEl.classList.add('clickable-icon', 'mod-warning'));
		}
	}

	/**
	 * Changes the preview that is displayed inside the callout.
	 *
	 * @param markdown The markdown to render.
	 */
	public async changePreview(markdown: string): Promise<void> {
		return this.previewSection.changeContent(markdown);
	}

	/**
	 * Changes the styles of the preview that is displayed inside the callout.
	 *
	 * @param markdown The markdown to render.
	 */
	public async changeSettings(settings: CalloutSettings): Promise<void> {
		this.changeAppearanceEditor(determineAppearanceType(settings));
		this.appearanceEditorEl.empty();
		this.appearanceEditor.render();
		this.miscEditor.render();

		await this.previewSection.changeSettings(settings);
	}
}

const APPEARANCE_EDITORS: Record<Appearance['type'], { new (): AppearanceEditor<Appearance> }> = {
	complex: ComplexAppearanceEditor,
	unified: UnifiedAppearanceEditor,
	'per-scheme': PerSchemeAppearanceEditor,
};

declare const STYLES: `
	// Sections of the pane.
	.calloutmanager-edit-callout-section {
		border-top: 1px solid var(--background-modifier-border);
		padding-top: var(--size-4-3);
		padding-bottom: var(--size-4-6);
	}

	.calloutmanager-edit-callout-section:empty {
		display: none;
	}

	.calloutmanager-edit-callout-section--noborder {
		border-top: none;
	}

	.calloutmanager-edit-callout-section .setting-item {
		.setting-item-description p {
			margin: 0;
		}
	}

	.calloutmanager-edit-callout-section h2 {
		margin-bottom: 0.3em;
		& + p {
			margin-top: 0;
		}
	}

	.calloutmanager-edit-callout-appearance {
		.setting-item {
			border-top: none;
			padding-top: 0.375em;
		}

		.setting-item:has(+ .setting-item) {
			padding-bottom: 0.375em;

			body.is-phone & {
				margin-bottom: 0.7em;
			}
		}

		.setting-item + .setting-item {
		}
	}

	// The preview showing the complex callout setting JSON.
	.calloutmanager-edit-callout-appearance-json pre {
		border: rgba(var(--background-modifier-border)) 1px solid;
		border-radius: var(--callout-radius);
		padding: var(--size-4-2);
		background: var(--background-primary-alt);
		overflow-x: auto;

		margin: 0;
	}

	// The reset button.
	.calloutmanager-edit-callout-appearance-reset {
		width: 100%;
	}
`;
