import type Callout from './callout';
import { CalloutManagerEvent, CalloutManagerEventListener } from './events';

export type CalloutManager<WithPluginReference extends boolean = false> = CalloutManagerAPI &
	(WithPluginReference extends true ? CalloutManagerHooks : object);

interface CalloutManagerAPI {
	getCallouts(): ReadonlyArray<Callout>;
}

interface CalloutManagerHooks {
	on<E extends CalloutManagerEvent>(event: E, listener: CalloutManagerEventListener<E>): void;
}
