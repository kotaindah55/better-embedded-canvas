import { type App, MarkdownView, Notice } from './obsidian';
import { t } from './i18n';

export function noticeReloadAfterDisable(app: App): void {
	let notice = new Notice(t('notice.reloadAfterDisable'), 0);

	notice.addButton(t('buttonReload'), () => {
		reloadNotes(app);
		reloadCanvases(app);
	});

	notice.addButton(t('buttonDismiss'), () => notice.hide());
}

export function noticeRestartApp(): void {
	new Notice(t('notice.restartApp'), 5000);
}

export function noticeCanvasIsDisabled(): void {
	new Notice(t('notice.canvasIsDisabled'), 5000);
}

/**
 * Reload all non-deferred notes.
 */
function reloadNotes(app: App): void {
	app.workspace.getLeavesOfType('markdown').forEach(leaf => {
		if (leaf.view instanceof MarkdownView)
			void leaf.rebuildView();
	});
}

/**
 * Reload all non-deferred canvases.
 */
function reloadCanvases(app: App): void {
	app.workspace.getLeavesOfType('canvas').forEach(leaf => {
		if (!leaf.isDeferred)
			void leaf.rebuildView();
	});
}