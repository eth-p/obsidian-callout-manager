import { Events, App as ObsidianApp } from 'obsidian';
import {
	fetchObsidianStyles,
	getCurrentThemeID,
	getSnippetStyleElements,
	getThemeManifest,
	getThemeStyleElement,
} from 'obsidian-extra';
import { App, Latest, SnippetID, ThemeID } from 'obsidian-undocumented';

/**
 * Finds and watches for changes to any of the applied CSS stylesheets.
 * This is used to prevent unnecessary parsing of unchanged stylesheets.
 */
export default class StylesheetWatcher {
	protected cachedObsidian: string | null | false;
	protected cachedTheme: { id: ThemeID; version: string; contents: string } | null;
	protected cachedSnippets: Map<SnippetID, string>;
	protected listeners: Map<string, Set<(...data: unknown[]) => void>>;

	protected watching: boolean;
	protected app: App;
	protected disableObsidianStylesheet: boolean;

	public constructor(app: ObsidianApp, disableObsidianStylesheet: boolean) {
		this.app = app as App<Latest>;

		this.listeners = new Map();
		this.cachedSnippets = new Map();
		this.cachedObsidian = disableObsidianStylesheet ? false : null;
		this.cachedTheme = null;
		this.watching = false;

		this.disableObsidianStylesheet = disableObsidianStylesheet;
	}

	/**
	 * Start watching for changes to stylesheets.
	 * @returns A callback function to pass to {@link Plugin.register}.
	 */
	public watch(): () => void {
		if (this.watching) {
			throw new Error('Already watching.');
		}

		type EventListenerDeclaration = { event: string; listener: (...data: unknown[]) => void; target: Events };
		const events: Array<EventListenerDeclaration> = [
			{
				event: 'css-change',
				listener: () => this.checkForChanges(false),
				target: this.app.workspace,
			},
		];

		// Register event listeners.
		for (const evtl of events) {
			evtl.target.on(evtl.event, evtl.listener);
		}

		// Check for changes.
		this.checkForChanges();

		// Return cleanup function.
		return () => {
			if (!this.watching) {
				return;
			}

			// Unregister event listeners.
			for (const evtl of events) {
				evtl.target.off(evtl.event, evtl.listener);
			}

			this.watching = false;
		};
	}

	/**
	 * Register an event listener to be called whenever a stylesheet is added.
	 *
	 * @param event The `add` event.
	 * @param listener The listener to be called.
	 */
	public on(event: 'add', listener: (stylesheet: SnippetStylesheet | ThemeStylesheet) => void): void;

	/**
	 * Register an event listener to be called whenever a stylesheet changes.
	 *
	 * @param event The `change` event.
	 * @param listener The listener to be called.
	 */
	public on(
		event: 'change',
		listener: (stylesheet: SnippetStylesheet | ThemeStylesheet | ObsidianStylesheet) => void,
	): void;

	/**
	 * Register an event listener to be called whenever a stylesheet is removed.
	 *
	 * @param event The `remove` event.
	 * @param listener The listener to be called.
	 */
	public on(event: 'remove', listener: (stylesheet: SnippetStylesheet | ThemeStylesheet) => void): void;

	/**
	 * Register an event listener to be called whenever the {@link StylesheetWatcher} starts checking for changes.
	 *
	 * @param event The `checkStarted` event.
	 * @param listener The listener to be called.
	 */
	public on(event: 'checkStarted', listener: () => void): void;

	/**
	 * Register an event listener to be called whenever the {@link StylesheetWatcher} finishes checking for changes.
	 *
	 * @param event The `checkComplete` event.
	 * @param listener The listener to be called.
	 */
	public on(event: 'checkComplete', listener: (anyChanges: boolean) => void): void;

	/**
	 * @internal
	 */
	public on<E extends keyof StylesheetWatcherEvents>(event: E, listener: StylesheetWatcherEvents[E]): void {
		let listenersForEvent = this.listeners.get(event);
		if (listenersForEvent === undefined) {
			listenersForEvent = new Set();
			this.listeners.set(event, listenersForEvent);
		}

		listenersForEvent.add(listener as (...data: unknown[]) => void);
	}

	/**
	 * Removes an event listener.
	 *
	 * @param event The event.
	 * @param listener The listener to remove.
	 */
	public off<E extends keyof StylesheetWatcherEvents>(event: E, listener: StylesheetWatcherEvents[E]): void {
		const listenersForEvent = this.listeners.get(event);
		if (listenersForEvent === undefined) {
			return;
		}

		listenersForEvent.delete(listener as (...data: unknown[]) => void);
		if (listenersForEvent.size === 0) {
			this.listeners.delete(event);
		}
	}

	protected emit<E extends keyof StylesheetWatcherEvents>(
		event: E,
		...data: Parameters<StylesheetWatcherEvents[E]>
	): void {
		const listenersForEvent = this.listeners.get(event);
		if (listenersForEvent === undefined) {
			return;
		}

		for (const listener of listenersForEvent) {
			listener(...data);
		}
	}

