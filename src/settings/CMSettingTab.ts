import { ButtonComponent, PluginSettingTab } from 'obsidian';
import { openPluginSettings } from 'obsidian-extra';
import { closeSettings } from 'obsidian-extra/unsafe';

import CalloutManagerPlugin from '../main';

import { ManagePluginPane } from './ManagePluginPane';

/**
 * The settings tab (UI) that will show up under Obsidian's settings.
 *
 * This implements stacked navigation, where {@link SettingsSection}s may be stacked on top of eachother.
 */
export class CMSettingTab extends PluginSettingTab {
	private readonly plugin: CalloutManagerPlugin;
	private readonly layers: CMSettingPaneLayers;
	private readonly createDefault: () => CMSettingPane;

	private initLayer: CMSettingPane | null;

	public constructor(plugin: CalloutManagerPlugin, createDefault: () => CMSettingPane) {
		super(plugin.app, plugin);
		this.plugin = plugin;
		this.createDefault = createDefault;

		this.initLayer = null;
		this.layers = new CMSettingPaneLayers({
			close: () => closeSettings(this.app),
		});
	}

	public openWithPane(pane: CMSettingPane) {
		this.initLayer = pane;
		openPluginSettings(this.plugin.app, this.plugin);
	}

	/** @override */
	public hide(): void {
		this.initLayer = null;
		this.layers.clear();
		super.hide();
	}

	public display(): void {
		const { containerEl, layers } = this;

		// Clear the container and create the elements.
		containerEl.empty();
		containerEl.classList.add('callout-manager-setting-tab');

		const headerEl = containerEl.createDiv({ cls: 'callout-manager-setting-tab-header' });
		layers.navEl = headerEl.createDiv({ cls: 'callout-manager-setting-tab-nav' });
		layers.titleEl = headerEl.createDiv({ cls: 'callout-manager-setting-tab-title' });

		const controlsEl = headerEl.createDiv({ cls: 'callout-manager-setting-tab-controls' });
		layers.controlsEl = controlsEl.createDiv();
		layers.scrollEl = containerEl.createDiv({ cls: 'callout-manager-setting-tab-viewport vertical-tab-content' });
		layers.containerEl = layers.scrollEl.createDiv({ cls: 'callout-manager-setting-tab-content' });

		// Create a close button, since the native one is covered.
		controlsEl.createDiv({ cls: 'modal-close-button' }, (closeButtonEl) => {
			closeButtonEl.addEventListener('click', (ev) => {
				if (!ev.isTrusted) return;
				closeSettings(this.app);
			});
		});

		// Clear the layers.
		layers.clear();

		// Render the top layer (or the default).
		const initLayer = this.initLayer ?? this.createDefault();
		this.initLayer = null;
		layers.top = initLayer;
	}
}

/**
 * Layered navigation for the Callout Manager setting tab.
 * This allows panes to be stacked on top of each other, allowing for a hierarchical view of the plugin settings.
 */
class CMSettingPaneLayers {
	protected readonly navInstance: CMSettingPaneNavigation;
	protected readonly closeParent: () => void;
	protected activePane: CMSettingPane_FRIEND | undefined;

	public titleEl!: HTMLElement;
	public containerEl!: HTMLElement;
	public controlsEl!: HTMLElement;
	public navEl!: HTMLElement;
	public scrollEl!: HTMLElement;

