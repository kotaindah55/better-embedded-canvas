/* eslint-disable no-undef, @typescript-eslint/explicit-member-accessibility, eslint-comments/disable-enable-pair --
 * - `no-undef` rule does not recognize any of references that are defined outside this module and not imported onto it,
 *   though typescript does recognize them.
 * - `private` modifier is unnecessary in type augmentation, and so is `public` modifier. This is because we want access
 *   augmented members from outside their class instance.
 */

import type { CanvasData, NodeType } from 'obsidian/canvas';
import type { EditorView, Tile, WidgetTile, WidgetType } from '@codemirror/view';
import type _i18next from 'i18next';

declare global {
	interface Element {
		cmTile?: Tile | WidgetTile;
		cmView?: Tile | WidgetTile;
	}

	const i18next: typeof _i18next;
}

declare module '@codemirror/view' {
	/**
	 * Attached to an element telling that the element belongs to CodeMirror
	 * `EditorView`.
	 * 
	 * @see https://code.haverbeke.berlin/codemirror/view/src/branch/main/src/tile.ts
	 * 
	 * @typeonly
	 */
	abstract class Tile {
		dom: HTMLElement | null;
	}

	/**
	 * `ContentView` attached to an element that is a part of editor widget.
	 * 
	 * @see https://code.haverbeke.berlin/codemirror/view/src/branch/main/src/tile.ts
	 * 
	 * @typeonly
	 */
	class WidgetTile extends Tile {
		widget: WidgetType;
	}
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

	interface AliasLinkSuggestResult extends SuggestResult {
		alias: string;
		file: TFile | null;
		/** @augmentation */
		idMatches?: SearchMatches | null | undefined;
		/** @augmentation */
		isCanvasNode?: boolean | undefined;
		/** @augmentation */
		isGroupNode?: boolean | undefined;
		/** @augmentation */
		label?: string | undefined;
		/** @augmentation */
		nodeId?: string | undefined;
		/**
		 * Linktext (linkpath + subpath).
		 */
		path: string;
		type: 'alias';
	}

	interface App {
		dragManager: DragManager;
		embedRegistry: EmbedRegistry;
		internalPlugins: InternalPluginManager;
		plugins: PluginManager;
		viewRegistry: ViewRegistry;
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
	interface BBox {
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
	class Canvas {
		canvasControlsEl: HTMLElement;
		canvasEl: HTMLElement;
		canvasRect: CanvasRect;
		cardMenuEl: HTMLElement;
		config: CanvasConfig;
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
		view: CanvasOwner;
		/**
		 * Wraps `canvasEl`.
		 */
		wrapperEl: HTMLElement;
		zoom: number;
		zoomToFitQueued: boolean;
		constructor(view: CanvasOwner);
		/**
		 * Clear `Canvas` from its content without unregister any of global
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
		 * "Mover" is an element that covers the whole canvas surface and blocks
		 * any user interaction but panning. "Mover" will be attached if space
		 * key is pressed while the pointer is hovering over the canvas, and will
		 * be detached right after space key is released.
		 */
		handleMoverPointerdown(evt: PointerEvent): void;
		/**
		 * Initialize `Canvas`.
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
		 * Forcibly record current canvas state to the editing history.
		 */
		overrideHistory(): void;
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
		 * Clear `Canvas` from its content and unregister global event
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
		zoomBy(factor: number): void;
		/**
		 * Zoom canvas to the given bounding box.
		 */
		zoomToBbox(bBox: BBox): void;
		zoomToFit(): void;
		zoomToSelection(): void;
	}

	interface CanvasConfig {
		zoomMultiplier: number;
	}

	/**
	 * Canvas node that displays embedded file.
	 * 
	 * @typeonly
	 */
	class CanvasFileNode extends CanvasPreviewNode {
		file: TFile | null;
		filePath: string;
		subpath: string;
		onFileFocus(): void;
		updateNodeLabel(label: string): void;
	}

