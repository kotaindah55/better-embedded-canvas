import type { CanvasEditor } from './obsidian';
import type { CanvasEmbedComponent } from './embed';

/**
 * Holds a canvas that is currently being panned.
 */
let beingPanned: CanvasEditor | null = null;

/**
 * Stores sets of loaded `CanvasEmbedComponent`s.
 */
const embedStore = new Set<CanvasEmbedComponent>();

/**
 * Store a canvas and mark it as being panned. It will replace already
 * stored canvas.
 */
export function setPannedCanvas(canvas: CanvasEditor): void {
	beingPanned = canvas;
}

/**
 * Remove canvas marked as being panned.
 * 
 * @param canvas If specified, stored canvas will only be removed if it
 * is the same canvas as the specified one. Otherwise, remove it anyway.
 */
export function removePannedCanvas(canvas?: CanvasEditor): void {
	if (!canvas || beingPanned == canvas)
		beingPanned = null;
}

/**
 * Check whether specified canvas is marked as being panned.
 */
export function isPannedCanvas(canvas: CanvasEditor): boolean {
	return beingPanned == canvas;
}

/**
 * Iterate over all loaded `CanvasEmbedComponent`s and run the callback
 * on every `CanvasEmbedComponent`.
 */
export function iterateCanvasEmbeds(cb: (embed: CanvasEmbedComponent) => void): void {
	embedStore.forEach(cb);
}

/**
 * Store loaded `CanvasEmbedComponent` to `embedStore`.
 * 
 * @param embed Must be loaded `CanvasEmbedComponent`.
 */
export function storeCanvasEmbed(embed: CanvasEmbedComponent): void {
	embedStore.add(embed);
}

/**
 * Discard `CanvasEmbedComponent` from `embedStore`.
 */
export function discardCanvasEmbed(embed: CanvasEmbedComponent): void {
	embedStore.delete(embed);
}

/**
 * Discard all `CanvasEmbedComponent`s from `embedStore`.
 */
export function discardAllCanvasEmbeds(): void {
	embedStore.clear();
}