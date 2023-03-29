interface CalloutManagerEventMap {
	/**
	 * Called whenever one or more callouts have changed.
	 */
	change(): void;
}

/**
 * A Callout Manager event that can be listened for.
 */
export type CalloutManagerEvent = keyof CalloutManagerEventMap;

/**
 * A type which maps event names to their associated listener functions.
 */
export type CalloutManagerEventListener<Event extends CalloutManagerEvent> =
	CalloutManagerEventMap[Event];
