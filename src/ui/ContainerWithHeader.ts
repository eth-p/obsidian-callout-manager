import { Container } from './Container';
import { Pane } from './Pane';

/**
 * A {@link Container} that has a header.
 */
export class ContainerWithHeader extends Container {
	private _controlsEl: HTMLElement;
	private _navEl: HTMLElement;
	private _titleEl: HTMLElement;

	public headerEl: HTMLElement;

	public constructor(
		headerEl?: HTMLElement,
		contents?: Pane,
		transformer?: (containerEl: HTMLElement) => HTMLElement,
	) {
		super(contents, transformer);

		this._controlsEl = document.createElement('div');
		this._controlsEl.classList.add('callout-manager-pane-header-controls');

		this._titleEl = document.createElement('div');
		this._titleEl.classList.add('callout-manager-pane-header-title');

		this._navEl = document.createElement('div');
		this._navEl.classList.add('callout-manager-pane-header-nav');

		this.headerEl = headerEl ?? document.createElement('div');
	}

	public render(): void {
		super.render();
	}

	public onOpen(): void {
		this.headerEl.classList.add('callout-manager-pane-header');

		this.headerEl.empty();
		this.headerEl.appendChild(this._navEl);
		this.headerEl.appendChild(this._titleEl);
		this.headerEl.appendChild(this._controlsEl);

		super.onOpen();
	}
}

type ContainerWithHeader_FRIEND = Omit<ContainerWithHeader, '_controlsEl' | '_navEl' | '_titleEl'> & {
	_controlsEl: ContainerWithHeader['_controlsEl'];
	_navEl: ContainerWithHeader['_navEl'];
	_titleEl: ContainerWithHeader['_titleEl'];
};

Object.defineProperties(ContainerWithHeader.prototype, {
	controlsEl: {
		configurable: true,
		enumerable: true,
		get(this: ContainerWithHeader_FRIEND) {
			return this._controlsEl;
		},
	},

	navEl: {
		configurable: true,
		enumerable: true,
		get(this: ContainerWithHeader_FRIEND) {
			return this._navEl;
		},
	},

	titleEl: {
		configurable: true,
		enumerable: true,
		get(this: ContainerWithHeader_FRIEND) {
			return this._titleEl;
		},
	},
});
