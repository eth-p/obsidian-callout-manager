import { RGB } from 'obsidian';

import type Callout from './callout';
import { CalloutManagerEvent, CalloutManagerEventListener } from './events';

export type CalloutManager<WithPluginReference extends boolean = false> = CalloutManagerAPI &
	(WithPluginReference extends true ? CalloutManagerHooks : object);

interface CalloutManagerAPI {
	getCallouts(): ReadonlyArray<Callout>;
	getColor(callout: Callout): RGB | { invalid: string };
}

interface CalloutManagerHooks {
	on<E extends CalloutManagerEvent>(event: E, listener: CalloutManagerEventListener<E>): void;
	off<E extends CalloutManagerEvent>(event: E, listener: CalloutManagerEventListener<E>): void;
}
