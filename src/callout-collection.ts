import { SnippetID, ThemeID } from 'obsidian-undocumented';

import { Callout, CalloutID, CalloutSource } from '../api';

/**
 * A collection of Callout IDs.
 */
export class CalloutCollection {
	private resolver: (id: string) => Omit<Callout, 'sources'>;

	private invalidated: Set<CachedCallout>;
	private invalidationCount: number;
	private cacheById: Map<CalloutID, CachedCallout>;
	private cached: boolean;

	public readonly snippets: CalloutCollectionSnippets;
	public readonly builtin: CalloutCollectionObsidian;
	public readonly theme: CalloutCollectionTheme;
	public readonly custom: CalloutCollectionCustom;

	public constructor(resolver: (id: string) => Omit<Callout, 'sources'>) {
		this.resolver = resolver;
		this.invalidated = new Set();
		this.invalidationCount = 0;
		this.cacheById = new Map();
		this.cached = false;

		this.snippets = new CalloutCollectionSnippets(this.invalidateSource.bind(this));
		this.builtin = new CalloutCollectionObsidian(this.invalidateSource.bind(this));
		this.theme = new CalloutCollectionTheme(this.invalidateSource.bind(this));
		this.custom = new CalloutCollectionCustom(this.invalidateSource.bind(this));
	}

	public get(id: CalloutID): Callout | undefined {
		if (!this.cached) this.buildCache();
		const cached = this.cacheById.get(id);
		if (cached === undefined) {
			return undefined;
		}

		// Ensure the callout is resolved.
		if (this.invalidated.has(cached)) {
			this.resolveOne(cached);
		}

		// Return the callout.
		return cached.callout as Callout;
	}

	/**
	 * Gets all the known {@link CalloutID callout IDs}.
	 * @returns The callout IDs.
	 */
	public keys(): CalloutID[] {
		if (!this.cached) this.buildCache();
		return Array.from(this.cacheById.keys());
	}

	/**
	 * Gets all the known {@link Callout callouts}.
	 * @returns The callouts.
	 */
	public values(): Callout[] {
		if (!this.cached) this.buildCache();
		this.resolveAll();
		return Array.from(this.cacheById.values()).map((c) => c.callout as Callout);
	}

	/**
	 * Returns a function that will return `true` if the collection has changed since the function was created.
	 * @returns The function.
	 */
	public hasChanged(): () => boolean {
		const countSnapshot = this.invalidationCount;
		return () => this.invalidationCount !== countSnapshot;
	}

	/**
	 * Resolves the settings of a callout.
	 * This removes it from the set of invalidated callout caches.
	 *
	 * @param cached The callout's cache entry.
	 */
	protected resolveOne(cached: CachedCallout) {
		this.doResolve(cached);
		this.invalidated.delete(cached);
	}

	/**
	 * Resolves the settings of all callouts.
	 */
	protected resolveAll() {
		for (const cached of this.invalidated.values()) {
			this.doResolve(cached);
		}

		this.invalidated.clear();
	}

	protected doResolve(cached: CachedCallout) {
		cached.callout = this.resolver(cached.id) as Callout;
		cached.callout.sources = Array.from(cached.sources.values()).map(sourceFromKey);
	}

	/**
	 * Builds the initial cache of callouts.
	 * This creates the cache entries and associates them to a source.
	 */
	protected buildCache() {
		this.invalidated.clear();
		this.cacheById.clear();

		// Add Obsidian callouts:
		{
			const source = sourceToKey({ type: 'builtin' });
			for (const callout of this.builtin.get()) {
				this.addCalloutSource(callout, source);
			}
		}

		// Add theme callouts:
		if (this.theme.theme != null) {
			const source = sourceToKey({ type: 'theme', theme: this.theme.theme });
			for (const callout of this.theme.get()) {
				this.addCalloutSource(callout, source);
			}
		}

		// Add snippet callouts:
		for (const snippet of this.snippets.keys()) {
			const source = sourceToKey({ type: 'snippet', snippet });
			for (const callout of this.snippets.get(snippet) as CalloutID[]) {
				this.addCalloutSource(callout, source);
			}
		}

		// Add custom callouts:
		{
			const source = sourceToKey({ type: 'custom' });
			for (const callout of this.custom.keys()) {
				this.addCalloutSource(callout, source);
			}
		}

		// Mark as cached so we don't rebuild unnecessarily.
		this.cached = true;
	}

	/**
	 * Marks a callout as invalidated.
	 * This forces the callout to be resolved again.
	 *
	 * @param id The callout ID.
	 */
	public invalidate(id: CalloutID): void {
		if (!this.cached) return;
		const callout = this.cacheById.get(id);
		if (callout !== undefined) {
			this.invalidated.add(callout);
		}
	}