	/**
	 * Base class of non-group canvas node.
	 * 
	 * @typeonly
	 */
	abstract class CanvasItemNode extends CanvasNode {
		contentEl: HTMLElement;
		placeholderEl: HTMLElement;
	}

	/**
	 * Base class of all canvas nodes.
	 * 
	 * @typeonly
	 */
	abstract class CanvasNode {
		canvas: Canvas;
		id: string;
		unknownData: CanvasNodeUnknownData;
		get isFocused(): boolean;
		/**
		 * Get bounding box of this node.
		 */
		getBBox(): BBox;
		/**
		 * Render node content.
		 */
		render(): void;
		/**
		 * Resize node.
		 */
		resize(newSize: Size): void;
	}

	interface CanvasOwner {
		app: App;
		canvas: Canvas;
		/**
		 * Element that contains `Canvas`.
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

	/**
	 * Canvas node that manage lifecycle of `Component` instance attached
	 * into. Currently, it is the base class for text node and file node.
	 * 
	 * @typeonly
	 */
	abstract class CanvasPreviewNode extends CanvasItemNode {
		child?: Component | null | undefined;
	}

	interface CanvasRect extends BBox {
		cx: number;
		cy: number;
		height: number;
		left: number;
		top: number;
		width: number;
	}

	/**
	 * Non-geometric node data attached into `CanvasNode` instance.
	 */
	interface CanvasNodeUnknownData extends Record<string, unknown> {
		id: string;
		type: NodeType;
	}

	/** @typeonly */
	class CanvasView extends TextFileView implements CanvasOwner {
		canvas: Canvas;
		plugin: CanvasPluginInstance;
		saveLocalData(): void;
		setViewData(data: string, clear: boolean): void;
		getViewData(): string;
		clear(): void;
		getViewType(): string;
	}

	/**
	 * Surprisingly, `Editor` is an abstract class, and it has only one
	 * subclass, we name it `CMEditor`. This is because `Editor` is actually
	 * library-agnostic based on its design. That means you can implement
	 * this class while utilizing another editor component/library as the
	 * underlying.
	 * 
	 * `CMEditor` uses CodeMirror 6 as the underlying.
	 * 
	 * @typeonly
	 */
	class CMEditor extends Editor {
		cm: EditorView;
		blur(): void;
		exec(command: EditorCommandName): void;
		focus(): void;
		lastLine(): number;
		lineCount(): number;
		listSelections(): EditorSelection[];
		getCursor(side?: 'from' | 'to' | 'head' | 'anchor'): EditorPosition;
		getLine(line: number): string;
		getRange(from: EditorPosition, to: EditorPosition): string;
		getScrollInfo(): { top: number; left: number };
		getSelection(): string;
		getValue(): string;
		hasFocus(): boolean;
		offsetToPos(offset: number): EditorPosition;
		posToOffset(pos: EditorPosition): number;
		redo(): void;
		refresh(): void;
		replaceSelection(replacement: string, origin?: string): void;
		replaceRange(replacement: string, from: EditorPosition, to?: EditorPosition, origin?: string): void;
		setValue(content: string): void;
		setSelection(anchor: EditorPosition, head?: EditorPosition): void;
		setSelections(ranges: EditorSelectionOrCaret[], main?: number): void;
		scrollTo(x?: number | null, y?: number | null): void;
		scrollIntoView(range: EditorRange, center?: boolean): void;
		transaction(tx: EditorTransaction, origin?: string): void;
		undo(): void;
		wordAt(pos: EditorPosition): EditorRange | null;
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

	/** @typeonly */
	class EditorSuggestManager {
		suggests: EditorSuggest<unknown>[];
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
		depth: number;
		displayMode?: boolean | undefined;
		linktext?: string | undefined;
		showInline?: boolean | undefined;
		sourcePath?: string | undefined;
		state?: unknown;
	}

	/**
	 * Function that returns an `EmbedComponent`.
	 */
	type EmbedCreator<T extends EmbedComponent = EmbedComponent> = (
		context: EmbedContext,
		file: TFile,
		subpath?: string
	) => T;

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

