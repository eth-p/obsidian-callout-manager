import { ButtonComponent } from 'obsidian';

import { Callout, CalloutID } from '../../api';
import CalloutManagerPlugin from '../main';
import { CalloutSettings } from '../settings';

import { CMSettingPane } from './CMSettingTab';
import { EditCalloutPaneAppearance } from './EditCalloutPane_Appearance';
import { renderInfo } from './EditCalloutPane_Info';
import { EditCalloutPanePreview } from './EditCalloutPane_Preview';

const IMPOSSIBLE_CALLOUT_ID = '[not a real callout]';

export class EditCalloutPane extends CMSettingPane {
	public readonly title;
	private readonly viewOnly: boolean;
	private readonly plugin: CalloutManagerPlugin;

	private callout: Callout;

	private previewSection: EditCalloutPanePreview;
	private appearanceSection: EditCalloutPaneAppearance;

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

		// Create the callout preview.
		this.previewSection = new EditCalloutPanePreview(plugin, this.callout, false);
		this.appearanceSection = new EditCalloutPaneAppearance(
			this.plugin,
			this.callout,
			plugin.getCalloutSettings(id) ?? [],
			() => this.nav,
			(settings) => {
				this.previewSection.changeSettings(settings);
				this.plugin.setCalloutSettings(this.callout.id, settings);

				// Rerender to show what changed.
				Object.assign(this.callout, plugin.calloutResolver.getCalloutProperties(this.callout.id));
				this.containerEl.empty();
				this.display();
			},
		);
	}

	/** @override */
	public display(): void {
		const { containerEl } = this;

		this.previewSection.attach(containerEl);
		renderInfo(this.plugin.app, this.callout, containerEl);
		this.appearanceSection.attach(containerEl);
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
				.then(({ buttonEl }) =>
					buttonEl.classList.add('clickable-icon', 'callout-manager-edit-callout-delete-button'),
				);
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
		return this.previewSection.changeSettings(settings);
	}
}