	protected addCalloutSource(id: string, sourceKey: string) {
		let callout = this.cacheById.get(id);
		if (callout == null) {
			callout = new CachedCallout(id);
			this.cacheById.set(id, callout);
		}

		callout.sources.add(sourceKey);
		this.invalidated.add(callout);
	}

	protected removeCalloutSource(id: string, sourceKey: string) {
		const callout = this.cacheById.get(id);
		if (callout == null) {
			return;
		}

		callout.sources.delete(sourceKey);
		if (callout.sources.size === 0) {
			this.cacheById.delete(id);
			this.invalidated.delete(callout);
		}
	}

	/**
	 * Called whenever a callout source has any changes.
	 * This will add or remove callouts from the cache, or invalidate a callout to mark it as requiring re-resolving.
	 *
	 * @param src The source that changed.
	 * @param data A diff of changes.
	 */
	protected invalidateSource(
		src: CalloutSource,
		data: { added: CalloutID[]; removed: CalloutID[]; changed: CalloutID[] },
	): void {
		const sourceKey = sourceToKey(src);
		if (!this.cached) {
			return;
		}

		for (const removed of data.removed) {
			this.removeCalloutSource(removed, sourceKey);
		}

		for (const added of data.added) {
			this.addCalloutSource(added, sourceKey);
		}

		for (const changed of data.changed) {
			const callout = this.cacheById.get(changed);
			if (callout != null) {
				this.invalidated.add(callout);
			}
		}

		this.invalidationCount++;
	}
}

class CachedCallout {
	public readonly id: CalloutID;
	public readonly sources: Set<string>;
	public callout: Callout | null;

	public constructor(id: CalloutID) {
		this.id = id;
		this.sources = new Set();
		this.callout = null;
	}
}

/**
 * A container for callout IDs that came from a snippet.
 */
class CalloutCollectionSnippets {
	private data = new Map<SnippetID, Set<CalloutID>>();
	private invalidate: CalloutCollection['invalidateSource'];

	public constructor(invalidate: CalloutCollection['invalidateSource']) {
		this.invalidate = invalidate;
	}

	public get(id: SnippetID): CalloutID[] | undefined {
		const value = this.data.get(id);
		if (value === undefined) {
			return undefined;
		}

		return Array.from(value.values());
	}

	public set(id: SnippetID, callouts: CalloutID[]): void {
		const source: CalloutSource = { type: 'snippet', snippet: id };
		const old = this.data.get(id);
		const updated = new Set(callouts);
		this.data.set(id, updated);

		// If there was nothing before, all the callouts were added.
		if (old === undefined) {
			this.invalidate(source, { added: callouts, changed: [], removed: [] });
			return;
		}

		// If there was something here already, calculate a diff.
		const diffs = diff(old, updated);
		this.invalidate(source, {
			added: diffs.added,
			removed: diffs.removed,
			changed: diffs.same,
		});
	}

	public delete(id: SnippetID): boolean {
		const old = this.data.get(id);
		const deleted = this.data.delete(id);
		if (old !== undefined) {
			this.invalidate(
				{ type: 'snippet', snippet: id },
				{
					added: [],
					changed: [],
					removed: Array.from(old.keys()),
				},
			);
		}

		return deleted;
	}

	public clear(): void {
		for (const id of Array.from(this.data.keys())) {
			this.delete(id);
		}
	}

	public keys(): SnippetID[] {
		return Array.from(this.data.keys());
	}
}

/**
 * A container for callout IDs that came from Obsidian's defaults.
 */
class CalloutCollectionObsidian {
	private data = new Set<CalloutID>();
	private invalidate: CalloutCollection['invalidateSource'];

	public constructor(invalidate: CalloutCollection['invalidateSource']) {
		this.invalidate = invalidate;
	}

	public set(callouts: CalloutID[]) {
		const old = this.data;
		const updated = (this.data = new Set(callouts));

		const diffs = diff(old, updated);
		this.invalidate(
			{ type: 'builtin' },
			{
				added: diffs.added,
				removed: diffs.removed,
				changed: diffs.same,
			},
		);
	}

	public get(): CalloutID[] {
		return Array.from(this.data.values());
	}
}

/**
 * A container for callout IDs that came from a theme.
 */
class CalloutCollectionTheme {
	private data = new Set<CalloutID>();
	private invalidate: CalloutCollection['invalidateSource'];
	private oldTheme: string | null;

	public constructor(invalidate: CalloutCollection['invalidateSource']) {
		this.invalidate = invalidate;
		this.oldTheme = '';
	}

