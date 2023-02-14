import { createCalloutPreview } from '../callout-preview';
import CalloutManagerPlugin from '../main';
import { Pane } from '../ui/Pane';

export class CalloutSettings extends Pane {
	private plugin: CalloutManagerPlugin;
	public titleEl!: HTMLElement;

	public constructor(plugin: CalloutManagerPlugin) {
		super();
		this.plugin = plugin;
	}

	public render(): void {
		const { contentEl, titleEl } = this;
		titleEl.textContent = 'Edit Callouts';

		for (const callout of this.plugin.callouts.values()) {
			const calloutContainerEl = contentEl.createDiv();
			calloutContainerEl.style.marginTop = '0.5em';
			calloutContainerEl.style.marginBottom = '0.5em';

			createCalloutPreview(calloutContainerEl, callout.id, {
				title: callout.id,
			});
		}
	}
}
