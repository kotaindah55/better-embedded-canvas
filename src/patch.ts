import { around, dedupe } from 'monkey-around';
import type { Plugin } from './obsidian';
import { CanvasEditor } from './hook';
import { CanvasEmbedComponent } from './embed';

/**
 * Patch `CanvasEditor` prototype. Unistalled automatically when
 * unloading the plugin.
 */
export function patchCanvasEditor(plugin: Plugin): void {
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
			if (this.noInteraction) return;
			oldFn.call(this, evt);
		}),

		onPointermove: oldFn => dedupe(plugin.manifest.id, oldFn, function (this: CanvasEditor, evt) {
			if (this.noInteraction) return;
			oldFn.call(this, evt);
		})
	}));
}