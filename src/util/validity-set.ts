import { ButtonComponent, EventRef, Events } from 'obsidian';

/**
 * A set of validity states that can be reduced down to a single "valid" or "invalid" result.
 */
export class ValiditySet {
	private _emitter: Events;
	private _reducer: (states: Record<string, boolean>) => boolean;
	private _lastReducedValidity: boolean | null;
	private _cachedValidity: Record<string, boolean>;

	public constructor(reducer: (states: Record<string, boolean>) => boolean) {
		this._emitter = new Events();
		this._reducer = reducer;
		this._lastReducedValidity = null;
		this._cachedValidity = {};
	}

	/**
	 * The current validity.
	 */
	public get valid(): boolean {
		const { _lastReducedValidity } = this;
		if (_lastReducedValidity == null) throw new Error('No validity available.');
		return _lastReducedValidity;
	}

	/**
	 * Runs the provided function when the reduced validity changes.
	 *
	 * @param callback The callback to run.
	 * @returns An event ref.
	 */
	public onChange(callback: (valid: boolean) => void): EventRef {
		if (this._lastReducedValidity != null) {
			callback(this._lastReducedValidity);
		}

		return this._emitter.on('change', callback);
	}

	/**
	 * Updates the provided component's disabled state when the reduced validity changes.
	 *
	 * @param component The component to update.
	 * @returns An event ref.
	 */
	public onChangeUpdateDisabled(component: ButtonComponent): EventRef {
		return this.onChange((valid) => {
			component.setDisabled(!valid);
		});
	}

	/**
	 * Adds a validity source.
	 *
	 * @param id The source's unique ID.
	 * @returns A function for updating the validity.
	 */
	public addSource(id: string): (valid: boolean) => void {
		return (valid: boolean) => {
			// Do nothing if the validity hasn't changed.
			const cachedValidity = this._cachedValidity[id];
			if (cachedValidity === valid) return;

			// Update the cached state and re-run the reducer.
			this._cachedValidity[id] = valid;
			const newValidity = this._reducer({ ...this._cachedValidity });

			// Run the callbacks if the reduced validity has changed.
			if (newValidity !== this._lastReducedValidity) {
				this._lastReducedValidity = newValidity;
				this._emitter.trigger('change', newValidity);
			}
		};
	}
}

export namespace ValiditySet {
	/**
	 * A reducer that only reduces to true if all constitutent parts are true.
	 */
	export function AllValid(states: Record<string, boolean>) {
		return !Object.values(states).includes(false);
	}
}
