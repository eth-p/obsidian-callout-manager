/**
 * An abstraction of a UI within Obsidian (e.g. as a setting tab or modal).
 */
export abstract class Pane<S = unknown> implements PaneHost {
	protected parent!: PaneHost;
	public readonly nav!: PaneHost['nav'];

	/**
	 * The content element.
	 * This is what the pane should be rendered to.
	 */
	public readonly contentEl!: HTMLElement;

	/**
	 * The controls element.
	 * Any global controls for the pane should be added here.
	 */
	public readonly controlsEl: HTMLElement | undefined;

	/**
	 * The navigation element.
	 */
	public readonly navEl: HTMLElement | undefined;

	/**
	 * The title element.
	 * The pane title should be added to this.
	 */
	public readonly titleEl: HTMLElement | undefined;

	/**
	 * The container element.
	 * This is here for bookkeeping purposes.
	 */
	public readonly containerEl!: HTMLElement;

	/**
	 * The scroll container element.
	 * This is here for bookkeeping purposes.
	 */
	public readonly scrollEl: HTMLElement | undefined;

	public get scrollOffset(): { top: number; left: number } {
		const { scrollEl } = this;
		if (scrollEl == null) {
			return { top: 0, left: 0 };
		}

		return {
			top: scrollEl.scrollTop,
			left: scrollEl.scrollLeft,
		};
	}

	public set scrollOffset(value: { top: number; left: number }) {
		const { scrollEl } = this;
		if (scrollEl == null) {
			return;
		}

		scrollEl.scrollTo(value);
	}

	// Functions.

	/**
	 * Renders the HTML for the pane contents.
	 */
	public abstract render(): void;

	/**
	 * Called when the pane is created and ready.
	 * The {@link contentEl} will be populated by this point.
	 */
	public onOpen(): void {}

	/**
	 * Called when the pane is destroyed.
	 */
	public onClose(): void {}

	/**
	 * Saves the state of the pane.
	 * This is called when it is temporarily unloaded.
	 *
	 * @abstract
	 */
	public saveState(): S {
		return undefined as S;
	}

	/**
	 * Restores the state of the pane.
	 * @param state The state to restore.
	 *
	 * @abstract
	 */
	public restoreState(state: S): void {}

	public static setParent<S = undefined>(pane: Pane<S>, parent: PaneHost): void {
		pane.parent = parent;
	}

	public static detachParent<S = undefined>(pane: Pane<S>): void {
		pane.parent = undefined as unknown as PaneHost;
	}
}

Object.defineProperties(Pane.prototype, {
	nav: {
		configurable: true,
		enumerable: true,
		get() {
			const parent = this.parent;
			if (parent == null) {
				return undefined;
			}

			return parent.navOut ?? parent.nav;
		},
	},

	containerEl: {
		configurable: true,
		enumerable: true,
		get() {
			return this.parent?.contentEl;
		},
	},

	contentEl: {
		configurable: true,
		enumerable: true,
		get() {
			const parent = this.parent;
			if (parent == null) {
				return undefined;
			}

			return parent.contentElOut ?? parent.contentEl;
		},
	},

	controlsEl: {
		configurable: true,
		enumerable: true,
		get(this: Pane) {
			return this.parent?.controlsEl;
		},
	},

	navEl: {
		configurable: true,
		enumerable: true,
		get(this: Pane) {
			return this.parent?.navEl;
		},
	},

	titleEl: {
		configurable: true,
		enumerable: true,
		get(this: Pane) {
			return this.parent?.titleEl;
		},
	},

	scrollEl: {
		configurable: true,
		enumerable: true,
		get(this: Pane) {
			return this.parent?.scrollEl;
		},
	},
});

export interface PaneHost {
	readonly nav: {
		close(): void;
		closeAll(): void;
		replace(pane: Pane): void;
		replaceAll(pane: Pane): void;
		open(pane: Pane): void;
	};

	readonly controlsEl: HTMLElement | undefined;
	readonly navEl: HTMLElement | undefined;
	readonly titleEl: HTMLElement | undefined;
	readonly scrollEl: HTMLElement | undefined;
	readonly contentEl: HTMLElement;
}
