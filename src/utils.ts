import type { App, CanvasEditor, EmbedCreator, InternalPlugin, InternalPluginIDs } from 'obsidian';

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
 * Get internal plugin (core plugin) by its id.
 * 
 * @param app `App` instance.
 * @param id Internal plugin id.
 */
export function getInternalPlugin<T extends InternalPluginIDs>(app: App, id: T): InternalPlugin<T> {
	return app.internalPlugins.getPluginById<T>(id);
}