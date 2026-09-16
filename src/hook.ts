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
 * Verify that the object is an instance of `InternalLinkSuggestManager`.
 */
function isInternalLinkSuggestManager(obj: unknown): obj is InternalLinkSuggestManager {
	if (!obj) return false;
	let proto = Object.getPrototypeOf(obj);
	return hasOwnAll(proto, 'matchBlock', 'getHeadingSuggestions', 'getFileSuggestions', 'getSuggestionsAsync');
}

/**
 * Hook and store `CanvasView` and `CanvasEditor` constructors.
 */
export function hookCanvasEditor(app: App): void {
	// Hooking it from view registry can trigger Advanced Canvas patching on
	// CanvasView and CanvasEditor early, with the condition that Advanced
	// Canvas has already attached watcher to the registered view creator.
	let canvasViewCreator = app.viewRegistry.getViewCreatorByType('canvas') ?? app.internalPlugins.getPluginById('canvas').views.canvas,
		canvasView = canvasViewCreator(mockLeaf(app));

	CanvasView = canvasView.constructor as typeof CanvasView;
	CanvasEditor = canvasView.canvas.constructor as typeof CanvasEditor;
}

/**
 * Hook and return `InternalLinkEditorSuggest` instance.
 */
export function hookInternalLinkEditorSuggest(app: App): InternalLinkEditorSuggest | null {
	for (let suggest of app.workspace.editorSuggest.suggests) {
		if ('suggestManager' in suggest) {
			let manager = suggest.suggestManager;
			if (isInternalLinkSuggestManager(manager))
				return suggest as InternalLinkEditorSuggest;
		}
	}

	return null;
}

export let CanvasView: typeof _CanvasView;
export type CanvasView = _CanvasView;

export let CanvasEditor: typeof _CanvasEditor;
export type CanvasEditor = _CanvasEditor;