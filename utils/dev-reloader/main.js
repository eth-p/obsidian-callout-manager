const obsidian = require('obsidian');
const { Plugin, Notice } = obsidian;

const RELOAD_DELAY_MS = 5000;
const RELOAD_FILES = new Set([
	'main.js',
	'manifest.json',
	'styles.css',
]);

class PluginReloader {
	constructor(app, id, dir) {
		this.app = app;
		this.id = id;
		this.dir = dir;

		this.isWatching = false;
		this.isReloadPending = false;
		this._onChangeTimeout = null;
		this._notice = null;
		this._noticeMessageLineEl = null;
		this._noticeHideTimeout = null;

		this.onChange = this.onChange.bind(this);
	}

	get pluginName() {
		return this.app.plugins.plugins[this.id]?.manifest?.name ?? this.id;
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

	onChange(_, file) {
		if (!RELOAD_FILES.has(file)) return;
		if (this._onChangeTimeout != null) {
			clearTimeout(this._onChangeTimeout);
		}

		if (!this.isReloadPending) {
			this.isReloadPending = true;
			this._updateNotice('Changed and will be reloaded soon.');
		}

		this._onChangeTimeout = setTimeout(() => {
			this._onChangeTimeout = null;
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
		}, RELOAD_DELAY_MS);
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
