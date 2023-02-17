import { ExtraButtonComponent } from 'obsidian';


/**
 * A reset button.
 */
export class ResetButtonComponent extends ExtraButtonComponent {
	public constructor(containerEl: HTMLElement) {
		super(containerEl);
		this.setIcon('lucide-undo');
		this.extraSettingsEl.classList.add('calloutmanager-setting-undo');
	}
}