	public readonly layers: Array<{
		state: unknown;
		scroll: { top: number; left: number };
		pane: CMSettingPane_FRIEND<unknown>;
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
	public push(pane: CMSettingPane) {
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
		const newPane = (this.activePane = pane as unknown as CMSettingPane_FRIEND);
		this.setPaneVariables(newPane, true);
		newPane.onReady();
		this.doDisplay(true);
	}

	/**
	 * Pops the active pane off the stack.
	 * The active pane will be destroyed, and the one underneath it will be restored.
	 *
	 * @param pane The pane to push.
	 */
	public pop(options?: { cancelled?: boolean; noDisplay?: boolean }): CMSettingPane | undefined {
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

		return oldPane as unknown as CMSettingPane;
	}

	/**
	 * Removes all panes off the stack.
	 * All panes will be destroyed.
	 *
	 * @param pane The pane to push.
	 */
	public clear(options?: Parameters<CMSettingPaneLayers['pop']>[0]): CMSettingPane[] {
		const removed: CMSettingPane[] = [];
		const opts = {
			noDisplay: true,
			...(options ?? {}),
		};

		while (this.activePane !== undefined) {
			removed.push(this.pop(opts) as CMSettingPane);
		}

		return removed;
	}

	/**
	 * The top-most (i.e. currently active) pane in the layers.
	 */
	public get top(): CMSettingPane | undefined {
		return this.activePane as unknown as CMSettingPane;
	}

	public set top(pane: CMSettingPane | undefined) {
		const { activePane: oldTop } = this;

		// Destroy the old top layer.
		if (oldTop !== undefined) {
			this.setPaneVariables(oldTop, false);
			oldTop.onClose(false);
		}

		// Prepare the new top layer.
		const newPane = (this.activePane = pane as unknown as CMSettingPane_FRIEND);
		this.setPaneVariables(newPane, true);
		newPane.onReady();
		this.doDisplay(true);
	}

	protected doDisplay(renderControls: boolean): void {
		const { activePane } = this;
		if (activePane === undefined) {
			return;
		}

		// Display the nav.
		this.navEl.empty();
		if (this.layers.length > 0) {
			new ButtonComponent(this.navEl)
				.setIcon('lucide-arrow-left-circle')
				.setClass('clickable-icon')
				.setTooltip(`Back to ${this.layers[this.layers.length - 1].title}`)
				.onClick(() => this.navInstance.close());
		}

		// Display the title.
		this.titleEl.empty();
		const { title } = activePane;
		if (typeof title === 'string') {
			this.titleEl.createEl('h2', { text: title });
		} else {
			this.titleEl.createEl('h2', { text: title.title });
			this.titleEl.createEl('h3', { text: title.subtitle });
		}

		// Display the controls.
		// Ideally, this should only be done once.
		if (renderControls) {
			this.controlsEl.empty();
			activePane.displayControls();
		}

		// Display the contents.
		activePane.display();
	}

	private setPaneVariables(pane: CMSettingPane_FRIEND, attached: boolean) {
		const notAttachedError = () => {
			throw new Error('Not attached');
		};

		Object.defineProperties<CMSettingPane_FRIEND>(pane, {
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

interface CMSettingPaneNavigation {
	close(): void;
	open(pane: CMSettingPane<unknown>): void;
	replace(pane: CMSettingPane<unknown>): void;
}

/**
 * A setting pane that exists within the setting tab.
 *
 * This has its own navigation and sticky header!
 */
export abstract class CMSettingPane<S = unknown> {
	protected readonly nav!: CMSettingPaneNavigation;
	protected readonly containerEl!: HTMLElement;
	protected readonly controlsEl!: HTMLElement;

	/**
	 * The title of the pane.
	 */
	public abstract get title(): string | { title: string; subtitle: string };

	/**
	 * Called to render the pane to its container element.
	 */
	public abstract display(): void;

	/**
	 * Called to display the controls for the pane.
	 */
	public displayControls(): void {}

	/**
	 * Called when the pane is created and attached to the setting tab, but before {@link display} is called.
	 */
	protected onReady(): void {}

	/**
	 * Called when the pane is removed and ready to be destroyed.
	 * Any important settings should be saved here.
	 *
	 * @param cancelled If true, the user closed the pane with the escape key.
	 */
	protected onClose(cancelled: boolean): void {}

	/**
	 * Called to save the state of the setting pane.
	 * This is used for suspending a pane when another pane covers it up.
	 *
	 * @returns The saved state.
	 */
	protected suspendState(): S {
		return undefined as S;
	}

	/**
	 * Called to load the state of the setting pane.
	 * This is called before {@link display}.
	 *
	 * @param state The state to restore.
	 */
	protected restoreState(state: S): void {}
}

/**
 * A type for a {@link CMSettingPane}, but with all properties exposed and writable.
 */
type CMSettingPane_FRIEND<S = unknown> = {
	-readonly [key in keyof CMSettingPane<S>]: CMSettingPane<S>[key];
} & {
	nav: CMSettingPane<S>['nav'] | undefined;
	containerEl: CMSettingPane<S>['containerEl'] | undefined;
	controlsEl: CMSettingPane<S>['controlsEl'] | undefined;
	onReady: CMSettingPane<S>['onReady'];
	onClose: CMSettingPane<S>['onClose'];
	suspendState: CMSettingPane<S>['suspendState'];
	restoreState: CMSettingPane<S>['restoreState'];
};
