import { App, Modal } from 'obsidian';

import { Container } from './Container';
import { ContainerWithHeader } from './ContainerWithHeader';
import { ContainerWithNavigation } from './ContainerWithNavigation';
import { ContainerWithScroll } from './ContainerWithScroll';
import { Pane, PaneHost } from './Pane';

/**
 * A {@link Pane} host that uses an Obsidian {@link Modal} to hold the pane.
 */
export class UIModal extends Modal {
	private contents?: Pane;
	private createContents: () => Pane | Pane[];

	constructor(app: App, createContents: () => Pane | Pane[]) {
		super(app);
		this.createContents = createContents;
	}

	onOpen() {
		this.modalEl.classList.add('callout-manager-modal');

		this.contents = createContainers(this.app, this.createContents(), {
			nav: {
				close: () => this.close(),
				closeAll: () => this.close(),
				replace: (pane) => (this.contents = pane) && this.render(),
				replaceAll: (pane) => (this.contents = pane) && this.render(),
				open: (pane) => new UIModal(this.app, () => pane).open(),
			},

			controlsEl: undefined,
			navEl: undefined,
			titleEl: undefined,
			scrollEl: undefined,
			contentEl: this.contentEl,
			headerEl: this.titleEl,

			transformer: (el) => {
				el.classList.add('callout-manager-pane-content');
				return el;
			},
		});

		// Render.
		this.render();
	}

	public onClose() {
		this.contents?.onClose();
	}

	private render() {
		const { contents } = this;
		this.contentEl.empty();

		if (contents != null) {
			contents.onOpen();
			contents.render();
		}
	}
}

export function createContainers(
	app: App,
	panes: Pane | Pane[],
	host: PaneHost & {
		headerEl: HTMLElement;
		transformer?: (containerEl: HTMLElement) => HTMLElement;
		nav: PaneHost['nav'] & {
			open?: (pane: Pane) => void;
			replace?: (pane: Pane) => void;
			replaceAll?: (pane: Pane) => void;
		};
	},
): Container {
	const contents = panes instanceof Array ? new ContainerWithNavigation(panes) : panes;

	// Create the scroll container and header containers.
	const scrollContainer = new ContainerWithScroll(contents, host.transformer);
	const headerContainer = new ContainerWithHeader(host.headerEl, scrollContainer);

	// Inject open/replace/replaceAll.
	const { nav } = host;
	if (nav.open == null) {
		nav.open = (pane) => new UIModal(app, () => pane).open();
		nav.replace = (pane) => (scrollContainer.childPane = pane);
		nav.replaceAll = (pane) => (scrollContainer.childPane = pane);
	}

	// Set the parent of the topmost container.
	Pane.setParent(headerContainer, {
		...host,
	});

	return headerContainer;
}
