import { ButtonComponent, SearchResult, TextComponent, getIcon, prepareFuzzySearch } from 'obsidian';

import { toHSV } from '&color';

import { Callout } from '../../api';
import { CalloutPreview, createCalloutPreview } from '../callout-preview';
import { getColorFromCallout } from '../callout-resolver';
import CalloutManagerPlugin from '../main';

import { CMSettingPane } from './CMSettingTab';
import { CreateCalloutPane } from './CreateCalloutPane';
import { EditCalloutPane } from './EditCalloutPane';

export class ManageCalloutsPane extends CMSettingPane {
	public readonly title = { title: 'Callouts', subtitle: 'Manage' };
	private readonly viewOnly: boolean;
	private plugin: CalloutManagerPlugin;

	private searchQuery: string;
	private searchFilter: null | ((callout: CalloutPreviewWithMetadata) => SearchResult | null);
	private previewCache: CalloutPreviewWithMetadata[];

	private searchErrorDiv: HTMLElement;
	private searchErrorQuery!: HTMLElement;

	public constructor(plugin: CalloutManagerPlugin) {
		super();
		this.plugin = plugin;

		this.searchQuery = '';
		this.searchFilter = null;
		this.previewCache = [];
		this.viewOnly = false;

		const { searchErrorDiv, searchErrorQuery } = createEmptySearchResultDiv();
		this.searchErrorDiv = searchErrorDiv;
		this.searchErrorQuery = searchErrorQuery;
	}

	/**
	 * Change the search query.
	 * @param query The search query.
	 */
	public search(query: string): void {
		const split = query.split(':', 2);
		let prefix = 'id',
			search = query;
		if (split.length === 2) {
			prefix = split[0];
			search = split[1].trim();
		}

		// Set the search parameters.
		this.searchFilter = this.prepareSearch(search, prefix);
		this.searchQuery = query;
		this.searchErrorQuery.textContent = search;

		// Refresh the display.
		this.display();
	}

	/**
	 * Prepares the search filter function.
	 *
	 * @param query The query.
	 * @param queryPrefix The query prefix (type of query).
	 *
	 * @returns The search filter function.
	 */
	protected prepareSearch(query: string, queryPrefix: string): ManageCalloutsPane['searchFilter'] {
		// Search `id:` -- Search by ID.
		if (queryPrefix === 'id') {
			const fuzzy = prepareFuzzySearch(query.toLowerCase());
			return (callout) => fuzzy(callout.properties.id);
		}

		// Search `icon:` -- Search by icon.
		if (queryPrefix === 'icon') {
			const fuzzy = prepareFuzzySearch(query.toLowerCase());
			return (callout) => fuzzy(callout.properties.icon.toLowerCase());
		}

		// Search `from:` -- Search by source.
		if (queryPrefix === 'from') {
			const queryLC = query.toLowerCase();
			const queryIsBuiltin = queryLC === 'obsidian' || queryLC === 'builtin' || queryLC === 'built-in';
			const fuzzy = prepareFuzzySearch(queryLC);

			const hasSnippetWithQueryAsId =
				this.plugin.callouts.snippets.keys().find((id) => id.toLowerCase() === queryLC) !== undefined;

			return (callout) => {
				let result = null;
				if (query === '') return { matches: [], score: 0 };

				for (const source of callout.sources) {
					// Special case: an exact match on the snippet ID.
					if (hasSnippetWithQueryAsId) {
						if (source.type === 'snippet' && source.snippet.toLowerCase() === queryLC)
							return { matches: [], score: -1 };
						continue;
					}

					// General cases:
					switch (source.type) {
						case 'builtin':
							if (queryIsBuiltin) return { matches: [], score: -1 };
							break;

						case 'custom':
							if (queryLC === 'custom') return { matches: [], score: -1 };
							break;

						case 'theme':
							if (queryLC === 'theme') return { matches: [], score: -1 };
							break;

						case 'snippet': {
							const snippetLC = source.snippet.toLowerCase();
							if (snippetLC === queryLC) return { matches: [], score: -1 };

							// Try matching fuzzily on the snippet name.
							const fuzzily = fuzzy(snippetLC);
							if (fuzzily != null && (result == null || fuzzily.score < result.score)) {
								result = fuzzily;
							}
						}
					}
				}

				return result;
			};
		}

		// Unknown prefix.
		return () => null;
	}

	/**
	 * Filter and sort callout previews based on the fuzzy search query.
	 * If there is no search query, previews will be sorted based on color.
	 *
	 * @param previews The previews to filter and sort.
	 * @returns The filtered and sorted previews.
	 */
	protected filterAndSort(previews: CalloutPreviewWithMetadata[]): CalloutPreviewWithMetadata[] {
		const { searchFilter } = this;
		if (searchFilter == null) {
			return previews.sort(comparePreviewByColor);
		}

		// Filter out the previews that don't match the search query.
		const filterMapped: Array<[CalloutPreviewWithMetadata, SearchResult]> = [];
		for (const preview of previews) {
			const result = searchFilter(preview);
			if (result != null) {
				filterMapped.push([preview, result]);
			}
		}

		// Sort the previews.
		filterMapped.sort(([aPreview, aResults], [bPreview, bResults]) => {
			const scoreDiff = bResults.score - aResults.score;
			if (scoreDiff != 0) return scoreDiff;
			return comparePreviewByColor(aPreview, bPreview);
		});

		// Return the previews.
		return filterMapped.map(([preview, _]) => preview);
	}

