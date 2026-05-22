import { type Debouncer, debounce } from 'obsidian';
import type { CanvasEmbedComponent } from './embed';
import { ensureCanvasRect } from './utils';

/**
 * Stores sets of loaded `CanvasEmbedComponent`s. Each set is mapped by
 * `Window` instance as its key.
 */
const embedStore = new Map<Window, Set<CanvasEmbedComponent>>();

/**
 * Queue of pending `CanvasRect` update.
 */
const updateQueue = new Map<Window, Debouncer<[], void>>();

/**
 * Throttle updating the value of all `CanvasEditor.canvasRect` in
 * specific `Window`.
 * 
 * This makes sure that scroll-to-zoom and drag-to-select are performed
 * from correct cursor position.
 */
function updateCanvasRects(this: Window): void {
	if (!updateQueue.has(this)) updateQueue.set(this, debounce(() => {
		embedStore.get(this)?.forEach(embed => ensureCanvasRect(embed.canvas));
		updateQueue.delete(this);
	}, 20)());
}

/**
 * Store loaded `CanvasEmbedComponent` to `embedStore`.
 * 
 * @param embed Must be loaded `CanvasEmbedComponent`.
 */
export function storeCanvasEmbed(embed: CanvasEmbedComponent): void {
	let win = embed.contentEl.win,
		set = embedStore.get(win);

	if (set) {
		set.add(embed);
	} else {
		embedStore.set(win, new Set([embed]));
		// Watch for scroll event and update available embeds.
		win.addEventListener('scroll', updateCanvasRects, {
			capture: true,
			passive: true
		});
	}
}

/**
 * Discard `CanvasEmbedComponent` from `embedStore`.
 */
export function discardCanvasEmbed(embed: CanvasEmbedComponent): void {
	let win = embed.contentEl.win,
		set = embedStore.get(win);

	set?.delete(embed);

	// Abort pending update and detach scroll handler when the window
	// does not have any of stored embeds.
	if (set && !set.size) {
		updateQueue.get(win)?.cancel();
		updateQueue.delete(win);

		embedStore.delete(win);
		win.removeEventListener('scroll', updateCanvasRects, true);
	}
}

/**
 * Discard all `CanvasEmbedComponent`s from `embedStore`.
 */
export function discardAllCanvasEmbeds(): void {
	updateQueue.forEach(debouncer => debouncer.cancel());
	updateQueue.clear();

	embedStore.forEach((set, win) => {
		win.removeEventListener('scroll', updateCanvasRects, true);
		set.forEach(embed => embed.unload());
	});
	embedStore.clear();
}