	public get theme(): string | null {
		return this.oldTheme;
	}

	public set(theme: ThemeID, callouts: CalloutID[]) {
		const old = this.data;
		const oldTheme = this.oldTheme;

		const updated = (this.data = new Set(callouts));
		this.oldTheme = theme;

		if (this.oldTheme === theme) {
			const diffs = diff(old, updated);
			this.invalidate(
				{ type: 'theme', theme },
				{
					added: diffs.added,
					removed: diffs.removed,
					changed: diffs.same,
				},
			);
			return;
		}

		// The theme changed.
		// In this case, all the old callouts were removed and all the new callouts were added.
		this.invalidate(
			{ type: 'theme', theme: oldTheme ?? '' },
			{
				added: [],
				removed: Array.from(old.values()),
				changed: [],
			},
		);

		this.invalidate(
			{ type: 'theme', theme },
			{
				added: callouts,
				removed: [],
				changed: [],
			},
		);
	}

	public delete(): void {
		const old = this.data;
		const oldTheme = this.oldTheme;

		this.data = new Set();
		this.oldTheme = null;

		this.invalidate(
			{ type: 'theme', theme: oldTheme ?? '' },
			{
				added: [],
				removed: Array.from(old.values()),
				changed: [],
			},
		);
	}

	public get(): CalloutID[] {
		return Array.from(this.data.values());
	}
}

/**
 * A container for callout IDs that were created by the Callout Manager plugin.
 */
class CalloutCollectionCustom {
	private data: CalloutID[] = [];
	private invalidate: CalloutCollection['invalidateSource'];

	public constructor(invalidate: CalloutCollection['invalidateSource']) {
		this.invalidate = invalidate;
	}

	public has(id: CalloutID): boolean {
		return undefined !== this.data.find((existingId) => existingId === id);
	}

	public add(...ids: CalloutID[]): void {
		const set = new Set(this.data);
		const added = [];

		// Add the new callouts.
		for (const id of ids) {
			if (!set.has(id)) {
				added.push(id);
				set.add(id);
				this.data.push(id);
			}
		}

		// Invalidate.
		if (added.length > 0) {
			this.invalidate({ type: 'custom' }, { added, removed: [], changed: [] });
		}
	}

	public delete(...ids: CalloutID[]): void {
		const { data } = this;
		const removed = [];

		// Add the new callouts.
		for (const id of ids) {
			const index = data.findIndex((existingId) => id === existingId);
			if (index !== undefined) {
				data.splice(index, 1);
				removed.push(id);
			}
		}

		// Invalidate.
		if (removed.length > 0) {
			this.invalidate({ type: 'custom' }, { added: [], removed, changed: [] });
		}
	}

	public keys(): CalloutID[] {
		return this.data.slice(0);
	}

	public clear(): void {
		const removed = this.data;
		this.data = [];
		this.invalidate({ type: 'custom' }, { added: [], removed, changed: [] });
	}
}

function diff<T>(before: Set<T>, after: Set<T>): { added: T[]; removed: T[]; same: T[] } {
	const added: T[] = [];
	const removed: T[] = [];
	const same: T[] = [];

	for (const item of before.values()) {
		(after.has(item) ? same : removed).push(item);
	}

	for (const item of after.values()) {
		if (!before.has(item)) {
			added.push(item);
		}
	}

	return { added, removed, same };
}

/**
 * Converts a callout source into a unique and deserializable string that uniquely represents the source.
 * This allows the source to be used in a set or as a map key.
 *
 * @param source The source.
 * @returns The source as a string.
 */
function sourceToKey(source: CalloutSource): string {
	switch (source.type) {
		case 'builtin':
			return 'builtin';
		case 'snippet':
			return `snippet:${source.snippet}`;
		case 'theme':
			return `theme:${source.theme}`;
		case 'custom':
			return `custom`;
	}
}

/**
 * Converts a key created from {@link sourceToKey} back into a {@link CalloutSource}.
 *
 * @param sourceKey The source key.
 * @returns The source as an object.
 */
function sourceFromKey(sourceKey: string): CalloutSource {
	if (sourceKey === 'builtin') {
		return { type: 'builtin' };
	}

	if (sourceKey === 'custom') {
		return { type: 'custom' };
	}

	if (sourceKey.startsWith('snippet:')) {
		return { type: 'snippet', snippet: sourceKey.substring('snippet:'.length) };
	}

	if (sourceKey.startsWith('theme:')) {
		return { type: 'theme', theme: sourceKey.substring('theme:'.length) };
	}

	throw new Error('Unknown source key: ' + sourceKey);
}
