import {
	type App,
	type CanvasEditor,
	type EmbedCreator,
	type InternalPlugin,
	type InternalPluginIDs,
	apiVersion
} from './obsidian';

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
export function getInternalPlugin<T extends InternalPluginIDs>(app: App, id: T): InternalPlugin<T> {
	return app.internalPlugins.getPluginById<T>(id);
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
 * Get serialized app version.
 */
export function getAppVersion(): {
	major: number,
	minor: number,
	patch: number
} {
	let serials = apiVersion.split('.').map(ver => parseInt(ver));
	return {
		major: serials[0] ?? 0,
		minor: serials[1] ?? 0,
		patch: serials[2] ?? 0
	};
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
 * 
 * @returns Aborter function. Call this to abort the tracking
 * immediately.
 */
export function trackPointer(startEvt: PointerEvent, handlers: {
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
}): () => void {
	// Must be primary pointer in case of multi-pointing device.
	if (!startEvt.isPrimary) return () => {};

	let { win } = startEvt,
		abortController = new AbortController();

	function dispose(): void {
		abortController.abort();
		handlers.cleanup?.();
	}

	function onPointerMove(evt: PointerEvent): void {
		if (evt.pointerId == startEvt.pointerId)
			handlers.move?.(evt);
	}

	function onPointerUp(evt: PointerEvent): void {
		if (evt.button == startEvt.button && evt.pointerId == startEvt.pointerId) {
			dispose();
			handlers.end?.(evt);
		}
	}

	function onPointerCancel(evt: PointerEvent): void {
		if (evt.button == startEvt.button && evt.pointerId == startEvt.pointerId) {
			dispose();
			handlers.cancel?.(evt);
		}
	}

	function onDragStartOrDrop(evt: DragEvent): void {
		dispose();
		handlers.end?.(evt);
	}

	function onContextMenu(evt: PointerEvent): void {
		dispose();
		handlers.cancel?.(evt);
	}

	function onKeyDown(evt: KeyboardEvent): void {
		if (evt.key == 'Escape') {
			dispose();
			handlers.cancel?.(evt);
		}
		handlers.keydown?.(evt);
	}

	function onKeyUp(evt: KeyboardEvent): void {
		handlers.keyup?.(evt);
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