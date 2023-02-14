import { Container } from './Container';
import { Pane } from './Pane';

/**
 * A {@link Container} that can scroll.
 */
export class ContainerWithScroll extends Container {
	private _scrollEl: HTMLElement;

	public constructor(contents?: Pane, transformer?: (containerEl: HTMLElement) => HTMLElement) {
		super(contents, (el) => {
			el.classList.add('callout-manager-pane-scrollable');
			return el;
		});

		this._scrollEl = this.contentElOut as HTMLElement;
		if (transformer != null) {
			this.contentElOut = transformer(this._scrollEl)
		}
	}

	public onOpen(): void {
		this.parent.contentEl.empty();
		this.parent.contentEl.appendChild(this._scrollEl);
		super.onOpen();
	}
}

type ContainerWithScroll_FRIEND = Omit<ContainerWithScroll, '_scrollEl'> & {
	_scrollEl: ContainerWithScroll['_scrollEl'];
};

Object.defineProperties(ContainerWithScroll.prototype, {
	scrollEl: {
		configurable: true,
		enumerable: true,
		get(this: ContainerWithScroll_FRIEND) {
			return this._scrollEl;
		},
	},
});
