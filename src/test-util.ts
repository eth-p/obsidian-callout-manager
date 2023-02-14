import { BuiltinCallout, CustomCallout, DetectedCallout } from '../api';

function createCalloutBase(
	id: string,
	aliases: string[],
	options: undefined | { color?: string; name?: string },
): { id: string; name: string; aliases: string[]; color: string } {
	return {
		id,
		aliases,
		name: options?.name ?? id.substring(0).toUpperCase() + id.substring(1),
		color: options?.color ?? '',
	};
}

export function createSnippetCallout(
	snippet: string,
	id: string,
	aliases: string[],
	options?: Parameters<typeof createCalloutBase>[2],
): DetectedCallout {
	return {
		...createCalloutBase(id, aliases, options),
		type: 'detected',
		source: 'snippet',
		sourceId: snippet,
	};
}

export function createThemeCallout(
	theme: string,
	id: string,
	aliases: string[],
	options?: Parameters<typeof createCalloutBase>[2],
): DetectedCallout {
	return {
		...createCalloutBase(id, aliases, options),
		type: 'detected',
		source: 'theme',
		sourceId: theme,
	};
}

export function createBuiltinCallout(
	id: string,
	aliases: string[],
	options?: Parameters<typeof createCalloutBase>[2],
): BuiltinCallout {
	return {
		...createCalloutBase(id, aliases, options),
		type: 'builtin',
	};
}

export function createCustomCallout(
	id: string,
	aliases: string[],
	options?: Parameters<typeof createCalloutBase>[2],
): CustomCallout {
	const base = createCalloutBase(id, aliases, options);
	return {
		...base,
		type: 'custom',
		colorDark: base.color,
		colorLight: base.color,
	};
}
