import CalloutManagerPlugin from '&plugin';

import { UIPane } from '&ui/pane';

import { getSections } from '../changelog';

/**
 * A pane that shows the plugin changelog.
 */
export class ChangelogPane extends UIPane {
	public readonly title = 'Changelog';
	private readonly plugin: CalloutManagerPlugin;
	private changelogEl: HTMLElement;

	public constructor(plugin: CalloutManagerPlugin) {
		super();
		this.plugin = plugin;

		// Create the changelog element.
		const sections = getSections(plugin);
		const frag = document.createDocumentFragment();
		this.changelogEl = frag.createDiv({ cls: 'calloutmanager-changelog' });

		Array.from(sections.values()).forEach(({ version, containerEl: el }) => {
			this.changelogEl.appendChild(el);
			if (version === this.plugin.manifest.version) {
				el.setAttribute('open', '');
				el.setAttribute('data-current-version', 'true');
			}
		});
	}

	/** @override */
	public display(): void {
		const { containerEl } = this;

		containerEl.appendChild(this.changelogEl);
	}
}

// ---------------------------------------------------------------------------------------------------------------------
// Styles:
// ---------------------------------------------------------------------------------------------------------------------

declare const STYLES: `
	.calloutmanager-changelog > *:not(:first-child) {
		margin-top: 1em;
	}

	.calloutmanager-changelog {
		--callout-blend-mode: normal;

		details {
			> summary::marker {
				color: var(--text-faint);
			}

			&[open] > summary::marker {
				color: var(--text-muted);
			}

			.calloutmanager-changelog-section {
    			border-bottom: 1px solid var(--background-modifier-border);
				margin-bottom: 1.25em;
				padding-bottom: 1.25em;

				> :last-child {
					margin-bottom: 0;
				}
			}
		}

		details:not([data-current-version=true]) {
			.calloutmanager-changelog-heading {
				color: var(--text-muted);
			}
		}
	}
`;
