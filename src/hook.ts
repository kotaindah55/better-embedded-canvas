import type {
	App,
	CanvasEditor as _CanvasEditor,
	CanvasView as _CanvasView,
	InternalLinkEditorSuggest,
	InternalLinkSuggestManager,
	WorkspaceLeaf
} from './obsidian';
import { hasOwnAll } from './utils';

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
 * Hook and store `CanvasView` and `CanvasEditor` constructors.
 */
export function hookCanvasEditor(app: App): void {
	let canvasViewCreator = app.internalPlugins.getPluginById('canvas').views.canvas,
		canvasView = canvasViewCreator(mockLeaf(app));

	CanvasView = canvasView.constructor as typeof CanvasView;
	CanvasEditor = canvasView.canvas.constructor as typeof CanvasEditor;
}

export let CanvasEditor: typeof _CanvasEditor;
export type CanvasEditor = _CanvasEditor;