	/**
	 * Checks for any changes to the application stylesheets.
	 * If {@link watch} is being used, this will be called automatically.
	 *
	 * @param clear If set to true, the cache will be cleared.
	 * @returns True if there were any changes.
	 */
	public async checkForChanges(clear?: boolean): Promise<boolean> {
		let changed = false;
		this.emit('checkStarted');

		// Clear caches.
		if (clear === true) {
			this.cachedSnippets.clear();
			this.cachedTheme = null;
			this.cachedObsidian = null;
		}

		// Fetch the Obsidian stylesheet.
		if (this.cachedObsidian == null && !this.disableObsidianStylesheet) {
			changed = (await this.checkForChangesObsidian()) || changed;
		}

		// Check snippet and theme stylesheets.
		changed = this.checkForChangesSnippets() || changed;
		changed = this.checkForChangesTheme() || changed;

		this.emit('checkComplete', changed);
		return changed;
	}

	/**
	 * Attempts to fetch the Obsidian built-in stylesheet.
	 * This will fail if the version of obsidian is newer than the version supported by `obsidian-extra`.
	 *
	 * @returns true if the fetch was successful.
	 */
	protected async checkForChangesObsidian(): Promise<boolean> {
		if (this.cachedObsidian === false) {
			// Explicitly unsupported.
			return false;
		}

		try {
			this.cachedObsidian = await fetchObsidianStyles(this.app);
			this.emit('change', {
				type: 'obsidian',
				styles: this.cachedObsidian,
			});

			return true;
		} catch (ex) {
			this.cachedObsidian = false;
			console.warn('Unable to fetch Obsidian stylesheet.', ex);
			return false;
		}
	}

	/**
	 * Checks for changes in the application's theme.
	 */
	protected checkForChangesTheme(): boolean {
		// Get the current theme and its manifest.
		const theme = getCurrentThemeID(this.app);
		const themeManifest = theme == null ? null : getThemeManifest(this.app, theme);
		const hasTheme = theme != null && themeManifest != null;
		const styleEl = getThemeStyleElement(this.app);
		const styles = styleEl?.textContent ?? '';

		// If there is no longer a theme, the theme was reset to default.
		if (this.cachedTheme != null && !hasTheme) {
			this.emit('remove', { type: 'theme', theme: this.cachedTheme.id, styles: this.cachedTheme.contents });
			this.cachedTheme = null;
			return true;
		}

		// If there is now a theme, the theme was changed from default.
		if (this.cachedTheme == null && hasTheme) {
			this.cachedTheme = { id: theme, version: themeManifest.version, contents: styles };
			this.emit('add', { type: 'theme', theme: theme, styles });
			return true;
		}

		// Having handled the two cases where a theme was either added or removed,
		// we should return if we don't have a theme anymore since there's nothing to compare.
		if (!hasTheme || this.cachedTheme == null) {
			return false;
		}

		// Compare the properties of the active theme and the cached theme:
		const changed =
			this.cachedTheme.id !== theme || // Active theme changed
			this.cachedTheme.version !== themeManifest.version || // Version of active theme changed
			this.cachedTheme.contents !== styles; // Styles of active theme changed

		if (changed) {
			this.cachedTheme = {
				id: theme,
				version: themeManifest.version,
				contents: styles,
			};
			this.emit('change', { type: 'theme', theme: theme, styles });
		}

		return changed;
	}

	/**
	 * Checks for changes in the enabled snippets.
	 */
	protected checkForChangesSnippets(): boolean {
		let anyChanges = false;
		const snippets = getSnippetStyleElements(this.app);
		const knownSnippets = Array.from(this.cachedSnippets.entries());

		// Check for changed or deleted snippets.
		for (const [id, cachedStyles] of knownSnippets) {
			const styleEl = snippets.get(id);

			// If no snippet with that ID is in the map of enabled snippets we got back, it was deleted or disabled.
			if (styleEl == null) {
				this.cachedSnippets.delete(id);
				this.emit('remove', { type: 'snippet', snippet: id, styles: cachedStyles });
				anyChanges = true;
				continue;
			}

			// If the textContent is different, the snippet was changed.
			if (styleEl.textContent != null && styleEl.textContent !== cachedStyles) {
				this.cachedSnippets.set(id, styleEl.textContent);
				this.emit('change', { type: 'snippet', snippet: id, styles: styleEl.textContent });
				anyChanges = true;
			}
		}

		// Check for added snippets.
		for (const [id, styleEl] of snippets.entries()) {
			if (styleEl == null) continue;
			if (!this.cachedSnippets.has(id) && styleEl.textContent != null) {
				this.cachedSnippets.set(id, styleEl.textContent);
				this.emit('add', { type: 'snippet', snippet: id, styles: styleEl.textContent });
				anyChanges = true;
			}
		}

		// Return.
		return anyChanges;
	}

	/**
	 * Returns true if fetching the Obsidian stylesheet is supported.
	 */
	public isObsidianStylesheetSupported(): boolean {
		return !this.disableObsidianStylesheet && this.cachedObsidian !== false;
	}
}

/**
 * The events available on a {@link StylesheetWatcher}.
 */
export interface StylesheetWatcherEvents {
	add(stylesheet: SnippetStylesheet | ThemeStylesheet): void;
	change(stylesheet: SnippetStylesheet | ThemeStylesheet | ObsidianStylesheet): void;
	remove(stylesheet: SnippetStylesheet | ThemeStylesheet): void;
	checkComplete(anyChanges: boolean): void;
	checkStarted(): void;
}

export interface SnippetStylesheet {
	type: 'snippet';

	snippet: SnippetID;
	styles: string;
}

export interface ThemeStylesheet {
	type: 'theme';

	theme: ThemeID;
	styles: string;
}

export interface ObsidianStylesheet {
	type: 'obsidian';
	styles: string;
}
