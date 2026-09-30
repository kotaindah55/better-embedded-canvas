import type { CanvasData } from 'obsidian/canvas';
import { Component, MarkdownRenderer } from '../obsidian';
import type { CanvasEmbed, CanvasEmbedRenderer } from '../embed';
import { lifecycle } from '../utils';

/**
 * Render the content of single node instead preserving whole canvas
 * interface.
 */
export class CanvasEmbedMarkdownRenderer extends Component implements CanvasEmbedRenderer {
	public readonly owner: CanvasEmbed;
	private readonly previewEl: HTMLElement;
	/**
	 * Controls the lifecycle of the rendered markdown and the loaded
	 * child components inside.
	 */
	private readonly holder: Component;

	private get sourcePath(): string {
		return this.owner.file.path;
	}

	public constructor(owner: CanvasEmbed) {
		super();
		this.owner = owner;
		this.previewEl = createDiv('markdown-preview-view markdown-rendered');
		this.holder = lifecycle(undefined, () => this.previewEl.empty());
	}

	public override onload(): void {
		this.owner.containerEl.addClass('markdown-embed');
		this.owner.headerEl.addClass('markdown-embed-title');
		this.owner.contentEl.addClass('markdown-embed-content');
		this.owner.contentEl.append(this.previewEl);
	}

	public override onunload(): void {
		this.previewEl.detach();
		this.owner.containerEl.removeClass('markdown-embed');
		this.owner.headerEl.removeClass('markdown-embed-title');
		this.owner.contentEl.removeClass('markdown-embed-content');
	}

	public async setData(data: CanvasData): Promise<void> {
		this.removeChild(this.holder);

		// Only use the first node.
		if (data.nodes[0]) {
			const node = data.nodes[0];
			let text = 'Card does not exist';

			switch (node.type) {
				case 'text': {
					text = node.text;
					break;
				}
				case 'file': {
					// Use internal link for file node.
					text = `[[${node.file}]]`;
					break;
				}
				case 'link': {
					// Use stored url for link node.
					text = node.url;
					break;
				}
				case 'group': {
					// Use group label for group node.
					text = node.label ?? 'Unnamed group';
					break;
				}
			}

			// This "holder" will perform full-clean right after being unloaded.
			this.addChild(this.holder);
			await MarkdownRenderer.render(this.owner.app, text, this.previewEl, this.sourcePath, this.holder);
		}
	}
}
