import { type App, ButtonComponent, MarkdownView, Modal } from './obsidian';
import { t } from './i18n';

export class ReloadNotesPrompt extends Modal {
	public constructor(app: App) {
		super(app);

		this.setTitle(t('reloadNotesPrompt.title'));

		this.contentEl.createEl('p', { text: t('reloadNotesPrompt.desc') });

		this.contentEl.createDiv('modal-button-container', el => {
			new ButtonComponent(el)
				.setCta()
				.setButtonText(t('reloadNotesPrompt.buttonReload'))
				.onClick(() => {
					this.reloadNotes();
					this.close();
				});

			new ButtonComponent(el)
				.setButtonText(i18next.t('dialogue.button-cancel'))
				.onClick(() => this.close());
		});
	}

	private reloadNotes(): void {
		this.app.workspace.getLeavesOfType('markdown').forEach(leaf => {
			if (leaf.view instanceof MarkdownView)
				void leaf.rebuildView();
		});
	}

	public static open(app: App): void {
		new ReloadNotesPrompt(app).open();
	}
}