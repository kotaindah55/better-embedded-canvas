import { around, dedupe } from 'monkey-around';
import { type Plugin, Platform } from './obsidian';
import { CanvasEditor } from './hook';
import { CanvasEmbedComponent } from './embed';
import { ensureCanvasRect, lockEvent, trackPointer } from './utils';
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
export function patchCanvasEditor(plugin: Plugin): void {
	plugin.register(around(CanvasEditor.prototype, {
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
				});
			}
			
			// Panning using button that triggers context menu.
			if (evt.button == MouseButton.Right || Platform.isMacOS && evt.button == MouseButton.Middle && evt.ctrlKey) {
				let startPos = this.posFromEvt(evt);

				store.setPannedCanvas(this);
				this.setDragging(true);
				evt.preventDefault();

				let abort = trackPointer(evt, {
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
						this.setDragging(false);

						// Do not open context menu once panning is ended.
						let timer = evt.win.setTimeout(() => {
							evt.win.removeEventListener('contextmenu', lockEvent, true);
							evt.win.clearTimeout(timer);
						}, 0);

						evt.win.addEventListener('contextmenu', lockEvent, true);
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