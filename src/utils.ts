import {
	type Tile,
	type WidgetTile,
	WidgetType
} from '@codemirror/view';
import type {
	AllCanvasNodeData,
	CanvasData,
	CanvasEdgeData,
	CanvasGroupData
} from 'obsidian/canvas';
import {
	type App,
	type Canvas,
	type EmbedComponent,
	type EmbedCreator,
	type InternalPlugin,
	type InternalPluginId,
	type Point,
	Component
} from './obsidian';

/**
 * Check whether the object has all the properties.
 */
export function hasOwnAll<T, P extends string>(obj: T, ...props: P[]): obj is T & Record<P, unknown> {
	if (!obj || typeof obj != 'object' && typeof obj != 'function') return false;
	return props.every(prop => Object.hasOwn(obj, prop));
}

/**
 * Defer function call until the next tick.
 */
export function defer(fn: () => unknown): void {
	window.setTimeout(fn, 0);
}

/**
 * Safely replace registered `EmbedCreator` with another `EmbedCreator`.
 * 
 * @param app `App` instance.
 * @param ext File extension.
 * @param creator New `EmbedCreator`.
 * 
 * @returns Previously registered `EmbedCreator` if any.
 */
export function replaceEmbedCreator<T extends EmbedComponent>(app: App, ext: string, creator: EmbedCreator<T>): EmbedCreator<T> | null {
	const reg = app.embedRegistry;
	const oldCreator = reg.embedByExtension[ext] ?? null;

	// Registering creator to already registered extension throws error.
	// Therefore, we need to unregister it first.
	reg.unregisterExtension(ext);
	reg.registerExtension(ext, creator);

	return oldCreator as EmbedCreator<T> | null;
}

/**
 * Get internal plugin (core plugin) by its id.
 * 
 * @param app `App` instance.
 * @param id Internal plugin id.
 */
export function getInternalPlugin<T extends InternalPluginId>(app: App, id: T): InternalPlugin<T> {
	return app.internalPlugins.getPluginById<T>(id);
}

/**
 * Check whether the plugin is actually enabled. `app.plugins.isEnabled()`
 * only retrieves plugin state from local storage, not actually checks
 * the plugin.
 */
export function isPluginEnabled(app: App, id: string): boolean {
	return !!app.plugins.getPlugin(id);
}

/**
 * Indicate that the element is inside `Document` that will be exported
 * as PDF.
 */
export function beingExportedAsPDF(el: HTMLElement): boolean {
	return el.matches('body > div.print *');
}

/**
 * Convert number into `px` length.
 */
export function toPx(value: number): string {
	return String(value) + 'px';
}

/**
 * Get display text part from the wikilink.
 * 
 * @param wikilink It may be delimited with `[[` and `]]` or may not. It
 * also may be an embed link
 */
export function getLinkDisplayText(wikilink: string): string {
	if (wikilink.startsWith('[[') && wikilink.endsWith(']]'))
		wikilink = wikilink.slice(2, -2);
	else if (wikilink.startsWith('![[') && wikilink.endsWith(']]'))
		wikilink = wikilink.slice(3, -2);

	const firstBarIdx = wikilink.indexOf('|');
	return firstBarIdx < 0 ? '' : wikilink.slice(firstBarIdx + 1);
}

/**
 * Parse and break link display text down into several parts.
 * 
 * Display text is a part of wikilink which is placed after linktext,
 * separated between them with `|`. `ipsum` in `[[Lorem|ipsum]]` and
 * `Cat|300x400` in `[[cat.png|Cat|300x400]]` are display text.
 */
export function parseLinkDisplayText(displayText: string): {
	/**
	 * Actual text that will be displayed.
	 */
	title: string;
	/**
	 * Width data specified in diplay text.
	 */
	width: number | null;
	/**
	 * Height data specified in diplay text.
	 */
	height: number | null;
} {
	let title = displayText;
	let width: number | null = null;
	let height: number | null = null;

	const lastBarIdx = displayText.lastIndexOf('|');
	const mayBeSize = displayText.slice(lastBarIdx + 1);
	const sizeData = EMBED_SIZE_SYNTAX_RE.exec(mayBeSize);

	if (sizeData) {
		const [, widthStr, heightStr] = sizeData;
		title = displayText.slice(0, Math.max(lastBarIdx, 0));
		width = parseInt(widthStr ?? '0');
		height = heightStr ? parseInt(heightStr) : null;
	}

	return { title, width, height };
}

/**
 * Create a component that will run given callbacks on loaded/unloaded.
 */
