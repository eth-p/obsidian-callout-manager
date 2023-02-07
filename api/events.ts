
interface CalloutManagerEventMap {
	change(): void;
}

export type CalloutManagerEvent = keyof CalloutManagerEventMap;
export type CalloutManagerEventListener<Event extends CalloutManagerEvent> = CalloutManagerEventMap[Event];