	/** @typeonly */
	class EmbedWidget extends ParentWidget {
		child?: EmbedComponent;
		href: string;
		title: string;
	}

	/** @typeonly */
	class InteractiveWidget extends WidgetType {
		end: number;
		start: number;
		toDOM(view: EditorView): HTMLElement;
	}

	/** @typeonly */
	class InternalLinkEditorSuggest extends EditorSuggest<InternalLinkSuggestResult> {
		suggestManager: InternalLinkSuggestManager;
		getSuggestions(context: EditorSuggestContext): InternalLinkSuggestResult[] | Promise<InternalLinkSuggestResult[]>;
		onTrigger(cursor: EditorPosition, editor: Editor, file: TFile | null): EditorSuggestTriggerInfo | null;
		renderSuggestion(value: InternalLinkSuggestResult, el: HTMLElement): void;
		selectSuggestion(value: InternalLinkSuggestResult, evt: MouseEvent | KeyboardEvent): void;
	}

	/**
	 * Querying backend of internal link suggest. Retrieves suggest results
	 * that are relevant to the given query.
	 * 
	 * @typeonly
	 */
	class InternalLinkSuggestManager {
		app: App;
		getSourcePath: () => string;
		getHeadingSuggestions(runnable: Runnable, linkpath: string, query: string): Promise<InternalLinkSuggestResult[]>;
	}

	type InternalLinkSuggestResult =
		| AliasLinkSuggestResult
		| TypedSuggestResult<'bases-view' | 'block' | 'file' | 'heading' | 'linktext' | 'none'>;

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
		canvas: CanvasPluginInstance;
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
		canvas: 'canvas';
	}

	/**
	 * Base class for all editable markdown, wrapping `Editor` instance.
	 */
	class MarkdownEditor extends Component {
		app: App;
		editor: CMEditor;
	}

	interface Notice {
		addButton(label: string, onClick: (evt: PointerEvent) => void): this;
	}

	type PageSizeType =
		| 'A3'
		| 'A4'
		| 'A5'
		| 'Legal'
		| 'Letter'
		| 'Tabloid';

	/** @typeonly */
	class ParentWidget extends InteractiveWidget {
		app: App;
		editor: MarkdownEditor;
	}

	interface PDFExportSettings {
		/**
		 * Include file name as title.
		 */
		includeName?: boolean;
		pageSize: PageSizeType;
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
		getPlugin(id: string): Plugin | null;
		isEnabled(id: string): boolean;
		on(name: 'changed', callback: () => unknown, ctx?: unknown): EventRef;
	}

	/** @typeonly */
	class Runnable {
		isCancelled(): boolean;
		isRunning(): boolean;
	}

	interface SettingTab {
		renderTab(): void;
	}

	interface Size {
		width: number;
		height: number;
	}

	interface SuggestResult {
		downranked?: boolean;
		matches: SearchMatches | null;
		score: number;
	}

	interface TypedSuggestResult<T extends string = string> extends SuggestResult {
		type: T;
	}

	type TypedViewCreator<T extends View> = (leaf: WorkspaceLeaf) => T;

	interface Vault {
		/**
		 * Get user config/setting by key.
		 */
		getConfig<T extends keyof AppConfig>(key: T): AppConfig[T];
	}

	/** @typeonly */
	class ViewRegistry extends Events {
		getViewCreatorByType<T extends keyof ViewTypeMap>(type: T): TypedViewCreator<ViewTypeMap[T]> | undefined;
	}

	interface ViewTypeMap {
		canvas: CanvasView;
		markdown: MarkdownView;
	}

	interface Workspace {
		editorSuggest: EditorSuggestManager;
	}

	interface WorkspaceLeaf {
		/**
		 * Reload contained view.
		 */
		rebuildView(): Promise<void>;
	}
}

declare module 'obsidian/canvas' {
	/**
	 * Canvas node type.
	 */
	type NodeType = 'text' | 'file' | 'link' | 'group';
}

export {};