	/**
	 * Refresh the callout previews.
	 * This regenerates the previews and their metadata from the list of callouts known to the plugin.
	 */
	protected refreshPreviews(): void {
		const editButtonContent =
			(this.viewOnly ? getIcon('lucide-view') : getIcon('lucide-edit')) ??
			document.createTextNode('Edit Callout');

		const editButtonHandler = (evt: MouseEvent) => {
			let id = null;
			for (let target = evt.targetNode; target != null && id == null; target = target?.parentElement) {
				if (target instanceof Element) {
					id = target.getAttribute('data-callout-manager-callout');
				}
			}

			if (id != null) {
				this.nav.open(new EditCalloutPane(this.plugin, id, this.viewOnly));
			}
		};

		// Generate the cache of preview items.
		this.previewCache = [];
		for (const callout of this.plugin.callouts.values()) {
			const calloutContainerEl = document.createElement('div');
			calloutContainerEl.classList.add('callout-manager-preview-container');
			calloutContainerEl.setAttribute('data-callout-manager-callout', callout.id);

			// Add the preview.
			this.previewCache.push(
				attachMetadata(
					callout,
					calloutContainerEl,
					createCalloutPreview(calloutContainerEl.createDiv(), callout.id, {
						title: callout.id,

						// Since we can't detect icons or colors without an attachment to the DOM, we need to
						// provide the icon and color from the cache.
						overrideIcon: callout.icon,
						overrideColor: callout.color,
					}),
				),
			);

			// Add the edit button to the container.
			calloutContainerEl.classList.add('callout-manager-preview-container-with-button');

			const editButton = calloutContainerEl.createEl('button');
			editButton.appendChild(editButtonContent.cloneNode(true));
			editButton.addEventListener('click', editButtonHandler);
		}
	}

	/** @override */
	public display(): void {
		const { containerEl } = this;
		const previews = this.filterAndSort(this.previewCache);

		// Clear the container and re-render.
		containerEl.empty();
		for (const preview of previews) {
			containerEl.appendChild(preview.calloutContainerEl);
		}

		// If no previews, print help.
		if (previews.length === 0) {
			containerEl.appendChild(this.searchErrorDiv);
		}
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

/**
 * A {@link CalloutPreview} with attached metadata to make it easier to filter and search.
 */
interface CalloutPreviewWithMetadata extends CalloutPreview<true> {
	sources: Callout['sources'];
	calloutContainerEl: HTMLElement;
	colorValid: boolean;
	colorHue: number;
}

function attachMetadata(
	callout: Callout,
	calloutContainerEl: HTMLElement,
	preview: CalloutPreview<false>,
): CalloutPreviewWithMetadata {
	const color = getColorFromCallout(callout);
	return {
		...preview,
		sources: callout.sources,
		calloutContainerEl,
		properties: callout, // <-- The preview doesn't originally have properties as it wasn't created within the DOM.
		colorValid: color != null,
		colorHue: color == null ? 0 : toHSV(color).h,
	};
}

/**
 * Compares two callout previews by their hue.
 *
 * @param a The first preview.
 * @param b The second preview.
 * @returns `-1` if the a has a lower hue, `0` if they are the same, or `1` if a has a higher hue.
 */
function comparePreviewByColor(a: CalloutPreviewWithMetadata, b: CalloutPreviewWithMetadata): number {
	if (a.colorValid && !b.colorValid) return -1;
	if (b.colorValid && !a.colorValid) return 1;
	return a.colorHue - b.colorHue;
}

/**
 * Creates a div that can be used to show the user why the search query failed.
 */
function createEmptySearchResultDiv(): { searchErrorDiv: HTMLElement; searchErrorQuery: HTMLElement } {
	let searchErrorQuery!: HTMLElement;
	const searchErrorDiv = document.createElement('div');
	searchErrorDiv.className = 'callout-manager-setting-centerbox';
	const contentEl = searchErrorDiv.createDiv({ cls: 'callout-manager-search-error' });

	// Title.
	contentEl.createEl('h2', { text: 'No callouts found.' });

	// Error message.
	contentEl.createEl('p', undefined, (el) => {
		el.createSpan({ text: 'Your search query ' });
		searchErrorQuery = el.createEl('code', { text: '' });
		el.createSpan({ text: ' did not return any results.' });
	});

	// Suggestions.
	contentEl.createDiv({ cls: 'callout-manager-search-error-suggestions' }, (el) => {
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

declare const STYLES: `
	.callout-manager-search-error {
		width: 60%;

		body.is-phone & {
			width: 100%;
		}

		code {
			word-break: break-all;
			color: var(--text-accent);
		}
	}

	.callout-manager-search-error-suggestions {
		color: var(--text-muted);
	}

	.callout-manager-preview-container-with-button {
		--cm-edit-button-size: calc(var(--input-height) + 2 * var(--size-4-3));
		body.is-phone & {
			--cm-edit-button-size: var(--input-height);
		}

		// Conver the preview into a grid.
		display: grid;
		grid-template-columns: 1fr var(--cm-edit-button-size);

		align-items: center;
		gap: var(--size-4-2);

		// Ensure the button has a small width, but can grow tall.
		> button {
			width: var(--cm-edit-button-size);
			height: 100%;

			// Fix rendering not working on non-phone devices.
			body:not(.is-phone) & {
				display: block;
				padding: 0 !important;
			}
		}
	}
`;
