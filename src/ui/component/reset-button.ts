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
	// The "undo" button when the setting has not been changed from the default.
	.calloutmanager-reset-button:is(.is-disabled, [disabled]) {
		opacity: 0.3;
	}
`;
