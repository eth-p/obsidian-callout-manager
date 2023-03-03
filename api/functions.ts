import { RGB } from 'obsidian';

import type Callout from './callout';
import { CalloutManagerEvent, CalloutManagerEventListener } from './events';

/**
 * A handle for the Callout Manager API.
 */
export type CalloutManager<WithPluginReference extends boolean = false> =
	(WithPluginReference extends true ? CalloutManagerOwnedHandle : CalloutManagerUnownedHandle);

/**
 * An unowned handle for the Callout Manager API.
 */
interface CalloutManagerUnownedHandle {

	/**
	 * Gets the list of available callouts.
	 */
	getCallouts(): ReadonlyArray<Callout>;

	/**
	 * Tries to parse the color of a {@link Callout callout} into an Obsidian {@link RGB} object.
	 * If the color is not a valid callout color, you can access the invalid color string through the `invalid` property.
	 *
	 * @param callout The callout.
	 */
	getColor(callout: Callout): RGB | { invalid: string };

	/**
	 * Gets the title text of a {@link Callout callout}.
	 *
	 * @param callout The callout.
	 */
	getTitle(callout: Callout): string;
}

/**
 * An owned handle for the Callout Manager API.
 */
interface CalloutManagerOwnedHandle extends CalloutManagerUnownedHandle {

	/**
	 * Registers an event listener.
	 * If Callout Manager or the handle owner plugin are unloaded, all events will be unregistered automatically.
	 *
	 * @param event The event to listen for.
	 * @param listener The listener function.
	 */
	on<E extends CalloutManagerEvent>(event: E, listener: CalloutManagerEventListener<E>): void;

	/**
	 * Unregisters an event listener.
	 *
	 * In order to unregister a listener successfully, the exact reference of the listener function provided to
	 * {@link on} must be provided as the listener parameter to this function.
	 *
	 * @param event The event which the listener was bound to.
	 * @param listener The listener function to unregister.
	 */
	off<E extends CalloutManagerEvent>(event: E, listener: CalloutManagerEventListener<E>): void;

}
