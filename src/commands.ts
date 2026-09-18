import type { Editor, MarkdownFileInfo } from './obsidian';
import type { BetterEmbeddedCanvasPlugin } from './main';
import { t } from './i18n';

export function registerCommands(plugin: BetterEmbeddedCanvasPlugin): void {
	plugin.addCommand({
		id: 'embed-canvas',
		name: t('command.embedCanvas'),
		icon: 'lucide-layout-dashboard',
		editorCallback: embedCanvas.bind(plugin)
	});

	plugin.addCommand({
		id: 'embed-canvas-node',
		name: t('command.embedCanvasNode'),
		icon: 'lucide-sticky-note',
		editorCallback: embedCanvasNode.bind(plugin)
	});
}

/**
 * Prompt user to embed a canvas into a note.
 */
function embedCanvas(this: BetterEmbeddedCanvasPlugin, editor: Editor, ctx: MarkdownFileInfo): void {
	let sourcePath = ctx.file?.path ?? '';

	this.canvasChooser.openFor(file => {
		let linktext = this.app.fileManager.generateMarkdownLink(file, sourcePath);
		editor.replaceSelection(`!${linktext}`, `${this.manifest.id}.insert.canvas-link`);
	});
}

/**
 * Prompt user to embed a canvas node into a note.
 */
function embedCanvasNode(this: BetterEmbeddedCanvasPlugin, editor: Editor, ctx: MarkdownFileInfo): void {
	let sourcePath = ctx.file?.path ?? '';

	this.canvasChooser.openFor('node-chooser', (file, data) => {
		let linktext = this.app.fileManager.generateMarkdownLink(
			file,
			sourcePath,
			`#${data.id}`,
			data.type == 'group' ? data.label : undefined
		);
		editor.replaceSelection(`!${linktext}`, `${this.manifest.id}.insert.canvas-link`);
	});
}