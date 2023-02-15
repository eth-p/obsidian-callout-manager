import { rgb } from 'color-convert';
import { HSV, RGB } from 'color-convert/conversions';

import { SearchResult, TextComponent, prepareFuzzySearch } from 'obsidian';

import { Callout, CalloutProperties } from '../../api';
import { CalloutPreview, createCalloutPreview } from '../callout-preview';
import CalloutManagerPlugin from '../main';

import { CMSettingPane } from './CMSettingTab';

export class ManageCalloutsPane extends CMSettingPane {
	public readonly title = { title: 'Callouts', subtitle: 'Manage' };
	private plugin: CalloutManagerPlugin;

	private searchQuery: string;
	private searchQueryProperty: keyof CalloutProperties;
	private searchFilter: null | ((text: string) => SearchResult | null);
	private previewCache: CalloutPreviewWithMetadata[];

	private searchErrorDiv: HTMLElement;
	private searchErrorQuery!: HTMLElement;

	public constructor(plugin: CalloutManagerPlugin) {
		super();
		this.plugin = plugin;

		this.searchQuery = '';
		this.searchQueryProperty = 'id';
		this.searchFilter = null;
		this.previewCache = [];

		const { searchErrorDiv, searchErrorQuery } = createEmptySearchResultDiv();
		this.searchErrorDiv = searchErrorDiv;
		this.searchErrorQuery = searchErrorQuery;
	}

	/**
	 * Change the search query.
	 * @param query The search query.
	 */
	public search(query: string): void {
		this.searchQuery = query;
		this.searchFilter = query === '' ? null : prepareFuzzySearch(query);
		this.searchErrorQuery.textContent = query;
		this.display();
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
			const result = searchFilter(preview.properties[this.searchQueryProperty]);
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
		this.previewCache = [];
		for (const callout of this.plugin.callouts.values()) {
			const calloutContainerEl = document.createElement('div');
			calloutContainerEl.classList.add('callout-manager-preview-container');

			this.previewCache.push(
				attachMetadata(
					callout,
					createCalloutPreview(calloutContainerEl, callout.id, {
						title: callout.id,

						// Since we can't detect icons or colors without an attachment to the DOM, we need to
						// provide the icon and color from the cache.
						overrideIcon: callout.icon,
						overrideColor: callout.color,
					}),
				),
			);
		}
	}

	/** @override */
	public display(): void {
		const { containerEl } = this;
		const previews = this.filterAndSort(this.previewCache);

		// Clear the container and re-render.
		containerEl.empty();
		for (const preview of previews) {
			containerEl.appendChild(preview.calloutEl);
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
interface CalloutPreviewWithMetadata extends CalloutPreview {
	colorValid: boolean;
	rgb: RGB;
	hsv: HSV;
}

function comparePreviewByColor(a: CalloutPreviewWithMetadata, b: CalloutPreviewWithMetadata): number {
	if (a.colorValid && !b.colorValid) return -1;
	if (b.colorValid && !a.colorValid) return 1;
	return a.hsv[0] - b.hsv[0];
}

function attachMetadata(callout: Callout, preview: CalloutPreview): CalloutPreviewWithMetadata {
	const colorRGB = callout.color.split(',').map((s) => parseInt(s.trim(), 10)) as RGB;
	const colorValid = colorRGB.length === 3 && colorRGB.find((v) => v < 0 || v > 255) === undefined;
	return {
		...preview,
		colorValid,
		rgb: colorValid ? colorRGB : [0, 0, 0],
		hsv: colorValid ? rgb.hsv(colorRGB) : [0, 0, 0],
	};
}

/**
 * Creates a div that can be used to show the user why their search query failed.
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
			el.createEl('li', { text: 'By name (example: "warning")' });
			el.createEl('li', { text: 'By icon (example: "icon:check")' });
		});
	});

	return { searchErrorDiv, searchErrorQuery };
}
