import { around, dedupe } from 'monkey-around';
import {
	type InternalLinkEditorSuggest,
	type InternalLinkSuggestManager,
	Platform,
	renderMatches,
	setIcon
} from './obsidian';
import { CanvasEditor, hookInternalLinkEditorSuggest } from './hook';
import { CanvasEmbedComponent } from './embed';
import { ensureCanvasRect, lockEvent, trackPointer } from './utils';
import { getComplexSuggestTemplate, getNodeSuggests } from './suggest';
import type { BetterEmbeddedCanvasPlugin } from './main';
import { t } from './i18n';
import * as store from './store';

const enum MouseButton {
	Left = 0,
	Middle,
	Right
}

/**
 * Patch `CanvasEditor` prototype. Unistalled automatically when
 * unloading the plugin.
 */
export function patchCanvasEditor(plugin: BetterEmbeddedCanvasPlugin): void {
	plugin.register(around(CanvasEditor.prototype, {
		handleMoverPointerdown: oldFn => dedupe(plugin.manifest.id, oldFn, function (this: CanvasEditor, evt) {
			// Prevent interaction-disabled canvas from being panned using space
			// key.
			if (this.noInteraction) return;
			oldFn.call(this, evt);
		}),

		onWheel: oldFn => dedupe(plugin.manifest.id, oldFn, function (this: CanvasEditor, evt) {
			if (this.noInteraction) return;

			oldFn.call(this, evt);
			// Prevent embedding note from being zoomed.
			if (this.view instanceof CanvasEmbedComponent)
				evt.stopPropagation();
		}),

		onPointerdown: oldFn => dedupe(plugin.manifest.id, oldFn, function (this: CanvasEditor, evt) {
			if (this.noInteraction) return;

			if (this.view instanceof CanvasEmbedComponent) {
				// Prevent embedding canvas from dragging.
				evt.stopPropagation();
				// Update canvas rect dimension. Thus, selection can be performed from
				// correct position.
				ensureCanvasRect(this);
			}

			oldFn.call(this, evt);
		}),

		// Fully rewrite
		onPriorityPointerdown: oldFn => dedupe(plugin.manifest.id, oldFn, function (this: CanvasEditor, evt) {
			if (this.noInteraction || evt.pointerType != 'mouse') return;

			// Because of the event in capturing phase, the order will be like this:
			// - Parent canvas is stored first.
			// - Then, embedded canvas is stored subsequently, replacing the parent.
			// - Panning will only occur on the stored canvas, In this case, it is
			//   the embedded one.
			
			// Panning using middle button.
			// eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison -- more compact and readable
			if (evt.button == MouseButton.Middle) {
				let startPos = this.posFromEvt(evt);

				store.setPannedCanvas(this);
				this.setDragging(true);
				evt.preventDefault();
				
				let abort = trackPointer(evt, {
					move: evt => {
						if (store.isPannedCanvas(this)) {
							// Pan the canvas to the current pointer position.
							let currPos = this.posFromEvt(evt);
							this.panBy(startPos.x - currPos.x, startPos.y - currPos.y);
						} else {
							// Do not pan the outer canvas if the most inner one is being panned.
							evt.preventDefault();
							abort();
						}
					},

					end: evt => {
						evt.preventDefault();
					},

					cleanup: () => {
						store.removePannedCanvas(this);
						this.setDragging(false);
					}
				}, 0);
			}
			
			// Panning using right button.
			// eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison -- more compact and readable
			if (evt.button == MouseButton.Right || Platform.isMacOS && evt.button == MouseButton.Middle && evt.ctrlKey) {
				let startPos = this.posFromEvt(evt);

				store.setPannedCanvas(this);
				evt.preventDefault();

				let abort = trackPointer(evt, {
					// Do not pan until the pointer reaches the threshold.
					start: () => {
						this.setDragging(true);
					},

					move: evt => {
						if (store.isPannedCanvas(this)) {
							let currPos = this.posFromEvt(evt);
							this.panBy(startPos.x - currPos.x, startPos.y - currPos.y);
						} else {
							abort();
						}
					},

					cleanup: () => {
						store.removePannedCanvas(this);
						
						// Do not open context menu once panning is ended.
						let timer = evt.win.setTimeout(() => {
							this.wrapperEl.removeEventListener('contextmenu', lockEvent, true);
							evt.win.clearTimeout(timer);
						}, 0);
						
						this.wrapperEl.addEventListener('contextmenu', lockEvent, true);
						this.setDragging(false);
					}
				});
			}
		}),

		onPointermove: oldFn => dedupe(plugin.manifest.id, oldFn, function (this: CanvasEditor, evt) {
			if (this.noInteraction) return;
			oldFn.call(this, evt);
		}),

		unload: oldFn => dedupe(plugin.manifest.id, oldFn, function (this: CanvasEditor) {
			oldFn.call(this);
			store.removePannedCanvas(this);
		}),

		updateSelection: oldFn => dedupe(plugin.manifest.id, oldFn, function (this: CanvasEditor, selectCb) {
			if (this.noInteraction) return;
			oldFn.call(this, selectCb);
		})
	}));
}

/**
 * Patch current `InternalLinkEditorSuggest` instance. Unistalled
 * automatically when unloading the plugin.
 */
export function patchInternalLinkEditorSuggest(plugin: BetterEmbeddedCanvasPlugin): void {
	let suggest = hookInternalLinkEditorSuggest(plugin.app);
	if (!suggest) return;

	patchInternalLinkSuggestManager(suggest, plugin);
	plugin.register(around(suggest, {
		renderSuggestion: oldFn => dedupe(plugin.manifest.id, oldFn, function (this: InternalLinkEditorSuggest, result, suggestEl) {
			if (result.type == 'alias' && result.isCanvasNode) {
				let { titleEl, noteEl, flairEl } = getComplexSuggestTemplate(suggestEl);

				suggestEl.toggleClass('mod-downranked', !!result.downranked);

				if (result.label) {
					renderMatches(titleEl, result.label, result.matches);
				} else if (result.nodeId) {
					renderMatches(titleEl, result.nodeId, result.idMatches ?? null);
				} else {
					titleEl.createSpan({
						cls: 'suggestion-empty-suggestion',
						text: t('editor.suggestion.noMatchedNode')
					});
				}

				if (result.nodeId) renderMatches(noteEl, result.nodeId, result.idMatches ?? null);
				if (result.isGroupNode) setIcon(flairEl, 'lucide-group');
			} else {
				oldFn.call(this, result, suggestEl);
			}
		})
	}));
}

/**
 * Patch `InternalLinkSuggestManager` instance obtained from internal
 * link editor suggest. Unistalled automatically when unloading the
 * plugin.
 */
function patchInternalLinkSuggestManager(suggest: InternalLinkEditorSuggest, plugin: BetterEmbeddedCanvasPlugin): void {
	plugin.register(around(suggest.suggestManager, {
		getHeadingSuggestions: oldFn => dedupe(plugin.manifest.id, oldFn, async function (this: InternalLinkSuggestManager, runnable, linkpath, query) {
			let file = this.app.metadataCache.getFirstLinkpathDest(linkpath, this.getSourcePath());
			return file?.extension == 'canvas'
				? await getNodeSuggests(plugin, file, linkpath, query)
				: await oldFn.call(this, runnable, linkpath, query);
		})
	}));
}