export interface UIPaneNavigation {
	close(): void;
	open(pane: UIPane<unknown>): void;
	replace(pane: UIPane<unknown>): void;
}

export type UIPaneTitle = string | { title: string; subtitle: string };

/**
 * A setting pane that exists within the setting tab.
 *
 * This has its own navigation and sticky header!
 */
export abstract class UIPane<S = unknown> {
	protected readonly nav!: UIPaneNavigation;
	protected readonly containerEl!: HTMLElement;
	protected readonly controlsEl!: HTMLElement;

	/**
	 * The title of the pane.
	 */
	public abstract get title(): UIPaneTitle;

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
		return undefined as unknown as S;
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
 * A type for a {@link UIPane}, but with all properties exposed and writable.
 * @internal
 */
export type UIPane_FRIEND<S = unknown> = {
	-readonly [key in keyof UIPane<S>]: UIPane<S>[key];
} & {
	nav: UIPane<S>['nav'] | undefined;
	containerEl: UIPane<S>['containerEl'] | undefined;
	controlsEl: UIPane<S>['controlsEl'] | undefined;
	onReady: UIPane<S>['onReady'];
	onClose: UIPane<S>['onClose'];
	suspendState: UIPane<S>['suspendState'];
	restoreState: UIPane<S>['restoreState'];
};
