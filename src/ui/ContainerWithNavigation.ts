import { Container } from './Container';
import { Pane, PaneHost } from './Pane';

import { getIcon } from 'obsidian';

/**
 * A {@link Container} that can hold a stack of {@link Pane}s.
 */
export class ContainerWithNavigation extends Container {
	protected layers: NavigationLayer<unknown>[] = [];
	protected navOut: PaneHost['nav'];

	public constructor(contents?: Pane[], transformer?: (containerEl: HTMLElement) => HTMLElement) {
		super(undefined, transformer);

		if (contents != null) {
			for (const pane of contents) {
				this.layers.push({
					pane,
					state: NotInitialized,
					scroll: { top: 0, left: 0 },
				});
			}
		}

		// Create the outgoing nav object.
		this.navOut = {
			replace: (pane: Pane) => this.replace(pane),
			replaceAll: (pane: Pane) => this.replaceAll(pane),
			open: (pane: Pane) => this.push(pane),

			close: () => {
				this.pop();
				if (this.layers.length === 0) {
					this.nav.close();
				}
			},

			closeAll: () => {
				this.clear();
				this.nav.close();
			},
		};

		// Stub out render until we've opened the container.
		this.render = () => {};
	}

	public onClose(): void {
		this.clear();
		super.onClose();
	}

	public onOpen(): void {
		super.onOpen();

		if (this._childPane == null && this.layers.length > 0) {
			this.pop();
		}

		// Un-stub the render function.
		this.render = Object.getPrototypeOf(this).render;
	}

	public render(): void {
		// Render contents.
		super.render();

		// Create nav button.
		const { navEl } = this;
		if (navEl != null && this.layers.length > 0) {
			const back = navEl.createEl('button');
			back.appendChild(getIcon("lucide-arrow-left-circle") as SVGSVGElement);
			back.addEventListener('click', () => this.pop());
		}
	}

	// Functions.

	/**
	 * Pushes a pane to the top of the navigation stack.
	 * @param pane The pane.
	 */
	public push(pane: Pane) {
		this.suspendActive();
		this.childPane = pane;

		// Render.
		this.render();
	}

	/**
	 * Pops a pane from the navigation stack, discarding the currently-active pane.
	 * @returns The disposed pane.
	 */
	public pop(): Pane | undefined {
		const disposed = this.childPane;
		this.childPane = undefined;

		// Restore the pane underneath it and render.
		this.restoreTop();
		this.render();
		return disposed;
	}

	/**
	 * Replaces the active pane in the navigation stack.
	 * @returns The disposed pane.
	 */
	public replace(pane: Pane): Pane | undefined {
		const disposed = this.childPane;
		this.childPane = pane;

		// Render.
		this.render();
		return disposed;
	}

	/**
	 * Replaces all panes in the navigation stack.
	 * @returns The disposed panes.
	 */
	public replaceAll(pane: Pane): Pane[] {
		const disposed = this.clear();
		this.push(pane);
		this.render();
		return disposed;
	}

	/**
	 * Clears all panes in the navigation stack.
	 * The panes will not be restored from their state, but they will be closed.
	 *
	 * @returns The disposed panes.
	 */
	public clear(): Pane[] {
		this.suspendActive();

		const disposed: Pane[] = [];
		let top: NavigationLayer<unknown> | undefined;
		while ((top = this.layers.pop()) != undefined) {
			if (top.state !== NotInitialized) {
				top.pane.onClose();
			}

			disposed.push(top.pane);
		}

		this.render();
		return disposed;
	}

	/**
	 * Suspends the active pane and pushes it to the layers.
	 */
	protected suspendActive() {
		const scroll = this.scrollOffset;
		const suspended = this.suspendChild();
		if (suspended != null) {
			this.layers.push({
				...suspended,
				scroll,
			});
		}

		this.scrollOffset = { top: 0, left: 0 };
	}

	/**
	 * Restores the top layer.
	 */
	protected restoreTop() {
		const top = this.layers.pop();
		if (top == null) {
			return;
		}

		// Restore state.
		if (top.state === NotInitialized) {
			this.childPane = top.pane;
		} else {
			this.restoreChild(top.pane, top.state);
		}

		// Restore scroll position.
		this.scrollOffset = top.scroll;
	}
}

const NotInitialized = Symbol();
interface NavigationLayer<S> {
	pane: Pane<S>;
	state: S | typeof NotInitialized;
	scroll: { top: number; left: number };
}