export function lifecycle(onload?: () => void, onunload?: () => void): Component {
	const component = new Component();
	if (onload) component.onload = onload;
	if (onunload) component.onunload = onunload;
	return component;
}

/**
 * Run the callback once the element is inserted to the DOM. Has the
 * similiar function with `Node.prototype.onNodeInserted()`.
 * 
 * @param el
 * @param cb Callback that acts as a handler.
 * @param unregisterer The handler will be removed if the given component
 * is getting unloaded.
 */
export function onceElInserted(el: HTMLElement, cb: () => void, unregisterer?: Component): void {
	const observer = lifecycle(undefined, el.onNodeInserted(() => {
		cb();
		unregisterer?.removeChild(observer);
	}, true));
	unregisterer?.addChild(observer);
}

/**
 * Track pointer activity and call the handler corresponding to the fired
 * event. It is one-time function. Once the pointer is released, either
 * being ended or cancelled, or the tracking is aborted manually, the
 * handlers will no longer be called.
 * 
 * @param startEvt `pointerdown` event instance to start with.
 * @param handlers A set of handlers, where each handler will be called
 * based on the fired event.
 * @param startThreshold How many pixels the pointer should move before
 * triggering the handlers. Default to 5.
 * 
 * @returns Aborter function. Call this to abort the tracking
 * immediately.
 */
export function trackPointer(startEvt: PointerEvent, handlers: {
	/**
	 * Called first before called the rest of the handlers. It will not be
	 * called until the pointer has moved a distance equal to or greater than
	 * the `startThreshold`.
	 */
	start?(): void;
	/**
	 * Called upon `pointermove` event.
	 */
	move?(evt: PointerEvent): void;
	/**
	 * Called upon `pointerup`, `dragstart`, or `drop` events.
	 */
	end?(evt: PointerEvent | DragEvent): void;
	/**
	 * Called upon `pointercancel` event or pressing Escape key.
	 */
	cancel?(evt: PointerEvent | KeyboardEvent): void;
	/**
	 * Called upon `keydown` event, unless Escape key is pressed.
	 */
	keydown?(evt: KeyboardEvent): void;
	/**
	 * Called upon `keyup` event.
	 */
	keyup?(evt: KeyboardEvent): void;
	/**
	 * Place your cleanup operation here. Called after either `end()`,
	 * `cancel()`, or returned aborter function is called.
	 */
	cleanup?(started: boolean): void;
}, startThreshold = 5): () => void {
	// Must be primary pointer in case of multi-pointing device.
	if (!startEvt.isPrimary) return () => {};

	startThreshold = Math.abs(startThreshold);

	const { win } = startEvt;
	const abortController = new AbortController();

	// Handler should be marked as started as soon as possible when the
	// threshold is 0.
	let started = startThreshold === 0;
	const startPoint = pointerToPoint(startEvt);

	if (started) handlers.start?.();

	function dispose(): void {
		abortController.abort();
		handlers.cleanup?.(started);
	}

	function onPointerMove(evt: PointerEvent): void {
		if (!started) {
			const currPoint = pointerToPoint(evt);
			if (measureDistance(startPoint, currPoint) >= startThreshold) {
				started = true;
				handlers.start?.();
			}
		}

		if (started && evt.pointerId == startEvt.pointerId)
			handlers.move?.(evt);
	}

	function onPointerUp(evt: PointerEvent): void {
		if (evt.button == startEvt.button && evt.pointerId == startEvt.pointerId) {
			dispose();
			if (started) handlers.end?.(evt);
		}
	}

	function onPointerCancel(evt: PointerEvent): void {
		if (evt.pointerId == startEvt.pointerId) {
			dispose();
			if (started) handlers.cancel?.(evt);
		}
	}

	function onDragStartOrDrop(evt: DragEvent): void {
		dispose();
		if (started) handlers.end?.(evt);
	}

	function onContextMenu(evt: PointerEvent): void {
		dispose();
		if (started) handlers.cancel?.(evt);
	}

	function onKeyDown(evt: KeyboardEvent): void {
		if (evt.key == 'Escape') {
			dispose();
			if (started) handlers.cancel?.(evt);
		}
		if (started) handlers.keydown?.(evt);
	}

	function onKeyUp(evt: KeyboardEvent): void {
		if (started) handlers.keyup?.(evt);
	}

	win.addEventListener('pointermove', onPointerMove, { signal: abortController.signal });
	win.addEventListener('pointerup', onPointerUp, { signal: abortController.signal });
	win.addEventListener('pointercancel', onPointerCancel, { signal: abortController.signal });
	win.addEventListener('dragstart', onDragStartOrDrop, { signal: abortController.signal });
	win.addEventListener('drop', onDragStartOrDrop, { signal: abortController.signal });
	win.addEventListener('contextmenu', onContextMenu, { signal: abortController.signal });
	win.addEventListener('keydown', onKeyDown, { signal: abortController.signal });
	win.addEventListener('keyup', onKeyUp, { signal: abortController.signal });

	return dispose;
}

