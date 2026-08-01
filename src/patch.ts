import { around, dedupe } from 'monkey-around';
import { type Plugin, Platform } from './obsidian';
import { CanvasEditor } from './hook';
import { CanvasEmbedComponent } from './embed';
import { lockEvent, trackPointer } from './utils';

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
	// Added as prototype property, not as instance property, to be able to
	// be shared among CanvasEditor instances.
	CanvasEditor.beingPannedCanvas = null;

	plugin.register(() => void delete CanvasEditor.beingPannedCanvas);

	plugin.register(around(CanvasEditor.prototype, {
		onWheel: oldFn => dedupe(plugin.manifest.id, oldFn, function (this: CanvasEditor, evt) {
			if (this.noInteraction) return;

			oldFn.call(this, evt);
			// Prevent containing editor from being zoomed.
			if (this.view instanceof CanvasEmbedComponent)
				evt.stopPropagation();
		}),

		onPointerdown: oldFn => dedupe(plugin.manifest.id, oldFn, function (this: CanvasEditor, evt) {
			if (this.noInteraction) return;
			oldFn.call(this, evt);
		}),

		onPriorityPointerdown: oldFn => dedupe(plugin.manifest.id, oldFn, function (this: CanvasEditor, evt) {
			if (this.noInteraction || evt.pointerType != 'mouse') return;
			
			// Panning using middle button.
			if (evt.button == MouseButton.Middle) {
				let startPos = this.posFromEvt(evt);

				CanvasEditor.beingPannedCanvas = this;
				this.setDragging(true);
				evt.preventDefault();
				
				let abort = trackPointer(evt, {
					move: evt => {
						if (CanvasEditor.beingPannedCanvas == this) {
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
						if (CanvasEditor.beingPannedCanvas == this) CanvasEditor.beingPannedCanvas = null;
						this.setDragging(false);
					}
				});
			}
			
			// Panning using button that triggers context menu.
			if (evt.button == MouseButton.Right || Platform.isMacOS && evt.button == MouseButton.Middle && evt.ctrlKey) {
				let startPos = this.posFromEvt(evt);

				CanvasEditor.beingPannedCanvas = this;
				this.setDragging(true);
				evt.preventDefault();

				let abort = trackPointer(evt, {
					move: evt => {
						if (CanvasEditor.beingPannedCanvas == this) {
							let currPos = this.posFromEvt(evt);
							this.panBy(startPos.x - currPos.x, startPos.y - currPos.y);
						} else {
							abort();
						}
					},

					cleanup: () => {
						if (CanvasEditor.beingPannedCanvas == this) CanvasEditor.beingPannedCanvas = null;
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
			// Remove this canvas from beingPannedCanvas variable.
			if (CanvasEditor.beingPannedCanvas == this) CanvasEditor.beingPannedCanvas = null;
		}),

		updateSelection: oldFn => dedupe(plugin.manifest.id, oldFn, function (this: CanvasEditor, selectCb) {
			if (this.noInteraction) return;
			oldFn.call(this, selectCb);
		})
	}));
}