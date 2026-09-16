import type { CanvasData } from 'obsidian/canvas';
import type _i18next from 'i18next';

declare global {
	var i18next: typeof _i18next;
}

declare module 'obsidian' {
	interface AbstractDraggable<T extends string> {
		/**
		 * Icon to show in drag image.
		 */
		icon?: IconName;
		/**
		 * Usually and optionally refers to where dragging starts, or to who
		 * starts it.
		 */
		source?: string;
		/**
		 * Title to show in drag image.
		 */
		title: string;
		type: T;
	}

	interface App {
		dragManager: DragManager;
		embedRegistry: EmbedRegistry;
		internalPlugins: InternalPluginManager;
		plugins: PluginManager;
	}

	interface AppConfig extends Record<string, unknown> {
		/**
		 * Configured through **Export to PDF** modal.
		 */
		pdfExportSettings?: PDFExportSettings;
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
		 * Id of currently queued frame request. 0 if no queued frame request.
		 */
		frame: number;
		isHoldingSpace: boolean;
		/**
		 * Canvas nodes mapped onto their id.
		 */
		nodes: Map<string, CanvasNode>;
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
		/**
		 * Run when the canvas being pointed down. Handles panning using middle
		 * mouse button.
		 */
		onPriorityPointerdown(evt: PointerEvent): void;
		/**
		 * Run when the canvas is being resized.
		 */
		onResize(): void;
		/**
		 * Run when the canvas being touched down, e.g. on mobile device. Handles
		 * panning using touch.
		 */
		onTouchdown(evt: PointerEvent): void;
		/**
		 * Run when the canvas is being scrolled.
		 */
		onWheel(evt: WheelEvent): void;
		/**
		 * Pan canvas by given length.
		 */
		panBy(x: number, y: number): void;
		/**
		 * Convert `MouseEvent` position fields to `Point`.
		 */
		posFromEvt(evt: MouseEvent): Point;
		/**
		 * Enqueue canvas display update.
		 */
		requestFrame(timestamp?: number): void;
		/**
		 * Select the node only.
		 */
		selectOnly(node: CanvasNode): void;
		/**
		 * Serialize `CanvasData` into nodes and edges.
		 */
		setData(data: CanvasData): void;
		/**
		 * Toggle dragging state.
		 */
		setDragging(enable: boolean): void;
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
		/**
		 * Zoom canvas to the given bounding box.
		 */
		zoomToBbox(bBox: CanvasBBox): void;
		zoomToSelection(): void;
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

	/** @typeonly */
	abstract class CanvasNode {
		id: string;
		/**
		 * Get bounding box of this node.
		 */
		getBBox(): CanvasBBox;
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

	/**
	 * Contains information of dragged object.
	 */
	type Draggable = DraggableLink;

	interface DraggableLink extends AbstractDraggable<'link'> {
		/**
		 * File that the link refers to.
		 */
		file?: TFile;
		/**
		 * An internal link without the leading `[[` and trailing `]]`.
		 */
		linktext?: string;
		/**
		 * The path to the file which the link is dragged from. You can use
		 * empty string if there is no such file.
		 */
		sourcePath: string;
	}

	/**
	 * Attaches drag and drop functionality and watches currently active
	 * drag and drop operation.
	 * 
	 * @typeonly
	 */
	class DragManager {
		/**
		 * Handle internal link dragging and create {@link DraggableLink} object.
		 * 
		 * @param evt Drag event to handle.
		 * @param linkText See {@link DraggableLink.sourcePath}.
		 * @param sourcePath See {@link DraggableLink.sourcePath}.
		 * @param title Custom title for the {@link Draggable} object. Will use
		 * file name that the link refers to if it is not specified or empty
		 * string.
		 * @param source See {@link AbstractDraggable.source}.
		 */
		dragLink(evt: DragEvent, linkText: string, sourcePath: string, title?: string, source?: string): DraggableLink;
		/**
		 * Attach drag handler to an element. Simply put, make the element as a
		 * drag target.
		 * 
		 * @param el Drag target element.
		 * @param dragHandler Return it `null` to not display the drag image.
		 * 
		 * @example
		 * ```ts
		 * function attachDragHandler(el: HTMLElement, file: TFile): void {
		 *     this.app.dragManager.handleDrag(el, (evt: DragEvent) => {
		 *         if (el.hasClass('is-draggable')) {
		 *             return this.app.dragManager.dragFile(evt, file);
		 *         } else {
		 *             return null;
		 *         }
		 *     });
		 * }
		 * ```
		 */
		handleDrag(el: HTMLElement, dragHandler: (event: DragEvent) => Draggable | null): void;
	}

	interface EmbedComponent extends Component {
		/**
		 * Run once before attaching this to the DOM. You should wrap your code
		 * that loads file content here.
		 */
		loadFile(): Promise<void>;
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
	class InternalPlugin<T extends InternalPluginId> extends Component {
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

	type InternalPluginId = keyof InternalPluginInstanceMap;

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
		getPluginById<T extends InternalPluginId>(id: T): InternalPlugin<T>;
		/**
		 * Triggered when an internal plugin has been enabled or disabled.
		 */
		on(name: 'change', callback: (plugin: InternalPlugin<InternalPluginId>) => unknown, ctx?: unknown): EventRef;
	}

	type InternalPluginViewTypes<T extends InternalPluginId> = InternalPluginViewTypesMap[T];

	interface InternalPluginViewTypesMap {
		'canvas': 'canvas';
	}

	interface Notice {
		addButton(label: string, onClick: (evt: PointerEvent) => void): this;
	}

	type PageSize =
		| 'A3'
		| 'A4'
		| 'A5'
		| 'Legal'
		| 'Letter'
		| 'Tabloid';

	interface PDFExportSettings {
		/**
		 * Include file name as title.
		 */
		includeName?: boolean;
		pageSize: PageSize;
		landscape: boolean;
		/**
		 * `0` for default, `1` for none, and `2` for minimal.
		 */
		margin: '0' | '1' | '2';
		downscalePercent: number;
	}

	/**
	 * Manages the lifecycle of community plugins.
	 * 
	 * @typeonly
	 */
	class PluginManager extends Events {
		isEnabled(id: string): boolean;
		on(name: 'changed', callback: () => unknown, ctx?: unknown): EventRef;
	}

	type TypedViewCreator<T extends View> = (leaf: WorkspaceLeaf) => T;

	interface Vault {
		/**
		 * Get user config/setting by key.
		 */
		getConfig<T extends keyof AppConfig>(key: T): AppConfig[T];
	}

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