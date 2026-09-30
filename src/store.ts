import type { Canvas } from './obsidian';
import type { CanvasEmbed } from './embed';

/**
 * Holds a canvas that is currently being panned.
 */
let canvasBeingPanned: Canvas | null = null;

/**
 * Stores sets of loaded `CanvasEmbed`s.
 */
const canvasEmbedStore = new Set<CanvasEmbed>();

/**
 * Stores embed depth mapped onto corresponding embed element.
 */
const embedDepthStore = new WeakMap<HTMLElement, number>();

/**
 * Store a canvas and mark it as being panned. It will replace already
 * stored canvas.
 */
function setPannedCanvas(canvas: Canvas): void {
	canvasBeingPanned = canvas;
}

/**
 * Remove canvas marked as being panned.
 * 
 * @param canvas If specified, stored canvas will only be removed if it
 * is the same canvas as the specified one. Otherwise, remove it anyway.
 */
function removePannedCanvas(canvas?: Canvas): void {
	if (!canvas || canvasBeingPanned == canvas)
		canvasBeingPanned = null;
}

/**
 * Check whether specified canvas is marked as being panned.
 */
function isPannedCanvas(canvas: Canvas): boolean {
	return canvasBeingPanned == canvas;
}

/**
 * Get embedding depth of nearest containing canvas/markdown embed.
 */
function getEmbedDepth(el: HTMLElement): number | null {
	let curr = el.parentElement;

	while (curr) {
		if (embedDepthStore.has(curr)) {
			const depth = embedDepthStore.get(curr);
			return depth ?? 1;
		}
		curr = curr.parentElement;
	}

	return null;
}

/**
 * Cache embedding depth of an embed.
 * 
 * @param embedEl Embed element as a key to retrieve the depth.
 * @param depth Embedding depth, retrieved from `EmbedContext`.
 */
function cacheEmbedDepth(embedEl: HTMLElement, depth: number): void {
	embedDepthStore.set(embedEl, depth);
}

/**
 * Iterate over all loaded `CanvasEmbed`s and run the callback
 * on every `CanvasEmbed`.
 */
function iterateCanvasEmbeds(cb: (embed: CanvasEmbed) => void): void {
	canvasEmbedStore.forEach(cb);
}

/**
 * Store loaded `CanvasEmbed` to `embedStore`.
 * 
 * @param embed Must be loaded `CanvasEmbed`.
 */
function storeCanvasEmbed(embed: CanvasEmbed): void {
	canvasEmbedStore.add(embed);
}

/**
 * Discard `CanvasEmbed` from `embedStore`.
 */
function discardCanvasEmbed(embed: CanvasEmbed): void {
	canvasEmbedStore.delete(embed);
}

/**
 * Discard all `CanvasEmbed`s from `embedStore`.
 */
function discardAllCanvasEmbeds(): void {
	canvasEmbedStore.clear();
}

export default {
	setPannedCanvas,
	removePannedCanvas,
	isPannedCanvas,
	getEmbedDepth,
	cacheEmbedDepth,
	iterateCanvasEmbeds,
	storeCanvasEmbed,
	discardCanvasEmbed,
	discardAllCanvasEmbeds
};
