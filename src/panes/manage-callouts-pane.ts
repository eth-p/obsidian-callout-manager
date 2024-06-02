import { ButtonComponent, MarkdownView, TextComponent, getIcon } from 'obsidian';

import { Callout } from '&callout';
import { getColorFromCallout, getTitleFromCallout } from '&callout-util';
import CalloutManagerPlugin from '&plugin';

import { CalloutPreviewComponent } from '&ui/component/callout-preview';
import { UIPane } from '&ui/pane';

import { CalloutSearch, CalloutSearchResult, calloutSearch } from '../callout-search';

import { CreateCalloutPane } from './create-callout-pane';
import { EditCalloutPane } from './edit-callout-pane';
import { closeSettings } from 'obsidian-extra/unsafe';

/**
 * The user interface pane for changing Callout Manager settings.
 */
export class ManageCalloutsPane extends UIPane {
	public readonly title = { title: 'Callouts', subtitle: 'Manage' };
	private readonly viewOnly: boolean;
	private plugin: CalloutManagerPlugin;

	private searchQuery: string;
	private searchFn!: CalloutSearch<HTMLElement>;
	private callouts!: ReadonlyArray<CalloutSearchResult<HTMLElement>>;

	private setSearchError: undefined | ((message: string | false) => void);
	private searchErrorDiv: HTMLElement;
	private searchErrorQuery!: HTMLElement;

	public constructor(plugin: CalloutManagerPlugin) {
		super();
		this.plugin = plugin;
		this.viewOnly = false;
		this.searchQuery = '';

		const { searchErrorDiv, searchErrorQuery } = createEmptySearchResultDiv();
		this.searchErrorDiv = searchErrorDiv;
		this.searchErrorQuery = searchErrorQuery;
	}

	/**
	 * Change the search query and re-render the panel.
	 * @param query The search query.
	 */
	public search(query: string): void {
		this.doSearch(query);
		this.display();
	}

	protected doSearch(query: string): void {
		try {
			this.callouts = this.searchFn(query);
			this.setSearchError?.(false);
		} catch (ex) {
			this.setSearchError?.((ex as Error).message);
		}
	}

	/**
	 * Refresh the callout previews.
	 * This regenerates the previews and their metadata from the list of callouts known to the plugin.
	 */
	protected invalidate(): void {
		const { plugin, viewOnly } = this;

		this.searchFn = calloutSearch(plugin.callouts.values(), {
			preview: createPreviewFactory(viewOnly),
		});

		// Refresh the callout list.
		this.doSearch(this.searchQuery);
	}

	protected onCalloutButtonClick(evt: MouseEvent) {
		let id = null;
		let action = null;
		for (let target = evt.targetNode; target != null && (id == null || action == null); target = target?.parentElement) {
			console.log(id, action, target);
			if (!(target instanceof Element)) continue;

			// Find the callout ID.
			if (id == null) {
				id = target.getAttribute('data-callout-manager-callout');
			}

			// Find the button action.
			if (action == null) {
				action = target.getAttribute('data-callout-manager-action');
			}
		}

		// Do nothing if neither the callout nor action was found.
		if (id == null || action == null) {
			return;
		}

		// View/edit the selected callout.
		if (action === 'edit') {
			this.nav.open(new EditCalloutPane(this.plugin, id, this.viewOnly));
		}

		// Insert the selected callout.
		else if (action === 'insert') {
			const view = app.workspace.getActiveViewOfType(MarkdownView);

			// Make sure the user is editing a Markdown file.
			if (view) {
				const cursor = view.editor.getCursor();
				console.log("Inserting", id, cursor);
				view.editor.replaceRange(
					`> [!${id}]\n> Contents`,
					cursor
				)
				view.editor.setCursor(cursor.line + 1, 10)
				closeSettings(app)
			}
		}
	}

	/** @override */
	public display(): void {
		// Create a content element to render into.
		const contentEl = document.createDocumentFragment().createDiv();
		contentEl.addEventListener('click', this.onCalloutButtonClick.bind(this));

		// Render the previews.
		const { callouts } = this;
		for (const callout of callouts) {
			contentEl.appendChild(callout.preview);
		}

		// If no previews, show help instead.
		if (callouts.length === 0) {
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

		const filter = new TextComponent(controlsEl)
			.setValue(this.searchQuery)
			.setPlaceholder('Filter callouts...')
			.onChange(this.search.bind(this));

		this.setSearchError = (message) => {
			filter.inputEl.classList.toggle('mod-error', !!message);
			if (message) {
				filter.inputEl.setAttribute('aria-label', message);
			} else {
				filter.inputEl.removeAttribute('aria-label');
			}
		};

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
		this.invalidate();
	}

	/** @override */
	protected onReady(): void {
		this.invalidate();
	}
}

function createPreviewFactory(viewOnly: boolean): (callout: Callout) => HTMLElement {
	const editButtonContent =
		(viewOnly ? getIcon('lucide-view') : getIcon('lucide-edit')) ?? document.createTextNode('Edit Callout');

	const insertButtonContent =
		(viewOnly ? getIcon('lucide-view') : getIcon('lucide-forward')) ??
		document.createTextNode('Insert Callout');

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
		editButton.setAttribute('data-callout-manager-action', 'edit');
		editButton.appendChild(editButtonContent.cloneNode(true));

		// Add the insert button to the container.
		const insertButton = calloutContainerEl.createEl('button');
		insertButton.setAttribute('data-callout-manager-action', 'insert');
		insertButton.appendChild(insertButtonContent.cloneNode(true));

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
		grid-template-columns: 1fr var(--calloutmanager-callout-edit-buttons-size) var(--calloutmanager-callout-edit-buttons-size);

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
