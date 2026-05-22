import type { App, CanvasEditor as _CanvasEditor, WorkspaceLeaf } from 'obsidian';

/**
 * Create mock `WorkspaceLeaf` instance.
 */
function mockLeaf(app: App): WorkspaceLeaf {
	return {
		app,
		containerEl: createDiv(),
		history: {
			backHistory: [],
			forwardHistory: []
		}
	} as unknown as WorkspaceLeaf;
}

/**
 * Hook and store `CanvasEditor` constructor.
 */
export function hookCanvasEditor(app: App): void {
	let canvasViewCreator = app.internalPlugins.getPluginById('canvas').views['canvas'],
		canvasView = canvasViewCreator(mockLeaf(app));

	CanvasEditor = canvasView.canvas.constructor as typeof _CanvasEditor;
}

export let CanvasEditor: typeof _CanvasEditor;
export type CanvasEditor = _CanvasEditor;