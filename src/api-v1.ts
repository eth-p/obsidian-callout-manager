import { Callout, CalloutManager } from "../api";
import { CalloutManagerEventListener } from "../api/events";

export class CalloutManagerAPI_V1 implements CalloutManager<true> {
	getCallouts(): readonly Callout[] {
		throw new Error("Method not implemented.");
	}
	on<E extends "change">(event: E, listener: CalloutManagerEventListener<E>): void {
		throw new Error("Method not implemented.");
	}

}
