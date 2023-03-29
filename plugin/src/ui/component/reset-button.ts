import { ExtraButtonComponent } from 'obsidian';

/**
 * A reset button.
 */
export class ResetButtonComponent extends ExtraButtonComponent {
	public constructor(containerEl: HTMLElement) {
		super(containerEl);
		this.setIcon('lucide-undo');
		this.extraSettingsEl.classList.add('calloutmanager-reset-button');
	}
}

declare const STYLES: `
	:root {
		--calloutmanager-reset-button-disabled-opacity: 0.3;
	}

	// The "undo" button when the setting has not been changed from the default.
	.calloutmanager-reset-button:is(.is-disabled, [disabled]) {
		opacity: var(--calloutmanager-reset-button-disabled-opacity);

		&:hover {
			background-color: transparent;
		}

		&:active {
			color: var(--icon-color);
		}
	}
`;
