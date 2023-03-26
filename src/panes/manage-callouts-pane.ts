import { ButtonComponent, TextComponent, getIcon } from 'obsidian';

import { Callout } from '&callout';
import { getColorFromCallout, getTitleFromCallout } from '&callout-util';
import CalloutManagerPlugin from '&plugin';

import { CalloutPreviewComponent } from '&ui/component/callout-preview';
import { UIPane } from '&ui/pane';

import CalloutSearch, { Actions, Operation } from '../search';

import { CreateCalloutPane } from './create-callout-pane';
import { EditCalloutPane } from './edit-callout-pane';

/**
 * The user interface pane for changing Callout Manager settings.
 */
export class ManageCalloutsPane extends UIPane {
	public readonly title = { title: 'Callouts', subtitle: 'Manage' };
	private readonly viewOnly: boolean;
	private plugin: CalloutManagerPlugin;

	private searchQuery: string;
	private searchInstance: CalloutSearch | null;

	private searchErrorDiv: HTMLElement;
	private searchErrorQuery!: HTMLElement;

	public constructor(plugin: CalloutManagerPlugin) {
		super();
		this.plugin = plugin;
		this.viewOnly = false;

		this.searchQuery = '';
		this.searchInstance = null;

		const { searchErrorDiv, searchErrorQuery } = createEmptySearchResultDiv();
		this.searchErrorDiv = searchErrorDiv;
		this.searchErrorQuery = searchErrorQuery;
	}

	/**
	 * Change the search query and re-render the panel.
	 * @param query The search query.
	 */
	public search(query: string): void {
		this.setSearchQuery(query);
		this.display();
	}

	/**
	 * Change the search query.
	 * @param query The search query.
	 */
	protected setSearchQuery(query: string): void {
		const split = query.split(':', 2);
		let prefix = 'id',
			search = query;
		if (split.length === 2) {
			prefix = split[0];
			search = split[1].trim();
		}

		// Set the search parameters.
		this.searchQuery = query;
		this.searchErrorQuery.textContent = search;
		this.doSearch(search, prefix);
	}

	/**
	 * Prepares the search filter function.
	 *
	 * @param query The query.
	 * @param queryPrefix The query prefix (type of query).
	 *
	 * @returns The search filter function.
	 */
	protected doSearch(query: string, queryPrefix: string): void {
		if (this.searchInstance == null) throw new Error('Not ready to search.');
		this.searchInstance.reset();

		// Search `id:` -- Search by ID.
		if (queryPrefix === 'id') {
			return this.searchInstance.search(
				'id',
				Operation.matches,
				query.toLocaleLowerCase().trim(),
				Actions.filter,
			);
		}

		// Search `icon:` -- Search by icon.
		if (queryPrefix === 'icon') {
			return this.searchInstance.search(
				'icon',
				Operation.matches,
				query.toLocaleLowerCase().trim(),
				Actions.filter,
			);
		}

		// Search `from:` -- Search by source.
		if (queryPrefix === 'from') {
			let from = query.toLocaleLowerCase().trim();
			if (from === 'obsidian' || from === 'built-in') from = 'builtin';

			return this.searchInstance.search(
				'from',
				Operation.matches,
				from,
				Actions.filter,
			);
		}
	}

	/**
	 * Refresh the callout previews.
	 * This regenerates the previews and their metadata from the list of callouts known to the plugin.
	 */
	protected refreshPreviews(): void {
		const { plugin, viewOnly } = this;

		this.searchInstance = new CalloutSearch(plugin.callouts.values(), {
			previewFactory: createPreviewFactory(viewOnly),
			emptySearchIncludesAll: true,
		});

		this.setSearchQuery(this.searchQuery);
	}

	protected onCalloutButtonClick(evt: MouseEvent) {
		let id = null;
		let hasButtonParent = false;
		for (let target = evt.targetNode; target != null && id == null; target = target?.parentElement) {
			if (target instanceof Element) {
				id = target.getAttribute('data-callout-manager-callout');
				if (target instanceof HTMLButtonElement) {
					hasButtonParent = true;
				}
			}
		}

		if (id != null && hasButtonParent) {
			this.nav.open(new EditCalloutPane(this.plugin, id, this.viewOnly));
		}
	}

	/** @override */
	public display(): void {
		const previews = [...(this.searchInstance?.results ?? [])].reverse();

		// Create a content element to render into.
		const contentEl = document.createDocumentFragment().createDiv();
		contentEl.addEventListener('click', this.onCalloutButtonClick.bind(this));

		// Render the previews.
		for (const preview of previews) {
			contentEl.appendChild(preview.previewEl);
		}

		// If no previews, show help instead.
		if (previews.length === 0) {
			contentEl.appendChild(this.searchErrorDiv);
		}

		// Clear the container.
		const { containerEl } = this;
		containerEl.empty();
		containerEl.appendChild(contentEl);
	}

