import type { CanvasData } from 'obsidian/canvas';
import type _i18next from 'i18next';

declare global {
	var i18next: typeof _i18next;
}

declare module 'obsidian' {
	interface App {
		embedRegistry: EmbedRegistry;
		internalPlugins: InternalPluginManager;
	}

	interface CanvasBBox {
		maxX: number;
		maxY: number;
		minX: number;
		minY: number;
	}

	/** @typeonly */
	class CanvasEditor {
		canvasControlsEl: HTMLElement;
		canvasEl: HTMLElement;
		canvasRect: CanvasRect;
		cardMenuEl: HTMLElement;
		quickSettingsButton: HTMLElement;
		undoBtnEl: HTMLElement;
		view: CanvasEditorOwner;
		wrapperEl: HTMLElement;
		zoomToFitQueued: boolean;
		constructor(view: CanvasEditorOwner);
		clear(): void;
		createPlaceholder(): void;
		load(): void;
		markViewportChanged(): void;
		onResize(): void;
		onWheel(evt: WheelEvent): void;
		requestFrame(timestamp?: number): void;
		setData(data: CanvasData): void;
		setReadonly(readonly: boolean): void;
		unload(): void;
	}

	interface CanvasEditorOwner {
		app: App;
		canvas: CanvasEditor;
		contentEl: HTMLElement;
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

	type EmbedCreator = (context: EmbedContext, file: TFile, subpath?: string) => EmbedComponent;

	/** @typeonly */
	class EmbedRegistry extends Events {
		embedByExtension: Record<string, EmbedCreator>;
		registerExtension(ext: string, creator: EmbedCreator): void;
		unregisterExtension(ext: string): void;
	}

	/** @typeonly */
	class InternalPlugin<T extends InternalPluginIDs> extends Component {
		enabled: boolean;
		instance: InternalPluginInstanceMap[T];
		views: {
			[V in InternalPluginViewTypes<T>]: TypedViewCreator<ViewTypeMap[V]>;
		};
	}

	type InternalPluginIDs = keyof InternalPluginInstanceMap;

	interface InternalPluginInstance {
		id: string;
	}

	interface InternalPluginInstanceMap {
		'canvas': CanvasPluginInstance;
	}

	/** @typeonly */
	class InternalPluginManager extends Events {
		getPluginById<T extends InternalPluginIDs>(id: T): InternalPlugin<T>;
		on(name: 'change', callback: (plugin: InternalPlugin<InternalPluginIDs>) => unknown, ctx?: any): EventRef;
	}

	type InternalPluginViewTypes<T extends InternalPluginIDs> = InternalPluginViewTypesMap[T];

	interface InternalPluginViewTypesMap {
		'canvas': 'canvas';
	}

	type TypedViewCreator<T extends View> = (leaf: WorkspaceLeaf) => T;

	interface ViewTypeMap {
		canvas: CanvasView;
		markdown: MarkdownView;
	}

	interface WorkspaceLeaf {
		rebuildView(): Promise<void>;
	}
}

export {}