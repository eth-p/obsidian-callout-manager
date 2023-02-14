import { App, Plugin, PluginSettingTab } from 'obsidian';

import { Pane } from './Pane';
import { UIModal, createContainers } from './UIModal';

/**
 * A {@link Pane} host that uses an Obsidian {@link PluginSettingTab} to hold the pane.
 */
export class UISettingTab extends PluginSettingTab {
	private hostContainer: HTMLDivElement;
	private hostHeader: HTMLDivElement;

	private contents?: Pane;
	private createContents: () => Pane | Pane[];

	public constructor(app: App, plugin: Plugin, createContents: () => Pane | Pane[]) {
		super(app, plugin);
		this.createContents = createContents;

		this.hostContainer = document.createElement('div');
		this.hostHeader = document.createElement('div');
	}

	public display() {
		this.containerEl.classList.add('callout-manager-setting-tab');
		this.containerEl.appendChild(this.hostHeader);
		this.containerEl.appendChild(this.hostContainer);

		// Create the content pane.
		this.contents = createContainers(this.app, this.createContents(), {
			nav: {
				close: () => this.hide(),
				closeAll: () => this.hide(),
				replace: (pane) => (this.contents = pane) && this.render(),
				replaceAll: (pane) => (this.contents = pane) && this.render(),
				open: (pane) => new UIModal(this.app, () => pane).open(),
			},

			controlsEl: undefined,
			navEl: undefined,
			titleEl: undefined,
			scrollEl: undefined,
			contentEl: this.hostContainer,
			headerEl: this.hostHeader,

			transformer: (el) => {
				el.classList.add('vertical-tab-content', 'callout-manager-pane-content');
				return el;
			},
		});

		this.render();
	}

	private render() {
		const { contents } = this;
		if (contents == null) {
			return;
		}

		contents.onOpen();
		contents.render();
	}

	public hide() {
		super.hide();

		this.contents?.onClose();
		this.contents = undefined;
	}
}
