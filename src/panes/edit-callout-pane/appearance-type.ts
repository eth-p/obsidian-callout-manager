import {
	CalloutSetting,
	CalloutSettings,
	CalloutSettingsChanges,
	CalloutSettingsColorSchemeCondition,
	typeofCondition,
} from '&callout-settings';

/**
 * A complex appearance.
 *
 * This cannot be represented with a UI, and must be changed manually in the
 * plugin's `data.json` settings.
 */
export type ComplexAppearance = {
	type: 'complex';
	settings: CalloutSettings;
};

/**
 * Unified appearance.
 *
 * The color is changed to a single value no matter what the color scheme is.
 */
export type UnifiedAppearance = {
	type: 'unified';
	color: string | undefined;
	otherChanges: Exclude<CalloutSettingsChanges, { color: string }>;
};

/**
 * Per-color scheme appearance.
 *
 * The color is different for both dark and light modes.
 */
export type PerSchemeAppearance = {
	type: 'per-scheme';
	colorDark: string | undefined;
	colorLight: string | undefined;
	otherChanges: Exclude<CalloutSettingsChanges, { color: string }>;
};

export type Appearance = UnifiedAppearance | PerSchemeAppearance | ComplexAppearance;

/**
 * Determines the {@link Appearance} for the provided callout settings.
 * @param settings The settings to determine the appearance type for.
 */
export function determineAppearanceType(settings: CalloutSettings): Appearance {
	return (
		determineNonComplexAppearanceType(settings) ?? {
			type: 'complex',
			settings,
		}
	);
}

function determineNonComplexAppearanceType(
	settings: CalloutSettings,
): Exclude<Appearance, ComplexAppearance> | null {
	// Ensure all the conditions are only "appearance".
	const settingsWithColorSchemeCondition: CalloutSettings<CalloutSettingsColorSchemeCondition> = [];
	const settingsWithNoCondition: CalloutSettings<undefined> = [];
	for (const setting of settings) {
		const type = typeofCondition(setting.condition);
		switch (type) {
			case 'colorScheme':
				settingsWithColorSchemeCondition.push(setting as CalloutSetting<CalloutSettingsColorSchemeCondition>);
				break;

			case undefined:
				settingsWithNoCondition.push(setting as CalloutSetting<undefined>);
				break;

			case 'and':
			case 'or':
			case 'theme': {
				console.debug('Cannot represent callout settings with UI.', {
					reason: `Has condition of type '${type}'`,
					settings,
				});
				return null;
			}
		}
	}

	// Check to see that the colorScheme conditions only change the color.
	const colorSchemeColor = { dark: undefined as undefined | string, light: undefined as undefined | string };
	for (const setting of settingsWithColorSchemeCondition) {
		const changed = Object.keys(setting.changes);
		if (changed.length === 0) {
			continue;
		}

		if (changed.find((key) => key !== 'color') !== undefined) {
			console.debug('Cannot represent callout settings with UI.', {
				reason: `Has 'colorScheme' condition with non-color change.`,
				settings,
			});
			return null;
		}

		// Keep track of the changed color.
		const appearanceCond = (setting.condition as CalloutSettingsColorSchemeCondition).colorScheme;
		if (colorSchemeColor[appearanceCond] !== undefined) {
			console.debug('Cannot represent callout settings with UI.', {
				reason: `Has multiple 'colorScheme' conditions that change ${appearanceCond} color.`,
				settings,
			});
			return null;
		}

		colorSchemeColor[appearanceCond] = setting.changes.color;
	}

	// Collect the remaining changes.
	const otherChanges: CalloutSettingsChanges = {};
	for (const [change, value] of settingsWithNoCondition.flatMap((s) => Object.entries(s.changes))) {
		if (value === undefined) continue;
		if (change in otherChanges) {
			console.debug('Cannot represent callout settings with UI.', {
				reason: `Has multiple changes to '${change}'.`,
				settings,
			});
			return null;
		}

		(otherChanges as Record<string, unknown>)[change] = value;
	}

	// Remove color from otherChanges.
	delete otherChanges.color;

	// If there aren't any dark or light color scheme colors defined, it's a unified color.
	if (colorSchemeColor.dark === undefined && colorSchemeColor.light === undefined) {
		if (otherChanges.color === undefined) {
			return { type: 'unified', color: undefined, otherChanges };
		}

		return { type: 'unified', color: otherChanges.color, otherChanges };
	}

	// Split color.
	const colorDark = colorSchemeColor.dark ?? (colorSchemeColor.light as string);
	const colorLight = colorSchemeColor.light ?? (colorSchemeColor.dark as string);
	return { type: 'per-scheme', colorDark, colorLight, otherChanges };
}
