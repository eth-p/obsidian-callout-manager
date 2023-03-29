import { ButtonComponent } from 'obsidian';

import { UIPane, UIPaneNavigation, UIPane_FRIEND } from './pane';

/**
 * Layered navigation for the Callout Manager setting tab.
 * This allows panes to be stacked on top of each other, allowing for a hierarchical view of the plugin settings.
 */
export class UIPaneLayers {
	protected readonly navInstance: UIPaneNavigation;
	protected readonly closeParent: () => void;
	protected activePane: UIPane_FRIEND | undefined;

	public titleEl!: HTMLElement;
	public containerEl!: HTMLElement;
	public controlsEl!: HTMLElement;
	public navEl!: HTMLElement;
	public scrollEl!: HTMLElement;

	public readonly layers: Array<{
		state: unknown;
		scroll: { top: number; left: number };
		pane: UIPane_FRIEND<unknown>;
		title: string;
	}> = [];

	public constructor(options: { close: () => void }) {
		this.closeParent = options.close;
		this.navInstance = {
			open: (pane) => this.push(pane),
			close: () => this.pop(),
			replace: (pane) => (this.top = pane),
		};
	}

	/**
	 * Pushes a new pane on top of the stack.
	 * The active pane will be suspended.
	 *
	 * @param pane The pane to push.
	 */
	public push(pane: UIPane) {
		const { activePane: oldPane } = this;

		// Suspend the active layer.
		if (oldPane !== undefined) {
			const title = oldPane.title;
			this.layers.push({
				scroll: { top: this.scrollEl.scrollTop, left: this.scrollEl.scrollLeft },
				state: oldPane.suspendState(),
				pane: oldPane,
				title: typeof title === 'string' ? title : title.subtitle,
			});

			this.setPaneVariables(oldPane, false);
			this.containerEl.empty();
		}

		// Attach the new layer.
		const newPane = (this.activePane = pane as unknown as UIPane_FRIEND);
		this.setPaneVariables(newPane, true);
		newPane.onReady();
		this.doDisplay(true);
		this.scrollEl.scrollTo({ top: 0, left: 0 });
	}

	/**
	 * Pops the active pane off the stack.
	 * The active pane will be destroyed, and the one underneath it will be restored.
	 *
	 * @param pane The pane to push.
	 */
	public pop(options?: { cancelled?: boolean; noDisplay?: boolean }): UIPane | undefined {
		if (this.activePane === undefined) {
			this.closeParent();
			return undefined;
		}

		const noDisplay = options?.noDisplay ?? false;
		const oldPane = this.activePane;
		const newPane = this.layers.pop();

		// Destroy the old top layer.
		this.activePane = undefined;
		this.setPaneVariables(oldPane, false);
		oldPane.onClose(options?.cancelled ?? false);
		if (!noDisplay) {
			this.containerEl.empty();
		}

		// Prepare the new top layer.
		if (newPane !== undefined) {
			this.activePane = newPane.pane;
			this.setPaneVariables(newPane.pane, true);
			newPane.pane.restoreState(newPane.state);
			if (!noDisplay) {
				this.doDisplay(true);
				this.scrollEl.scrollTo(newPane.scroll);
			}
		}

		return oldPane as unknown as UIPane;
	}

	/**
	 * Removes all panes off the stack.
	 * All panes will be destroyed.
	 *
	 * @param pane The pane to push.
	 */
	public clear(options?: Parameters<UIPaneLayers['pop']>[0]): UIPane[] {
		const removed: UIPane[] = [];
		const opts = {
			noDisplay: true,
			...(options ?? {}),
		};

		while (this.activePane !== undefined) {
			removed.push(this.pop(opts) as UIPane);
		}

		return removed;
	}

	/**
	 * The top-most (i.e. currently active) pane in the layers.
	 */
	public get top(): UIPane | undefined {
		return this.activePane as unknown as UIPane;
	}

	public set top(pane: UIPane | undefined) {
		const { activePane: oldTop } = this;

		// Destroy the old top layer.
		if (oldTop !== undefined) {
			this.setPaneVariables(oldTop, false);
			oldTop.onClose(false);
		}

		// Prepare the new top layer.
		const newPane = (this.activePane = pane as unknown as UIPane_FRIEND);
		this.setPaneVariables(newPane, true);
		newPane.onReady();
		this.doDisplay(true);
	}

	protected doDisplay(renderControls: boolean): void {
		const { activePane, titleEl, navEl, containerEl } = this;
		if (activePane === undefined) {
			return;
		}

		// Display the nav.
		navEl.empty();
		if (this.layers.length > 0) {
			new ButtonComponent(this.navEl)
				.setIcon('lucide-arrow-left-circle')
				.setClass('clickable-icon')
				.setTooltip(`Back to ${this.layers[this.layers.length - 1].title}`)
				.onClick(() => this.navInstance.close());
		}

		// Display the title.
		titleEl.empty();
		const { title } = activePane;
		if (typeof title === 'string') {
			titleEl.createEl('h2', { text: title });
		} else {
			titleEl.createEl('h2', { text: title.title });
			titleEl.createEl('h3', { text: title.subtitle });
		}

		// Display the controls.
		// Ideally, this should only be done once.
		if (renderControls) {
			this.controlsEl.empty();
			activePane.displayControls();
		}

		// Display the contents.
		containerEl.empty();
		activePane.display();
	}

	private setPaneVariables(pane: UIPane_FRIEND, attached: boolean) {
		const notAttachedError = () => {
			throw new Error('Not attached');
		};

		Object.defineProperties<UIPane_FRIEND>(pane, {
			nav: {
				configurable: true,
				enumerable: true,
				get: attached ? () => this.navInstance : notAttachedError,
			},

			containerEl: {
				configurable: true,
				enumerable: true,
				get: attached ? () => this.containerEl : notAttachedError,
			},

			controlsEl: {
				configurable: true,
				enumerable: true,
				get: attached ? () => this.controlsEl : notAttachedError,
			},
		});
	}
}
