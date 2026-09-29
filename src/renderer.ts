import { type CanvasOwner, Platform } from './obsidian';
import { Canvas } from './hook';

/**
 * Get read-only `Canvas`, preconfigured for embed.
 * 
 * @param owner Object that implements `CanvasOwner`.
 */
export function getCanvasRenderer(owner: CanvasOwner): Canvas {
	let renderer = new Canvas(owner);

	// Hide quick settings button to prevent user from reverting read-only
	// state.
	renderer.quickSettingsButton.parentElement?.detach();
	// Hide history (undo/redo) buttons.
	renderer.undoBtnEl.parentElement?.detach();

	// Canvas help button does not exist on mobile.
	if (!Platform.isMobile) {
		// Hide canvas help button.
		renderer.canvasControlsEl.lastElementChild?.detach();
	}

	// Hide card menu buttons to prevent user from adding canvas node.
	renderer.cardMenuEl.detach();
	// Make it read-only.
	renderer.setReadonly(true);
	// Prevent canvas from being drop destination.
	renderer.wrapperEl.addEventListener('drop', evt => evt.preventDefault(), true);

	// Force canvas direction to ltr, due to quirk behavior: nodes shift
	// slightly to the right inaccurately in rtl direction (bug?).
	renderer.canvasEl.dir = 'ltr';

	return renderer;
}