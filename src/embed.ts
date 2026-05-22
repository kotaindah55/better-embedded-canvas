import {
	type App,
	type CanvasEditor,
	type CanvasEditorOwner,
	type CanvasPluginInstance,
	type EmbedComponent,
	type EmbedContext,
	type TAbstractFile,
	type TFile,
	type Vault,
	type Workspace,
	Component,
	Keymap,
	setIcon,
	setTooltip
} from 'obsidian';
import type { CanvasData } from 'obsidian/canvas';
import { getCanvasRenderer } from './renderer';
import { getInternalPlugin } from './utils';
import { t } from './i18n';
import * as store from './store';

/**
 * Minimum canvas height in px.
 */
const MIN_CANVAS_HEIGHT = 300;

/**
 * Wrapper that manages embedded canvas' lifecycle.
 */
export class CanvasEmbedComponent extends Component implements EmbedComponent, CanvasEditorOwner {
	public readonly app: App;
	public readonly canvas: CanvasEditor;
	public readonly contentEl: HTMLElement;
	public readonly plugin: CanvasPluginInstance;
	public readonly file: TFile;
	public readonly ctx: EmbedContext;
	public readonly subpath?: string | undefined;

	private readonly vault: Vault;
	private readonly workspace: Workspace;
	private readonly containerEl: HTMLElement;
	/**
	 * Displays file name.
	 */
	private readonly headerEl: HTMLElement;
	private readonly resizeObserver: ResizeObserver;
	/**
	 * Notifies canvas height update.
	 */
	private readonly mutationObserver: MutationObserver;

	private constructor(ctx: EmbedContext, file: TFile, subpath?: string) {
		super();
		this.app = ctx.app;
		this.vault = this.app.vault;
		this.workspace = this.app.workspace;
		this.plugin = getInternalPlugin(this.app, 'canvas').instance;
		this.ctx = ctx;
		this.file = file;
		this.subpath = subpath;
		
		this.containerEl = ctx.containerEl;
		this.containerEl.addClass('canvas-embed', 'better-canvas-embed');
		this.containerEl.toggleClass('inline-embed', ctx.showInline ?? false);
		
		this.headerEl = this.containerEl.createDiv('embed-title', el => {
			el.createSpan('file-embed-icon', iconEl => setIcon(iconEl, 'lucide-layout-dashboard'));
			el.appendText(' ' + file.basename);
			el.addEventListener('click', evt => this.openOnClick(evt));
		});
		this.contentEl = this.containerEl.createDiv('canvas-content');

		this.resizeObserver = new ResizeObserver(() => this.canvas.onResize());
		this.mutationObserver = new MutationObserver(() => this.updateHeight());

		this.canvas = getCanvasRenderer(this);
		this.canvas.canvasControlsEl.createDiv({
			cls: ['canvas-control-group', 'mod-raised'],
			prepend: true,
		}, groupEl => groupEl.createDiv('canvas-control-item', itemEl => {
			setIcon(itemEl, 'lucide-maximize-2');
			setTooltip(itemEl, t('tooltipOpenCanvas'), { placement: 'left' });
			itemEl.addEventListener('click', evt => this.openOnClick(evt));
		}));

		// Show header in internal embed only, such as that in the editor.
		if (!this.containerEl.hasClass('internal-embed'))
			this.headerEl.detach();
	}

	public override onload(): void {
		this.canvas.load();
		// Triggered each time a file has been modified.
		this.registerEvent(this.vault.on('modify', this.handleModify, this));
		// Store this embed.
		store.storeCanvasEmbed(this);
	}

	public override onunload(): void {
		this.resizeObserver.disconnect();
		this.mutationObserver.disconnect();
		this.canvas.unload();
		store.discardCanvasEmbed(this);
	}

	public requestSave(): void {}

	public saveLocalData(): void {}

	public async loadFile(): Promise<void> {
		let data = await this.app.vault.cachedRead(this.file);
		this.setData(data, true);
	}

	/**
	 * Set unserialized JSON data as `CanvasData`.
	 * 
	 * @param data Unserialized (stringified) JSON data.
	 * @param firstLoad Set it to true if this is first data loading.
	 */
	private setData(data: string, firstLoad: boolean): void {
		try {
			let serialized = JSON.parse(data) as CanvasData;
			this.canvas.setData(serialized);
		} catch (err) {
			console.error(err);
		}

		if (firstLoad) {
			// `containerEl` is not immediately loaded into the DOM.
			this.containerEl.onNodeInserted(() => {
				this.updateHeight();
				this.canvas.zoomToFitQueued = true;
				this.canvas.onResize();

				// Start all observers at first load.
				this.resizeObserver.observe(this.containerEl);
				this.mutationObserver.observe(this.containerEl, {
					attributes: true,
					attributeFilter: ['width']
				});
			}, true);
		} else {
			this.canvas.createPlaceholder();
			this.canvas.requestFrame();
		}
	}

	/**
	 * Open canvas individually at preferred tab.
	 */
	private async openOnClick(evt: PointerEvent): Promise<void> {
		let leaf = this.workspace.getLeaf(Keymap.isModEvent(evt));
		await leaf.openFile(this.file);
	}

	/**
	 * Update embed height based on first value of specified dimension in the
	 * internal link.
	 * 
	 * `[[my-canvas|400]]` will adjust the canvas' height to 400px.
	 */
	private updateHeight(): void {
		// First value of specified dimension (e.g. "400" in "[[link-to-file|400x300]]")
		// is stored as "width" attribute value.
		let height = Number(this.containerEl.getAttr('width'));
		this.contentEl.setCssStyles({ height: height && height > MIN_CANVAS_HEIGHT
			? height + 'px'
			: MIN_CANVAS_HEIGHT + 'px'
		});
	}

	private async handleModify(aFile: TAbstractFile): Promise<void> {
		if (aFile != this.file) return;
		// Update the canvas when the file is modified.
		let data = await this.vault.cachedRead(this.file);
		this.setData(data, false);
	}

	/**
	 * Implementation of `EmbedCreator`.
	 */
	public static create(ctx: EmbedContext, file: TFile, subpath?: string): CanvasEmbedComponent {
		return new CanvasEmbedComponent(ctx, file, subpath);
	}
}