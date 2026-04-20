const obsidian = require('obsidian');
const { Plugin, Notice } = obsidian;

const FULL_RELOAD_DELAY_MS = 5000;
const FULL_RELOAD_FILES = new Set([
	'main.js',
	'manifest.json',
]);

const STYLE_RELOAD_DELAY_MS = 50;
const STYLE_RELOAD_FILES = new Set([
	'styles.css',
]);

const overriddenStylesEl = Symbol("Reloader-managed styles");

class PluginReloader {
	constructor(app, id, dir) {
		this.app = app;
		this.id = id;
		this.dir = dir;

		this.isWatching = false;
		this.isReloadPending = false;
		this._fullReloadTimeout = null;
		this._styleReloadTimeout = null;
		this._notice = null;
		this._noticeMessageLineEl = null;
		this._noticeHideTimeout = null;
		this._stylesRemoved = false;
		this._stylesEl = null;

		this.onChange = this.onChange.bind(this);
	}

	get plugin() {
		return this.app.plugins.plugins[this.id];
	}

	get pluginName() {
		return this.plugin?.manifest?.name ?? this.id;
	}

	async startWatching() {
		if (this.isWatching) {
			return;
		}

		this.isWatching = true;
		const vaultAdapter = this.app.vault.adapter;
		await vaultAdapter.startWatchPath(this.dir);
		vaultAdapter.watchers[this.dir].watcher.on('change', this.onChange);
	}

	async stopWatching() {
		if (!this.isWatching) {
			return;
		}

		this.isWatching = false;
		const vaultAdapter = this.app.vault.adapter;
		vaultAdapter.watchers[this.dir].watcher.removeListener('change', this.onChange);
		await this.app.vault.adapter.stopWatchPath(this.dir);
	}

	async reload() {
		await this.app.plugins.unloadPlugin(this.id);
		await this.app.plugins.loadPlugin(this.id);
	}

	async reloadStyles() {
		const plugin = this.plugin;

		// Remove the <style> created by Obsidian and replace it with
		// one created by this plugin.
		if (plugin[overriddenStylesEl] == null) {
			this._removeObsidianManagedStyles();
			plugin[overriddenStylesEl] = document.head.createEl('style');
			plugin.register(() => {
				plugin[overriddenStylesEl].detach();
			})
		}

		const newStylesFile = this.app.vault.adapter.path.join(this.dir, "styles.css");
		const newStyles = await this.app.vault.adapter.read(newStylesFile);
		plugin[overriddenStylesEl].textContent = newStyles;
	}

	// This is a terrible hack, but there's no way to get a reference to the
	// <style> created by Obsidian, nor is there a guaranteed way to identify
	// the `register()` handler used to remove that <style> element.
	//
	// We just have to make do with matching it based on the function's source
	// string and likely position in the list.
	_removeObsidianManagedStyles() {
		const pattern = /^function\(\)\{return [a-z]\.detach\(\)\}$/;
		const cleanupFuncs = this.plugin._events;
		for (let i = cleanupFuncs.length - 1; i >= 0; i--) {
			const func = cleanupFuncs[i];
			if (pattern.test(func.toString())) {
				func();
				cleanupFuncs[i] = () => {};
				return;
			}
		}

		console.warn(`Could not remove styles for plugin ${this.id}.`);
	}

	onChange(_, file) {
		if (FULL_RELOAD_FILES.has(file)) {
			this._debouncedFullReload();
		}

		if (STYLE_RELOAD_FILES.has(file)) {
			this._debouncedStyleReload();
		}
	}

	_debouncedFullReload() {
		if (this._fullReloadTimeout != null) {
			clearTimeout(this._fullReloadTimeout);
		}

		if (!this.isReloadPending) {
			this.isReloadPending = true;
			this._updateNotice('Changed and will be reloaded soon.');
		}

		this._fullReloadTimeout = setTimeout(() => {
			this._fullReloadTimeout = null;
			this.isReloadPending = false;
			(async () => {
				this._updateNotice('Is reloading...');
				try {
					await this.reload();
					this._updateNotice('Reloaded successfully.');
					this._hideNoticeIn(5000);
				} catch (e) {
					this._updateNotice('Could not be reloaded.');
					console.error(`Could not reload ${this.id}:`, e);
				}
			})();
		}, FULL_RELOAD_DELAY_MS);
	}

	_debouncedStyleReload() {
		if (this._styleReloadTimeout != null) {
			clearTimeout(this._styleReloadTimeout);
		}

		this._styleReloadTimeout = setTimeout(() => {
			this._styleReloadTimeout = null;
			(async () => {
				try {
					await this.reloadStyles()
				} catch (e) {
					console.error(`Could not reload styles of ${this.id}:`, e);
				}
			})();
		}, STYLE_RELOAD_DELAY_MS);
	}

	_updateNotice(msg) {
		if (this._notice != null) {
			if (this._noticeHideTimeout != null) {
				clearTimeout(this._noticeHideTimeout);
				this._noticeHideTimeout = null;
			}

			this._noticeMessageLineEl.textContent = msg;
			return
		}

		// A new notice needs to be created.
		const frag = document.createDocumentFragment();
		frag.createEl('b', { text: `Plugin: ${this.pluginName}`, style: { fontSize: '1.1em' } });
		frag.createEl('br');
		this._noticeMessageLineEl = frag.createEl('span', { text: msg });
		this._notice = new Notice(frag, 0);
	}

	_hideNoticeIn(ms) {
		if (this._noticeHideTimeout != null) {
			clearTimeout(this._noticeHideTimeout);
		}

		setTimeout(() => {
			this._noticeHideTimeout = null;
			this._notice.hide();
			this._notice = null;
		}, ms);
	}
}

module.exports.default = class ReloaderPlugin extends Plugin {
	async onload() {
		this.plugins = new Map();
		this.app.workspace.onLayoutReady(async () => {
			await this.watchPlugin('callout-manager-dev-reloader');
			await this.watchPlugin('callout-manager');
		});
	}

	async onunload() {
		await Promise.all(
			Array.from(this.plugins.values())
				.map(reloader => reloader.stopWatching())
		)
	}

	async watchPlugin(id) {
		const dir = this.app.plugins.manifests[id].dir;
		const reloader = new PluginReloader(this.app, id, dir);
		await reloader.startWatching();

		this.plugins.set(id, reloader);
	}

};
