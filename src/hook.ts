import type {
	App,
	Canvas as _Canvas,
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
	const proto = Object.getPrototypeOf(obj) as unknown;
	return hasOwnAll(proto, 'matchBlock', 'getHeadingSuggestions', 'getFileSuggestions', 'getSuggestionsAsync');
}

/**
 * Hook and store `CanvasView` and `Canvas` constructors.
 */
export function hookCanvasEditor(app: App): void {
	// Hooking it from view registry can trigger Advanced Canvas patching on
	// CanvasView and Canvas early, with the condition that Advanced
	// Canvas has already attached watcher to the registered view creator.
	const canvasViewCreator = app.viewRegistry.getViewCreatorByType('canvas') ?? app.internalPlugins.getPluginById('canvas').views.canvas;
	const canvasView = canvasViewCreator(mockLeaf(app));

	CanvasView = canvasView.constructor as typeof CanvasView;
	Canvas = canvasView.canvas.constructor as typeof Canvas;
}

/**
 * Hook and return `InternalLinkEditorSuggest` instance.
 */
export function hookInternalLinkEditorSuggest(app: App): InternalLinkEditorSuggest | null {
	for (const suggest of app.workspace.editorSuggest.suggests) {
		if ('suggestManager' in suggest) {
			const manager = suggest.suggestManager;
			if (isInternalLinkSuggestManager(manager))
				return suggest as InternalLinkEditorSuggest;
		}
	}

	return null;
}

export let Canvas: typeof _Canvas;
export type Canvas = _Canvas;

export let CanvasView: typeof _CanvasView;
export type CanvasView = _CanvasView;
