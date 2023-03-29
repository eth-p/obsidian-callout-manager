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

// ---------------------------------------------------------------------------------------------------------------------
// Styles:
// ---------------------------------------------------------------------------------------------------------------------

declare const STYLES: `
	// A centered box to help display help messages for empty searches.
	.calloutmanager-centerbox {
		width: 100%;
		height: 100%;

		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	// Improve form UX.
	.calloutmanager-pane {
		// Make disabled buttons look disabled.
		button[disabled] {
			box-shadow: none;
			background-color: var(--interactive-normal);

			&:hover {
				background-color: var(--interactive-normal);
				cursor: not-allowed;
			}
		}

		input[type='color'][disabled] {
			cursor: not-allowed;
		}

		// Make invalid text boxes look invalid.
		input:invalid:not(:placeholder-shown) {
			border-color: var(--text-error);
		}

		// Improve color picker UX on mobile.
		body.is-phone & input[type='color']::-webkit-color-swatch {
			border-radius: var(--button-radius);
			border: #f00 2px solid;
			border: 1px solid var(--checkbox-border-color);
		}

		// Make clickable icons with 'mod-warning' not solid.
		.clickable-icon.mod-warning {
			color: var(--text-error);
			background: transparent;
			&:hover {
				color: var(--text-error);
				background: transparent;
			}
		}

		// Add mod-error to text field.
		input[type='text'].mod-error {
			border-color: var(--text-error);
		}
	}

	// Make clickable icons not too large on mobile.
	.calloutmanager-setting-tab-content .setting-item-control,
	.calloutmanager-setting-tab-controls {
		body.is-phone & button.clickable-icon {
			width: var(--button-height);
		}
	}

	// Make clickable icons in setting panes more visible on mobile.
	body.is-phone .calloutmanager-setting-tab-content .setting-item-control button.clickable-icon {
		border: 1px solid var(--checkbox-border-color);

		&.calloutmanager-setting-set {
			// background-color: var(--background-modifier-border);
		}
	}
`;
