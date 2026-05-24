import type { CanvasData } from 'obsidian/canvas';
import type _i18next from 'i18next';

declare global {
	var i18next: typeof _i18next;
}

declare module 'obsidian' {
	interface App {
		embedRegistry: EmbedRegistry;
		internalPlugins: InternalPluginManager;
		plugins: PluginManager;
	}

	/**
	 * Bounding box interface.
	 */
	interface CanvasBBox {
		maxX: number;
		maxY: number;
		minX: number;
		minY: number;
	}

	/**
	 * Underlying layer of canvas that displays nodes and edges, and
	 * interacts directly with users.
	 * 
	 * @typeonly
	 */
	class CanvasEditor {
		canvasControlsEl: HTMLElement;
		canvasEl: HTMLElement;
		canvasRect: CanvasRect;
		cardMenuEl: HTMLElement;
		/**
		 * Indicates that user is not being able to interact with the canvas,
		 * such as clicking, scrolling, or touching.
		 * 
		 * @augmentation
		 */
		noInteraction?: boolean;
		quickSettingsButton: HTMLElement;
		undoBtnEl: HTMLElement;
		view: CanvasEditorOwner;
		/**
		 * Wraps `canvasEl`.
		 */
		wrapperEl: HTMLElement;
		zoomToFitQueued: boolean;
		constructor(view: CanvasEditorOwner);
		/**
		 * Clear `CanvasEditor` from its content without unregister any of global
		 * event handlers.
		 * 
		 * Use `unload()` to completely unload the canvas.
		 */
		clear(): void;
		createPlaceholder(): void;
		/**
		 * Deselect all selected nodes.
		 */
		deselectAll(): void;
		/**
		 * Initialize `CanvasEditor`.
		 */
		load(): void;
		/**
		 * Indicate that the canvas' viewport is changed and update its display
		 * afterwards.
		 */
		markViewportChanged(): void;
		onPointerdown(evt: PointerEvent): void;
		onPointermove(evt: PointerEvent): void;
		onPriorityPointerdown(evt: PointerEvent): void;
		/**
		 * Run when the canvas is being resized.
		 */
		onResize(): void;
		/**
		 * Run when the canvas is being scrolled.
		 */
		onWheel(evt: WheelEvent): void;
		/**
		 * Enqueue canvas display update.
		 */
		requestFrame(timestamp?: number): void;
		/**
		 * Serialize `CanvasData` into nodes and edges.
		 */
		setData(data: CanvasData): void;
		/**
		 * Toggle read-only state.
		 */
		setReadonly(readonly: boolean): void;
		/**
		 * Clear `CanvasEditor` from its content and unregister global event
		 * handlers.
		 */
		unload(): void;
		/**
		 * Render staled selection in the canvas.
		 * 
		 * @param selectCb Called right before rendering the selection. Use this
		 * to add, change, or remove selection.
		 */
		updateSelection(selectCb: () => void): void;
	}

	interface CanvasEditorOwner {
		app: App;
		canvas: CanvasEditor;
		/**
		 * Element that contains `CanvasEditor`.
		 */
		contentEl: HTMLElement;
		/**
		 * Should be a canvas file.
		 */
		file: TFile | null;
		plugin: CanvasPluginInstance;
		requestSave(): void;
		saveLocalData(): void;
	}

	type CanvasPlugin = InternalPlugin<'canvas'>;

	/** @typeonly */
	class CanvasPluginInstance implements InternalPluginInstance {
		id: 'canvas';
	}

	interface CanvasRect extends CanvasBBox {
		cx: number;
		cy: number;
		height: number;
		left: number;
		top: number;
		width: number;
	}

	/** @typeonly */
	class CanvasView extends TextFileView implements CanvasEditorOwner {
		canvas: CanvasEditor;
		plugin: CanvasPluginInstance;
		saveLocalData(): void;
		setViewData(data: string, clear: boolean): void;
		getViewData(): string;
		clear(): void;
		getViewType(): string;
	}

	interface EmbedComponent extends Component {
		/**
		 * Run once before attaching this to the DOM. You should wrap your code
		 * that loads file content here.
		 */
		loadFile(): void;
	}

	interface EmbedContext {
		app: App;
		containerEl: HTMLElement;
		depth?: number | undefined;
		displayMode?: boolean | undefined;
		linktext?: string | undefined;
		showInline?: boolean | undefined;
		sourcePath?: string | undefined;
		state?: unknown;
	}

	/**
	 * Function that returns an `EmbedComponent`.
	 */
	type EmbedCreator = (
		context: EmbedContext,
		file: TFile,
		subpath?: string
	) => EmbedComponent;

	/**
	 * Manages embeds registered under file extensions.
	 * 
	 * @typeonly
	 */
	class EmbedRegistry extends Events {
		embedByExtension: Record<string, EmbedCreator>;
		/**
		 * Register an `EmbedCreator` under file extension. Use this to customize
		 * embed for certain file.
		 * 
		 * @param ext File extension.
		 * @param creator `EmbedCreator` implementation.
		 * 
		 * @throws Throws error if another `EmbedCreator` is already registered
		 * under the same extension.
		 */
		registerExtension(ext: string, creator: EmbedCreator): void;
		unregisterExtension(ext: string): void;
	}

	/**
	 * Wraps `InternalPluginInstance` instance.
	 * 
	 * @typeonly
	 */
	class InternalPlugin<T extends InternalPluginIDs> extends Component {
		/**
		 * Indicates whether it is enabled.
		 */
		enabled: boolean;
		instance: InternalPluginInstanceMap[T];
		/**
		 * Views that belong to this plugin. Each view creator is mapped onto
		 * view type.
		 */
		views: {
			[V in InternalPluginViewTypes<T>]: TypedViewCreator<ViewTypeMap[V]>;
		};
	}

	type InternalPluginIDs = keyof InternalPluginInstanceMap;

	interface InternalPluginInstance {
		/**
		 * Unique id of the plugin.
		 */
		id: string;
	}

	interface InternalPluginInstanceMap {
		'canvas': CanvasPluginInstance;
	}

	/**
	 * Manages the lifecycle of internal plugins (core plugins).
	 * 
	 * @typeonly
	 */
	class InternalPluginManager extends Events {
		/**
		 * Get internal plugin by its id, regardless of whether it is enabled or
		 * not.
		 */
		getPluginById<T extends InternalPluginIDs>(id: T): InternalPlugin<T>;
		/**
		 * Triggered when an internal plugin has been enabled or disabled.
		 */
		on(name: 'change', callback: (plugin: InternalPlugin<InternalPluginIDs>) => unknown, ctx?: any): EventRef;
	}

	type InternalPluginViewTypes<T extends InternalPluginIDs> = InternalPluginViewTypesMap[T];

	interface InternalPluginViewTypesMap {
		'canvas': 'canvas';
	}

	/**
	 * Manages the lifecycle of community plugins.
	 * 
	 * @typeonly
	 */
	class PluginManager {
		isEnabled(id: string): boolean;
	}

	type TypedViewCreator<T extends View> = (leaf: WorkspaceLeaf) => T;

	interface ViewTypeMap {
		canvas: CanvasView;
		markdown: MarkdownView;
	}

	interface WorkspaceLeaf {
		/**
		 * Reload contained view.
		 */
		rebuildView(): Promise<void>;
	}
}

export {}