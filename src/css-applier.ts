import { App, Latest } from "obsidian-undocumented";
import { getFloatin} from "obsidian-extra";
import { App as ObsidianApp, Plugin } from "obsidian";

class StylesheetApplier {
}

export type CleanupFunction = () => void;

function applyStyles(plugin: Plugin, app: ObsidianApp): CleanupFunction {
	const windows = getFloat
	const workspace = (app as App<Latest>).workspace;

	const styleContainer = app.workspace.on("layout-change")
}


function applyStylesToElement(el: HTMLStyleElement, styles: string) {

}
