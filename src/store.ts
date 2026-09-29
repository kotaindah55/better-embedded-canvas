import type { Canvas } from './obsidian';
import type { CanvasEmbedComponent } from './embed';

/**
 * Holds a canvas that is currently being panned.
 */
let canvasBeingPanned: Canvas | null = null;

/**
 * Stores sets of loaded `CanvasEmbedComponent`s.
 */
const canvasEmbedStore = new Set<CanvasEmbedComponent>();

/**
 * Stores embed depth mapped onto corresponding embed element.
 */
const embedDepthStore = new WeakMap<HTMLElement, number>();

/**
 * Store a canvas and mark it as being panned. It will replace already
 * stored canvas.
 */
export function setPannedCanvas(canvas: Canvas): void {
	canvasBeingPanned = canvas;
}

/**
 * Remove canvas marked as being panned.
 * 
 * @param canvas If specified, stored canvas will only be removed if it
 * is the same canvas as the specified one. Otherwise, remove it anyway.
 */
export function removePannedCanvas(canvas?: Canvas): void {
	if (!canvas || canvasBeingPanned == canvas)
		canvasBeingPanned = null;
}

/**
 * Check whether specified canvas is marked as being panned.
 */
export function isPannedCanvas(canvas: Canvas): boolean {
	return canvasBeingPanned == canvas;
}

/**
 * Get embedding depth of nearest containing canvas/markdown embed.
 */
export function getEmbedDepth(el: HTMLElement): number | null {
	let curr = el.parentElement;

	while (curr) {
		if (embedDepthStore.has(curr)) {
			let depth = embedDepthStore.get(curr);
			return depth ?? 1;
		}
		curr = curr.parentElement;
	}

	return null;
}

/**
 * Iterate over all loaded `CanvasEmbedComponent`s and run the callback
 * on every `CanvasEmbedComponent`.
 */
export function iterateCanvasEmbeds(cb: (embed: CanvasEmbedComponent) => void): void {
	canvasEmbedStore.forEach(cb);
}

/**
 * Cache embedding depth of an embed.
 * 
 * @param embedEl Embed element as a key to retrieve the depth.
 * @param depth Embedding depth, retrieved from `EmbedContext`.
 */
export function cacheEmbedDepth(embedEl: HTMLElement, depth: number): void {
	embedDepthStore.set(embedEl, depth);
}

/**
 * Store loaded `CanvasEmbedComponent` to `embedStore`.
 * 
 * @param embed Must be loaded `CanvasEmbedComponent`.
 */
export function storeCanvasEmbed(embed: CanvasEmbedComponent): void {
	canvasEmbedStore.add(embed);
}

/**
 * Discard `CanvasEmbedComponent` from `embedStore`.
 */
export function discardCanvasEmbed(embed: CanvasEmbedComponent): void {
	canvasEmbedStore.delete(embed);
}

/**
 * Discard all `CanvasEmbedComponent`s from `embedStore`.
 */
export function discardAllCanvasEmbeds(): void {
	canvasEmbedStore.clear();
}