/**
 * Event-driven scroll. You would likely use this on element whose
 * default srolling has been disabled, e.g. via `touch-action: none` on
 * touchscreen devices, as a fallback.
 * 
 * It is one-time function. Thus, you need to call this function for each
 * event emitted.
 * 
 * @param evt Determines where the scroll should start.
 */
export function fallbackScroll(evt: PointerEvent): void {
	if (!evt.targetNode?.instanceOf(HTMLElement)) return;

	const scrollable = findScrollable(evt.targetNode);
	let lastEvt = evt;

	trackPointer(evt, {
		move: currEvt => {
			const x = lastEvt.x - currEvt.x;
			const y = lastEvt.y - currEvt.y;
			scrollable.scrollBy(x, y);
			lastEvt = currEvt;
		}
	}, 0);
}

/**
 * Prevent an event from propagating and having default behavior.
 */
export function lockEvent(evt: Event): void {
	evt.preventDefault();
	evt.stopPropagation();
	evt.stopImmediatePropagation();
}

/**
 * Indicate that the element is inside canvas node.
 */
export function insideCanvasNode(el: HTMLElement): boolean {
	return el.matches('.canvas-node *');
}

/**
 * Set updated `CanvasRect` to `canvasRect` property using current
 * wrapper dimension.
 * 
 * @param canvas `Canvas` whose `canvasRect` property to be updated.
 */
export function ensureCanvasRect(canvas: Canvas): void {
	const { wrapperEl } = canvas;
	const wrapperRect = wrapperEl.getBoundingClientRect();

	const left = wrapperRect.left + wrapperEl.clientLeft;
	const top = wrapperRect.top + wrapperEl.clientTop;
	const width = wrapperEl.clientWidth;
	const height = wrapperEl.clientHeight;

	canvas.canvasRect = {
		left, top, width, height,
		// Center point.
		cx: left + width / 2,
		cy: top + height / 2,
		minX: -width / 2,
		minY: -height / 2,
		maxX: width / 2,
		maxY: width / 2
	};
}

/**
 * Get nodes contained by the given group node.
 */
export function getGroupedNodes(group: CanvasGroupData, canvas: CanvasData): AllCanvasNodeData[] {
	return canvas.nodes.filter(node => (
		node.id != group.id &&
		node.x >= group.x &&
		node.y >= group.y &&
		// Right
		node.x + node.width <= group.width + group.x &&
		// Bottom
		node.y + node.height <= group.height + group.y
	));
}

/**
 * Get edges connecting between two of given nodes.
 */
export function getEdgesFromNodes(nodes: Record<string, AllCanvasNodeData>, canvas: CanvasData): CanvasEdgeData[] {
	return canvas.edges.filter(edge => (
		edge.fromNode in nodes &&
		edge.toNode in nodes
	));
}

/**
 * Measure distance between two points.
 */
export function measureDistance(pointA: Point, pointB: Point): number {
	return Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y);
}

/**
 * Get editor widget attached to the element.
 */
export function getEditorWidgetFromEl(el: HTMLElement): WidgetType | null {
	const widgetView = el.cmTile ?? el.cmView;

	if (widgetView && isWidgetView(widgetView)) {
		return widgetView.widget;
	} else {
		return null;
	}
}

const EMBED_SIZE_SYNTAX_RE = /^(\d+)(?:x(\d+))?$/;

/**
 * Whether the given `ContentView` is a `WidgetView`.
 */
function isWidgetView(contentView: Tile): contentView is WidgetTile {
	return (
		'widget' in contentView &&
		contentView.widget instanceof WidgetType
	);
}

/**
 * Find nearest scrollable element from the given element.
 */
function findScrollable(el: HTMLElement): HTMLElement {
	const win = el.win;
	let curr: HTMLElement | null = el;

	while (curr) {
		const { overflow } = win.getComputedStyle(curr);
		if (overflow.split(' ').every(val => val === 'auto' || val === 'scroll'))
			return curr;

		curr = curr.parentElement;
	}

	return win.document.documentElement;
}

/**
 * Extract pointer coordinates as `Point`.
 */
function pointerToPoint(evt: MouseEvent): Point {
	return {
		x: evt.clientX,
		y: evt.clientY
	};
}
