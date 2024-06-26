import { App } from 'obsidian';
import { getThemeManifest } from 'obsidian-extra';

import { Callout, CalloutSource } from '&callout';
import { getColorFromCallout } from '&callout-util';
import { RGB, toHexRGB } from '&color';

import DefaultColors from "../../default_colors.json";

export function renderInfo(app: App, callout: Callout, containerEl: HTMLElement): void {
	const frag = document.createDocumentFragment();
	const contentEl = frag.createDiv({ cls: 'calloutmanager-edit-callout-section' });

	contentEl.createEl('h2', { text: 'About this Callout' });
	contentEl.createEl('div', { cls: 'calloutmanager-edit-callout-info' }, (el) => {
		el.appendText('The ');
		el.createSpan({ cls: 'calloutmanager-edit-callout--callout-id', text: callout.id });
		el.appendText(' callout');

		// Color information.
		el.appendText(' has ');
		appendColorInfo(el, callout);

		// Icon information.
		el.appendText(' and ');
		appendIconInfo(el, callout);

		// Source information.
		if (callout.sources.length === 1) {
			if (callout.sources[0].type === 'builtin') {
				el.appendText('. It is one of the built-in callouts.');
				return;
			}

			el.appendText('. It was added to Obsidian by the ');
			appendSourceInfo(app, el, callout.sources[0]);
			el.appendText('.');
			return;
		}

		el.appendText('. The callout comes from:');
		const sources = el.createEl('ul', { cls: 'calloutmanager-edit-callout--callout-source-list' });
		for (const source of callout.sources) {
			const itemEl = sources.createEl('li');
			itemEl.appendText('The ');
			appendSourceInfo(app, itemEl, source);
			itemEl.appendText('.');
		}
	});

	// Render the fragment.
	containerEl.appendChild(frag);
}

function appendIconInfo(el: HTMLElement, callout: Callout): void {
	el.appendText('is using the icon ');
	el.createEl('code', { cls: 'calloutmanager-edit-callout--callout-icon', text: callout.icon });
}

function appendColorInfo(el: HTMLElement, callout: Callout): void {
	const calloutColor = getColorFromCallout(callout);

	// Invalid color.
	if (calloutColor == null) {
		el.appendText('an invalid color (');
		el.createEl('code', {
			cls: 'calloutmanager-edit-callout--color-invalid',
			text: callout.color.trim(),
		});
		el.appendText(')');
		return;
	}

	// Valid color.
	el.appendText('the color ');
	el.createEl(
		'code',
		{ cls: 'calloutmanager-edit-callout--callout-color', text: describeColor(calloutColor) },
		(colorEl) => colorEl.style.setProperty('--resolved-callout-color', callout.color),
	);
}

function appendSourceInfo(app: App, el: HTMLElement, source: CalloutSource): boolean {
	switch (source.type) {
		case 'builtin':
			el.appendText('built-in callouts');
			return true;
		case 'custom':
			el.appendText('custom callouts you created');
			return true;
		case 'snippet':
			el.appendText('CSS snippet ');
			el.createEl('code', {
				cls: 'calloutmanager-edit-callout--callout-source',
				text: `${source.snippet}.css`,
			});
			return true;
		case 'theme': {
			el.appendText('theme ');
			const themeName = getThemeManifest(app, source.theme)?.name ?? source.theme;
			el.createSpan({ cls: 'calloutmanager-edit-callout--callout-source', text: themeName });
			return true;
		}
	}
}

function describeColor(color: RGB): string {
	const hexString = toHexRGB(color);
	const rgbString = `${color.r}, ${color.g}, ${color.b}`;

	const namedColor = DefaultColors.defaultColors[rgbString as keyof typeof DefaultColors.defaultColors];
	if (namedColor != null) {
		return namedColor;
	}

	return hexString;
}

declare const STYLES: `
	// The info paragraph and list.
	.calloutmanager-edit-callout-info {
		color: var(--text-muted);
	}

	.calloutmanager-edit-callout--invalid-color {
		color: var(--text-error);
	}

	.calloutmanager-edit-callout--callout-color {
		color: rgb(var(--resolved-callout-color));
	}

	.calloutmanager-edit-callout--callout-id,
	.calloutmanager-edit-callout--callout-icon,
	.calloutmanager-edit-callout--callout-source {
		color: var(--text-normal);
	}

	.calloutmanager-edit-callout--callout-source-list {
	}
`;
