import { SearchResult, TextComponent, getIconIds, prepareFuzzySearch } from 'obsidian';

import CalloutManagerPlugin from '../../main';
import { CMSettingPane, CMSettingPaneTitle } from '../CMSettingTab';
import { IconPreviewComponent } from '../component/IconPreviewComponent';

const recentIcons: Set<string> = new Set();

/**
 * A setting pane for selecting an icon.
 */
export class SelectIconPane extends CMSettingPane<void> {
	public readonly title: CMSettingPaneTitle;
	private plugin: CalloutManagerPlugin;

	private searchQuery: string;
	private searchResults: IconForSearch[];

	private usedIcons: Map<string, IconForSearch>;
	private allIcons: IconForSearch[];
	private previewLimit: number;
	private previewLimitOverage: number;
	private onChoose: (icon: string) => void;

	private compareIcons: (a: IconForSearch, b: IconForSearch) => number;

	public constructor(
		plugin: CalloutManagerPlugin,
		title: CMSettingPaneTitle,
		options: { limit?: number; onChoose: (icon: string) => void },
	) {
		super();
		this.title = title;
		this.plugin = plugin;
		this.onChoose = options.onChoose;

		this.previewLimit = options.limit ?? 250;
		this.previewLimitOverage = 0;

		this.searchQuery = '';
		this.searchResults = [];

		// Generate suggestions based on what other callouts are using.
		const usedIconIds = new Set(plugin.callouts.values().map((c) => c.icon));
		const usedIcons = (this.usedIcons = new Map());

		// Create an easily-searchable list of icons.
		this.allIcons = getIconIds().map((id) => {
			const icon: IconForSearch = {
				id,
				searchId: id.trim().toLowerCase(),
				component: null,
				searchResult: null,
			};

			if (usedIconIds.has(id)) {
				this.usedIcons.set(id, icon);
			}

			return icon;
		});

		// Create comparator function.
		this.compareIcons = (
			{ id: a, searchId: aLC, searchResult: aSR },
			{ id: b, searchId: bLC, searchResult: bSR },
		) => {
			const recency = (recentIcons.has(b) ? 1 : 0) - (recentIcons.has(a) ? 1 : 0);
			const suggested = (usedIcons.has(b) ? 1 : 0) - (usedIcons.has(a) ? 1 : 0);
			const searchRank = (bSR?.score ?? 0) - (aSR?.score ?? 0);

			// Ranked.
			const sum = recency + suggested + searchRank;
			if (sum !== 0) return sum;

			// Locale compare.
			return bLC.localeCompare(aLC);
		};
	}

	/**
	 * Change the search query.
	 * @param query The search query.
	 */
	public search(query: string): void {
		this.searchQuery = query;

		if (query === '') {
			this.resetSearchResults();
		} else {
			const search = prepareFuzzySearch(query.trim().toLowerCase());
			this.calculateSearchResults((icon) => search(icon.searchId));
		}

		this.display();
	}

	/**
	 * Update the search results list.
	 * @param search The search function.
	 */
	protected calculateSearchResults(search: (icon: IconForSearch) => SearchResult | null): void {
		this.searchResults = this.allIcons.filter((icon) => {
			icon.searchResult = search(icon);
			return icon.searchResult != null;
		});

		this.searchResults.sort(this.compareIcons);
		this.previewLimitOverage = this.searchResults.splice(this.previewLimit).length;
	}

	/**
	 * Reset the search results list to show a default list of suggested icons.
	 */
	protected resetSearchResults(): void {
		const { allIcons, previewLimit, usedIcons } = this;
		this.searchResults = Array.from(
			new Set([
				...allIcons.slice(0, previewLimit),
				...Array.from(usedIcons.values()).slice(0, previewLimit),
			]).values(),
		);

		// Sort.
		this.searchResults.sort(this.compareIcons).slice(0, this.previewLimit);
		this.previewLimitOverage = this.allIcons.length - this.searchResults.length;
	}

	/** @override */
	public display(): void {
		const { containerEl } = this;

		// Add the icons.
		const gridEl = document.createDocumentFragment().createDiv({ cls: 'calloutmanager-icon-picker' });
		for (const icon of this.searchResults) {
			if (icon.component == null) {
				icon.component = new IconPreviewComponent(gridEl).setIcon(icon.id).componentEl;
			} else {
				gridEl.appendChild(icon.component);
			}
		}

		// Add a delegated click listener.
		gridEl.addEventListener('click', ({ targetNode }) => {
			for (; targetNode != null && targetNode !== gridEl; targetNode = targetNode.parentElement) {
				if (!(targetNode instanceof HTMLElement)) continue;
				const iconId = targetNode.getAttribute('data-icon-id');
				if (iconId != null) {
					recentIcons.add(iconId);
					this.nav.close();
					this.onChoose(iconId);
					return;
				}
			}
		});

		// Clear the container and re-render.
		containerEl.empty();
		containerEl.appendChild(gridEl);

		// Add a message if there are too many icons to display.
		const { previewLimitOverage } = this;
		if (previewLimitOverage > 0) {
			const { pluralIs, pluralIcon } =
				previewLimitOverage === 1
					? { pluralIs: 'is', pluralIcon: 'icon' }
					: { pluralIs: 'are', pluralIcon: 'icons' };
			containerEl.createEl('p', {
				text:
					`There ${pluralIs} ${previewLimitOverage} more ${pluralIcon} to show. ` +
					`Refine your search to see more.`,
			});
		}
	}

	/** @override */
	public displayControls(): void {
		const { controlsEl } = this;

		new TextComponent(controlsEl)
			.setValue(this.searchQuery)
			.setPlaceholder('Search icons...')
			.onChange(this.search.bind(this));
	}

	/** @override */
	protected onReady(): void {
		this.resetSearchResults();
	}
}

interface IconForSearch {
	id: string;
	searchId: string;
	component: HTMLElement | null;
	searchResult: SearchResult | null;
}

declare const STYLES: `
	:root {
		--calloutmanager-icon-picker-size: 100px;
		--calloutmanager-icon-picker-gap: 8px;
		--calloutmanager-icon-picker-icon-size: 2.5em;
		--calloutmanager-icon-picker-id-size: 0.75em;
	}

	.calloutmanager-icon-picker {
		display: grid;

		grid-template-columns: repeat(auto-fill, var(--calloutmanager-icon-picker-size));
		grid-auto-rows: var(--calloutmanager-icon-picker-size);
		gap: var(--calloutmanager-icon-picker-gap);

		justify-content: center;

		.calloutmanager-icon-preview {
			height: 100%;

			--calloutmanager-icon-preview-icon-size: var(--calloutmanager-icon-picker-icon-size);
			--calloutmanager-icon-preview-id-size: var(--calloutmanager-icon-picker-id-size);
		}
	}
`;
