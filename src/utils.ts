import type {
	AllCanvasNodeData,
	CanvasData,
	CanvasEdgeData,
	CanvasGroupData
} from 'obsidian/canvas';
import type {
	App,
	CanvasEditor,
	EmbedCreator,
	InternalPlugin,
	InternalPluginId,
	Point
} from './obsidian';

/**
 * Check whether the object has all the properties.
 */
export function hasOwnAll<T, P extends string>(obj: T, ...props: P[]): obj is T & Record<P, unknown> {
	if (!obj || typeof obj != 'object' && typeof obj != 'function') return false;
	return props.every(prop => Object.hasOwn(obj, prop));
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
export function replaceEmbedCreator(app: App, ext: string, creator: EmbedCreator): EmbedCreator | null {
	let reg = app.embedRegistry,
		oldCreator = reg.embedByExtension[ext] ?? null;

	// Registering creator to already registered extension throws error.
	// Therefore, we need to unregister it first.
	reg.unregisterExtension(ext);
	reg.registerExtension(ext, creator);

	return oldCreator;
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
	cleanup?(): void;
}, startThreshold = 5): () => void {
	// Must be primary pointer in case of multi-pointing device.
	if (!startEvt.isPrimary) return () => {};

	startThreshold = Math.abs(startThreshold);

	let { win } = startEvt,
		abortController = new AbortController();

	let started = false,
		startPoint = pointerToPoint(startEvt);

	function dispose(): void {
		abortController.abort();
		if (started) handlers.cleanup?.();
	}

	function onPointerMove(evt: PointerEvent): void {
		if (!started) {
			let currPoint = pointerToPoint(evt);
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
 * Prevent an event from propagating and having default behavior.
 */
export function lockEvent(evt: Event): void {
	evt.preventDefault();
	evt.stopPropagation();
	evt.stopImmediatePropagation();
}

/**
 * Set updated `CanvasRect` to `canvasRect` property using current
 * wrapper dimension.
 * 
 * @param canvas `CanvasEditor` whose `canvasRect` property to be updated.
 */
export function ensureCanvasRect(canvas: CanvasEditor): void {
	let { wrapperEl } = canvas,
		wrapperRect = wrapperEl.getBoundingClientRect();

	let left = wrapperRect.left + wrapperEl.clientLeft,
		top = wrapperRect.top + wrapperEl.clientTop,
		width = wrapperEl.clientWidth,
		height = wrapperEl.clientHeight;

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
function measureDistance(pointA: Point, pointB: Point): number {
	return Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y);
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