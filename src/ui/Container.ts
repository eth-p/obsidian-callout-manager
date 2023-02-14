import { Pane } from './Pane';

/**
 * A pane that is capable of holding another pane within it.
 */
export class Container extends Pane {
	protected contentElOut: HTMLElement | undefined;
	protected _childPane: Pane | undefined;

	public constructor(contents?: Pane, transformer?: (containerEl: HTMLElement) => HTMLElement) {
		super();

		if (transformer != null) {
			this.contentElOut = transformer(document.createElement('div'));
		}

		this._childPane = contents;
		if (contents != null) {
			Pane.setParent(contents, this);
		}
	}

	public get childPane(): Pane | undefined {
		return this._childPane;
	}

	public set childPane(value: Pane | undefined) {
		if (this._childPane !== undefined) {
			this._childPane.onClose();
			Pane.detachParent(this._childPane);
		}

		this._childPane = value;
		if (value != null) {
			Pane.setParent(value, this);
			value.onOpen();
		}
	}

	/**
	 * Suspends the child pane, saving its state and returning the state.
	 * The child pane will be detached.
	 *
	 * Call render again to clear the container.
	 * @returns The saved state.
	 */
	protected suspendChild<S = unknown>(): undefined | { pane: Pane<S>; state: S } {
		const pane = this._childPane as Pane<S>;
		if (pane === undefined) {
			return undefined;
		}

		const state = pane.saveState();
		Pane.detachParent(pane);

		this._childPane = undefined;
		return { pane, state };
	}

	/**
	 * Restores the child pane, loading its state.
	 * The old child pane will be destroyed.
	 *
	 * Call render again to render the container.
	 */
	protected restoreChild<S = unknown>(pane: Pane<S>, state: S): void {
		this.childPane = undefined;

		this._childPane = pane;
		Pane.setParent(pane, this);
		pane.restoreState(state);
	}

	// Delegation.
	public render(): void {
		this.contentEl.empty();
		this.controlsEl?.empty();
		this.titleEl?.empty();
		this.navEl?.empty();

		const { _childPane } = this;
		if (_childPane != null) {
			// Ensure the transformed elemented is attached to the DOM.
			const { contentElOut, contentEl } = this;
			if (contentElOut != null) {
				contentEl.appendChild(contentElOut);
			}

			// Render the child pane.
			_childPane.render();
			return;
		}
	}

	public onClose() {
		this._childPane?.onClose();
	}

	public onOpen() {
		this._childPane?.onOpen();
	}

	public saveState(): unknown {
		return this._childPane?.saveState() as unknown;
	}

	public restoreState(state: unknown): void {
		this._childPane?.restoreState(state);
	}
}
