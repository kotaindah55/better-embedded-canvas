import {
	type App,
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