	/** @override */
	public displayControls(): void {
		const { controlsEl } = this;

		new TextComponent(controlsEl)
			.setValue(this.searchQuery)
			.setPlaceholder('Filter callouts...')
			.onChange(this.search.bind(this));

		if (!this.viewOnly) {
			new ButtonComponent(controlsEl)
				.setIcon('lucide-plus')
				.setTooltip('New Callout')
				.onClick(() => this.nav.open(new CreateCalloutPane(this.plugin)))
				.then(({ buttonEl }) => buttonEl.classList.add('clickable-icon'));
		}
	}

	/** @override */
	protected restoreState(state: unknown): void {
		this.refreshPreviews();
	}

	/** @override */
	protected onReady(): void {
		this.refreshPreviews();
	}
}

function createPreviewFactory(viewOnly: boolean): (callout: Callout) => HTMLElement {
	const editButtonContent =
		(viewOnly ? getIcon('lucide-view') : getIcon('lucide-edit')) ?? document.createTextNode('Edit Callout');

	return (callout) => {
		const frag = document.createDocumentFragment();
		const calloutContainerEl = frag.createDiv({
			cls: ['calloutmanager-preview-container'],
			attr: {
				['data-callout-manager-callout']: callout.id,
			},
		});

		// Add the preview.
		new CalloutPreviewComponent(calloutContainerEl, {
			id: callout.id,
			icon: callout.icon,
			title: getTitleFromCallout(callout),
			color: getColorFromCallout(callout) ?? undefined,
		});

		// Add the edit button to the container.
		calloutContainerEl.classList.add('calloutmanager-preview-container-with-button');

		const editButton = calloutContainerEl.createEl('button');
		editButton.appendChild(editButtonContent.cloneNode(true));

		// Return the preview container.
		return calloutContainerEl;
	};
}

/**
 * Creates a div that can be used to show the user why the search query failed.
 */
function createEmptySearchResultDiv(): { searchErrorDiv: HTMLElement; searchErrorQuery: HTMLElement } {
	let searchErrorQuery!: HTMLElement;
	const searchErrorDiv = document.createElement('div');
	searchErrorDiv.className = 'calloutmanager-centerbox';
	const contentEl = searchErrorDiv.createDiv({ cls: 'calloutmanager-search-error' });

	// Title.
	contentEl.createEl('h2', { text: 'No callouts found.' });

	// Error message.
	contentEl.createEl('p', undefined, (el) => {
		el.createSpan({ text: 'Your search query ' });
		searchErrorQuery = el.createEl('code', { text: '' });
		el.createSpan({ text: ' did not return any results.' });
	});

	// Suggestions.
	contentEl.createDiv({ cls: 'calloutmanager-search-error-suggestions' }, (el) => {
		el.createDiv({ text: 'Try searching:' });
		el.createEl('ul', undefined, (el) => {
			el.createEl('li', { text: 'By name: ' }, (el) => {
				el.createEl('code', { text: 'warning' });
			});
			el.createEl('li', { text: 'By icon: ' }, (el) => {
				el.createEl('code', { text: 'icon:check' });
			});
			el.createEl('li', { text: 'Built-in callouts: ' }, (el) => {
				el.createEl('code', { text: 'from:obsidian' });
			});
			el.createEl('li', { text: 'Theme callouts: ' }, (el) => {
				el.createEl('code', { text: 'from:theme' });
			});
			el.createEl('li', { text: 'Snippet callouts: ' }, (el) => {
				el.createEl('code', { text: 'from:my snippet' });
			});
			el.createEl('li', { text: 'Custom callouts: ' }, (el) => {
				el.createEl('code', { text: 'from:custom' });
			});
		});
	});

	return { searchErrorDiv, searchErrorQuery };
}

// ---------------------------------------------------------------------------------------------------------------------
// Styles:
// ---------------------------------------------------------------------------------------------------------------------

declare const STYLES: `
	.calloutmanager-search-error {
		width: 60%;

		body.is-phone & {
			width: 100%;
		}

		code {
			word-break: break-all;
			color: var(--text-accent);
		}
	}

	.calloutmanager-search-error-suggestions {
		color: var(--text-muted);
	}

	.calloutmanager-preview-container-with-button {
		--calloutmanager-callout-edit-buttons-size: calc(var(--input-height) + 2 * var(--size-4-3));
		body.is-phone & {
			--calloutmanager-callout-edit-buttons-size: var(--input-height);
		}

		// Conver the preview into a grid.
		display: grid;
		grid-template-columns: 1fr var(--calloutmanager-callout-edit-buttons-size);

		align-items: center;
		gap: var(--size-4-2);

		// Ensure the button has a small width, but can grow tall.
		> button {
			width: var(--calloutmanager-callout-edit-buttons-size);
			height: 100%;

			// Fix rendering not working on non-phone devices.
			body:not(.is-phone) & {
				display: block;
				padding: 0 !important;
			}
		}
	}
`;
