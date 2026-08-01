import { type App, MarkdownView, Notice } from './obsidian';
import { t } from './i18n';

export function noticeReload(app: App): void {
	let notice = new Notice(t('reloadNotice.message'));

	notice.addButton(t('reloadNotice.buttonReload'), () => {
		reloadNotes(app);
		reloadCanvases(app);
	});

	notice.addButton(t('reloadNotice.buttonDismiss'), () => notice.hide());
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