import type { CanvasEditorOwner } from 'obsidian';
import { CanvasEditor } from './hook';

/**
 * Get read-only `CanvasEditor`, preconfigured for embed.
 * 
 * @param owner Object that implements `CanvasEditorOwner`.
 */
export function getCanvasRenderer(owner: CanvasEditorOwner): CanvasEditor {
	let renderer = new CanvasEditor(owner);

	// Hide quick settings button to prevent user from reverting read-only
	// state.
	renderer.quickSettingsButton.parentElement?.detach();
	// Hide history (undo/redo) buttons.
	renderer.undoBtnEl.parentElement?.detach();
	// Hide card menu buttons to prevent user from adding canvas node.
	renderer.cardMenuEl.detach();
	// Make it read-only.
	renderer.setReadonly(true);
	// Prevent canvas from being drop destination.
	renderer.wrapperEl.addEventListener('drop', evt => evt.preventDefault(), true);

	return renderer;
}