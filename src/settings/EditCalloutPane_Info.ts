import { rgb } from 'color-convert';

import { App } from 'obsidian';
import { getThemeManifest } from 'obsidian-extra';

import { Callout, CalloutSource } from '../../api';
import { getColorFromCallout } from '../callout-resolver';

export function renderInfo(app: App, callout: Callout, containerEl: HTMLElement): void {
	const frag = document.createDocumentFragment();
	const contentEl = frag.createDiv({ cls: 'callout-manager-edit-callout-section' });

	contentEl.createEl('h2', { text: 'About this Callout' });
	contentEl.createEl('div', { cls: 'callout-manager-edit-callout-section--info' }, (el) => {
		el.appendText('The ');
		el.createSpan({ cls: 'callout-manager-edit-callout--callout-id', text: callout.id });
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
		const sources = el.createEl('ul', { cls: 'callout-manager-edit-callout--callout-source-list' });
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
	el.createEl('code', { cls: 'callout-manager-edit-callout--callout-icon', text: callout.icon });
}

function appendColorInfo(el: HTMLElement, callout: Callout): void {
	const calloutColor = getColorFromCallout(callout);

	// Invalid color.
	if (calloutColor == null) {
		el.appendText('an invalid color (');
		el.createEl('code', {
			cls: 'callout-manager-edit-callout--color-invalid',
			text: callout.color.trim(),
		});
		el.appendText(')');
		return;
	}

	// Valid color.
	el.appendText('the color ');
	el.createEl(
		'code',
		{ cls: 'callout-manager-edit-callout--callout-color', text: rgb.hex(calloutColor) },
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
				cls: 'callout-manager-edit-callout--callout-source',
				text: `${source.snippet}.css`,
			});
			return true;
		case 'theme': {
			el.appendText('theme ');
			const themeName = getThemeManifest(app, source.theme)?.name ?? source.theme;
			el.createSpan({ cls: 'callout-manager-edit-callout--callout-source', text: themeName });
			return true;
		}
	}
}

declare const STYLES: `
	// The info paragraph and list.
	.callout-manager-edit-callout-section--info {
		color: var(--text-muted);
	}

	.callout-manager-edit-callout--invalid-color {
		color: var(--text-error);
	}

	.callout-manager-edit-callout--callout-color {
		color: rgb(var(--resolved-callout-color));
	}

	.callout-manager-edit-callout--callout-id,
	.callout-manager-edit-callout--callout-icon,
	.callout-manager-edit-callout--callout-source {
		color: var(--text-normal);
	}

	.callout-manager-edit-callout--callout-source-list {
	}
`;
