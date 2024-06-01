import { Component, MarkdownRenderer } from 'obsidian';

import Changelog from '../../CHANGELOG.md';

interface ChangelogSection {
	version: string | undefined;
	containerEl: HTMLDetailsElement;
	titleEl: HTMLElement;
	contentsEl: HTMLElement;
}

export function getSections(): Map<string, ChangelogSection> {
	const frag = document.createDocumentFragment();
	const renderedEl = frag.createDiv();

	// Render the markdown.
	MarkdownRenderer.renderMarkdown(Changelog, renderedEl, '', null as unknown as Component);

	// Extract the sections into details elements.
	const sections = new Map<string, ChangelogSection>();
	let heading: HTMLHeadingElement | null = null;
	let sectionContainer = frag.createEl('details');
	let sectionSummary = sectionContainer.createEl('summary');
	let sectionContents: Node[] = [];

	const addPreviousSection = () => {
		if (heading != null && heading.textContent !== null) {
			const headingText = heading.textContent;

			// Create the details summary / title.
			const titleEl = sectionSummary.createEl('h2', {
				cls: 'calloutmanager-changelog-heading',
				text: headingText,
			});

			// Create the details body / content.
			const contentsEl = sectionContainer.createDiv(
				{
					cls: 'calloutmanager-changelog-section',
				},
				(el) => {
					sectionContents.forEach((node) => el.appendChild(node));
				},
			);

			// Rewrite `data-callout` attribute to `data-calloutmanager-changelog-callout`.
			Array.from(contentsEl.querySelectorAll('.callout[data-callout]')).forEach((el) => {
				el.setAttribute('data-calloutmanager-changelog-callout', el.getAttribute('data-callout') as string);
				el.removeAttribute('data-callout');
			});

			const version = /^\s*Version ([0-9.]+)\s*$/.exec(headingText)?.[1];
			sections.set(version ?? heading.textContent, {
				version: version,
				contentsEl,
				containerEl: sectionContainer,
				titleEl,
			});
		}

		// Reset variables.
		heading = null;
		sectionContainer = frag.createEl('details');
		sectionSummary = sectionContainer.createEl('summary');
		sectionContents = [];
	};

	for (let node = renderedEl.firstChild; node != null; node = node?.nextSibling) {
		if (node instanceof HTMLHeadingElement && node.tagName === 'H1') {
			addPreviousSection();

			heading = node;
			continue;
		}

		sectionContents.push(node);
	}

	addPreviousSection();
	return sections;
}

declare const STYLES: `
	// Special callouts used in the changelog.

	// The data attribute is rewritten from 'data-callout' to 'data-calloutmanager-changelog-callout' to prevent
	// any possible conflicts with user-defined or builtin callouts.

	.calloutmanager-changelog-section .callout {
		--callout-padding: 0.5em;

		> .callout-content {
			margin-left: calc(18px + 0.25em);
		}

		> .callout-content > :first-child {
			margin-top: 0;
		}

		> .callout-content > :last-child {
			margin-bottom: 0;
		}
	}

	.callout[data-calloutmanager-changelog-callout="new"] {
		--callout-icon: lucide-plus;
		--callout-color: 30, 160, 30;
		.theme-dark & {
			--callout-color: 60, 250, 60;
		}
	}

	.callout[data-calloutmanager-changelog-callout="fix"] {
		--callout-icon: lucide-wrench;
		--callout-color: 128, 128, 128;
		.theme-dark & {
			--callout-color: 180, 180, 180;
		}
	}

	.callout[data-calloutmanager-changelog-callout="change"] {
		--callout-icon: lucide-edit-3;
		--callout-color: 10, 170, 210;
		.theme-dark & {
			--callout-color: 60, 157, 210;
		}
	}

	.calloutmanager-changelog-heading {
		display: inline;
		font-weight: bold;
	}
`;
