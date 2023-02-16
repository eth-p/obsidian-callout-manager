import { Events, App as ObsidianApp, Plugin } from 'obsidian';
import { getFloatingWindows } from 'obsidian-extra';

export class StylesheetApplier {
	private readonly styleEl: HTMLStyleElement;
	private readonly styleElInFloats: HTMLStyleElement[];
	private readonly app: ObsidianApp;
	private watching: boolean;

	public constructor(plugin: Plugin, id: string) {
		this.app = plugin.app;
		this.watching = false;

		this.styleElInFloats = [];
		this.styleEl = document.createElement('style');
		this.styleEl.setAttr('data-inject-plugin', plugin.manifest.id);
		this.styleEl.setAttr('data-inject-id', id);
	}

	/**
	 * Reapplies the stylesheet to all windows.
	 */
	public reapply(): void {
		const { styleEl } = this;

		this.unapply();
		this.foreachWindow((doc, isFloating) => {
			// Get the last style element.
			let lastEl = doc.head.lastElementChild;
			for (let el = lastEl; el != null; el = el.previousElementSibling) {
				lastEl = el;
				if (lastEl.tagName === 'STYLE') {
					break;
				}
			}

			// Insert the stylesheet after it.
			if (!isFloating) {
				lastEl?.insertAdjacentElement('afterend', styleEl);
				return;
			}

			// If it's a floating window, insert a clone.
			const styleElClone = styleEl.cloneNode(true) as HTMLStyleElement;
			this.styleElInFloats.push(styleElClone);
			lastEl?.insertAdjacentElement('afterend', styleElClone);
		});
	}

	/**
	 * Removes the stylesheet from all windows.
	 */
	public unapply(): void {
		this.styleElInFloats.splice(0, this.styleElInFloats.length).forEach((el) => el.remove());
		this.styleEl.detach();

		const dataInjectPlugin = this.styleEl.getAttribute('data-inject-plugin');
		const dataInjectId = this.styleEl.getAttribute('data-inject-id');
		this.foreachWindow((doc) => {
			for (const styleEl of Array.from(doc.head.querySelectorAll('style'))) {
				if (
					styleEl.getAttribute('data-inject-plugin') === dataInjectPlugin &&
					styleEl.getAttribute('data-inject-id') === dataInjectId
				) {
					styleEl.remove();
				}
			}
		});
	}

	public get textContent(): string {
		return this.styleEl.textContent ?? '';
	}

	public set textContent(stylesheet: string) {
		this.styleEl.textContent = stylesheet;
		for (const styleEl of this.styleElInFloats) {
			styleEl.textContent = stylesheet;
		}
	}

	/**
	 * Start applying the stylesheet to Obsidian.
	 * This listens for events that might cause the styles to be removed, and calls {@link reapply} automatically.
	 *
	 * @returns A function that will remove the event listeners.
	 */
	public start(): () => void {
		if (this.watching) {
			throw new Error('Already started.');
		}

		type EventListenerDeclaration = { event: string; listener: (...data: unknown[]) => void; target: Events };
		const events: Array<EventListenerDeclaration> = [
			{
				event: 'css-change',
				listener: () => this.reapply(),
				target: this.app.workspace,
			},
			{
				event: 'workspace-layout',
				listener: () => this.reapply(),
				target: this.app.workspace,
			},
		];

		// Register event listeners.
		for (const evtl of events) {
			evtl.target.on(evtl.event, evtl.listener);
		}

		// Check for changes.
		this.reapply();

		// Return cleanup function.
		return () => {
			this.unapply();
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

	protected foreachWindow(fn: (document: Document, isFloating: boolean) => void) {
		fn(this.app.workspace.containerEl.doc, true);
		for (const float of getFloatingWindows(this.app)) {
			fn(float.document, false);
		}
	}
}
