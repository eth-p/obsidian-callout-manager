import { Events, Plugin, RGB } from 'obsidian';

import { getColorFromCallout, getTitleFromCallout } from '&callout-util';
import CalloutManagerPlugin from '&plugin';

import { Callout, CalloutManager } from '../plugin-api';
import { CalloutManagerEvent, CalloutManagerEventListener } from '../plugin-api/events';
import { destroy, emitter } from './api-common';

export class CalloutManagerAPI_V1 implements CalloutManager<true> {
	private readonly plugin: CalloutManagerPlugin;
	private readonly consumer: Plugin | undefined;

	public readonly [emitter]: Events;

	public constructor(plugin: CalloutManagerPlugin, consumer: Plugin | undefined) {
		this.plugin = plugin;
		this.consumer = consumer;
		this[emitter] = new Events();

		if (consumer != null) {
			console.debug('Created API V1 Handle:', { plugin: consumer.manifest.id });
		}
	}

	/**
	 * Called to destroy an API handle bound to a consumer.
	 */
	public [destroy]() {
		const consumer = this.consumer as Plugin;
		console.debug('Destroyed API V1 Handle:', { plugin: consumer.manifest.id });
	}

	/** @override */
	public getCallouts(): Readonly<Callout>[] {
		return this.plugin.callouts.values().map((callout) => Object.freeze({ ...callout }));
	}

	/** @override */
	public getColor(callout: Callout): RGB | { invalid: string } {
		const color = getColorFromCallout(callout);
		return color ?? { invalid: callout.color };
	}

	/** @override */
	public getTitle(callout: Callout): string {
		return getTitleFromCallout(callout);
	}

	/** @override */
	public on<E extends CalloutManagerEvent>(event: E, listener: CalloutManagerEventListener<E>): void {
		if (this.consumer == null) {
			throw new Error('Cannot listen for events without an API consumer.');
		}

		this[emitter].on(event, listener);
	}

	/** @override */
	public off<E extends CalloutManagerEvent>(event: E, listener: CalloutManagerEventListener<E>): void {
		if (this.consumer == null) {
			throw new Error('Cannot listen for events without an API consumer.');
		}

		this[emitter].off(event, listener);
	}
}
