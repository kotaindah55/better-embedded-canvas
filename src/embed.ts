import type { CanvasData } from 'obsidian/canvas';
import {
	type App,
	type CanvasEditor,
	type CanvasEditorOwner,
	type CanvasPluginInstance,
	type EmbedComponent,
	type EmbedContext,
	type TAbstractFile,
	type TFile,
	Component,
	Keymap,
	MarkdownRenderer,
	setIcon,
	setTooltip
} from './obsidian';
import { getCanvasRenderer } from './renderer';
import { beingExportedAsPDF, getInternalPlugin, toPx } from './utils';
import { DEFAULT_PAGE_MARGIN, PageSizes } from './page-sizes';
import type { BetterEmbeddedCanvasPlugin } from './main';
import type { BetterEmbeddedCanvasSettingKey } from './settings';
import { CanvasView } from './hook';
import { t } from './i18n';
import * as store from './store';

/**
 * Minimum canvas height in px.
 */
const MIN_CANVAS_HEIGHT = 300;

const enum CanvasEmbedMode {
	Canvas,
	Markdown
}

/**
 * Indicate that the element is inside canvas node.
 */
function insideCanvasNode(el: HTMLElement): boolean {
	return el.matches('.canvas-node *');
}

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

	/**
	 * Indicates that the pointer is hovering over the embed.
	 */
	public isPointerOver: boolean;

	private readonly becPlugin: BetterEmbeddedCanvasPlugin;
	private readonly containerEl: HTMLElement;
	/**
	 * Displays file name.
	 */
	private readonly headerEl: HTMLElement;
	private readonly headerInnerEl: HTMLElement;
	private readonly markdownEl: HTMLElement;
	private readonly markdownPreviewEl: HTMLElement;
	private readonly mainControlsEl: HTMLElement;
	private readonly zoomControlsEl: HTMLElement;
	private readonly openCanvasBtnEl: HTMLElement;
	private readonly toggleInteractionBtnEl: HTMLElement;
	private readonly resizeObserver: ResizeObserver;
	/**
	 * Notifies canvas height update.
	 */
	private readonly mutationObserver: MutationObserver;

	private mode: CanvasEmbedMode;
	/**
	 * Controls lifecycle of the markdown-rendered node content.
	 */
	private child?: Component;

	/**
	 * Specific canvas node id that will be rendered. `null` means the whole
	 * canvas is to be rendered instead.
	 */
	private get nodeId(): string | null {
		if (!this.subpath) return null;
		return this.subpath.startsWith('#')
			? this.subpath.slice(1)
			: this.subpath;
	}

	private constructor(becPlugin: BetterEmbeddedCanvasPlugin, ctx: EmbedContext, file: TFile, subpath?: string) {
		super();
		this.app = ctx.app;
		this.plugin = getInternalPlugin(this.app, 'canvas').instance;
		this.becPlugin = becPlugin;
		this.ctx = ctx;
		this.file = file;
		this.subpath = subpath;
		this.isPointerOver = false;
		this.mode = CanvasEmbedMode.Canvas;
		
		this.containerEl = ctx.containerEl;
		this.containerEl.addClass('canvas-embed', 'better-canvas-embed');
		this.containerEl.toggleClass('inline-embed', ctx.showInline ?? false);
		
		this.headerEl = this.containerEl.createDiv('embed-title', el => {
			el.createSpan('file-embed-icon', iconEl => setIcon(iconEl, 'lucide-layout-dashboard'));
			el.setAttr('data-sub-header', '');
			el.addEventListener('click', evt => void this.openOnClick(evt));
			el.toggle(becPlugin.settings.showCanvasName);
		});
		this.headerInnerEl = this.headerEl.createSpan('embed-title-inner');
		this.contentEl = this.containerEl.createDiv('canvas-content');
		this.markdownEl = createDiv('markdown-embed-content');
		this.markdownPreviewEl = this.markdownEl.createDiv('markdown-preview-view markdown-rendered');

		this.canvas = getCanvasRenderer(this);
		this.zoomControlsEl = this.canvas.canvasControlsEl.firstElementChild as HTMLElement;
		this.mainControlsEl = this.canvas.canvasControlsEl.createDiv({
			cls: ['canvas-control-group', 'mod-raised'],
			prepend: true,
		});

		this.resizeObserver = new ResizeObserver(this.canvas.onResize.bind(this.canvas));
		this.mutationObserver = new MutationObserver(this.onAliasChange.bind(this));

		// Button to open canvas fully.
		this.openCanvasBtnEl = this.mainControlsEl.createDiv('canvas-control-item', itemEl => {
			setIcon(itemEl, 'lucide-maximize-2');
			setTooltip(itemEl, t('tooltipOpenCanvas'), { placement: 'left' });
			itemEl.addEventListener('click', evt => void this.openOnClick(evt));
		});

		// Button to toggle interaction.
		this.toggleInteractionBtnEl = this.mainControlsEl.createDiv('canvas-control-item', itemEl => {
			setIcon(itemEl, 'pointer');
			setTooltip(itemEl, t('tooltipDisableInteraction'), { placement: 'left' });
			itemEl.addEventListener('click', this.handleInteractionBtnClick.bind(this));
		});

		// Show header in internal embed only, such as that in the editor.
		if (!this.containerEl.hasClass('internal-embed'))
			this.headerEl.detach();
	}

	public override onload(): void {
		this.canvas.load();
		this.attachDragHandler();
		// Triggered each time a file has been modified.
		this.registerEvent(this.app.vault.on('modify', this.handleModify.bind(this)));
		// Triggered each time settings have been changed.
		this.registerEvent(this.becPlugin.settingManager.on('settings-changed', this.handleSettingsChange.bind(this)));
		// Triggered when the pointer enters the embed.
		this.registerDomEvent(this.canvas.wrapperEl, 'pointerover', this.handlePointerEnter.bind(this));
		// Triggered when the pointer leaves the embed.
		this.registerDomEvent(this.canvas.wrapperEl, 'pointerleave', this.handlePointerLeave.bind(this));
		// Triggered when the pointer leaves the embed.
		this.registerDomEvent(this.contentEl.win, 'keydown', this.handleGlobalKeydown.bind(this));
		// Store this embed.
		store.storeCanvasEmbed(this);

		this.canvas.noInteraction = Boolean(this.app.loadLocalStorage(`${this.becPlugin.manifest.id}:no-interaction`) ?? true);
		this.toggleInteraction(!this.canvas.noInteraction);

		// Set embedded canvas width in exported PDF based on selected page
		// size and margin. Thus, the content inside is aligned properly.
		//
		// That way, as a note is being exported, a new hidden `Window` is
		// created to be used as pre-rendering container. However, the size of the
		// `Window` does not match specified page size.
		if (beingExportedAsPDF(this.containerEl) && !insideCanvasNode(this.containerEl)) {
			// Get last configured settings.
			let exportSettings = this.app.vault.getConfig('pdfExportSettings');
			if (!exportSettings) return;

			let bodyEl = this.containerEl.doc.body,
				markdownEl = bodyEl.find(':scope > .print > .markdown-preview-view');

			let {
				pageSize: pageType,
				margin: marginType,
				landscape
			} = exportSettings;

			let pageWidth = landscape ? PageSizes[pageType].height : PageSizes[pageType].width,
				inlineMargin = marginType == '0' ? DEFAULT_PAGE_MARGIN : 0,
				inlinePadding = parseInt(markdownEl.getCssPropertyValue('padding-inline').replace('px', ''));

			let canvasWidth = pageWidth - inlineMargin * 2 - inlinePadding * 2;
			this.containerEl.setCssStyles({ width: toPx(canvasWidth) });
		}
	}

	public override onunload(): void {
		this.app.workspace.trigger('advanced-canvas:canvas-view-unloaded:before', this);

		this.resizeObserver.disconnect();
		this.mutationObserver.disconnect();
		this.canvas.unload();

		delete this.child;
		store.discardCanvasEmbed(this);
	}

	/**
	 * Toggle user interaction on canvas, e.g. scroll, click, and touch.
	 */
	public toggleInteraction(enable: boolean): void {
		this.canvas.deselectAll();
		this.canvas.noInteraction = !enable;

		// With interaction disabled, swiping over embedded canvas should scroll
		// the embedding note. This class changes the value of the CSS property
		// `touch-action` to `auto`. See styles/main.scss.
		this.canvas.wrapperEl.toggleClass('mod-no-interaction', !enable);

		// Show/hide zoom buttons.
		this.zoomControlsEl.toggle(enable);
		setIcon(this.toggleInteractionBtnEl, enable ? 'pointer' : 'pointer-off');
		setTooltip(this.toggleInteractionBtnEl, t(enable ? 'tooltipDisableInteraction' : 'tooltipEnableInteraction'), { placement: 'left' });
	}

	// Dummy properties. Added to prevent `undefined`-related errors.
	public requestSave(): void {}
	public saveLocalData(): void {}

	public async loadFile(): Promise<void> {
		let data = await this.app.vault.cachedRead(this.file);
		await this.setData(data, true);
	}

	public async reload(): Promise<void> {
		let data = await this.app.vault.cachedRead(this.file);
		await this.setData(data, false);
	}

	/**
	 * Set unserialized JSON data as `CanvasData`.
	 * 
	 * @param data Unserialized (stringified) JSON data.
	 * @param firstLoad Set it to true if this is first data loading.
	 */
	private async setData(data: string, firstLoad: boolean): Promise<void> {
		// Discard previous markdown-rendered node content if any.
		if (this.child) {
			this.removeChild(this.child);
			delete this.child;
		}

		let nodeId = this.nodeId,
			subHeader = '',
			mode = CanvasEmbedMode.Canvas,
			markdown = '';

		// Render single node / group.
		if (nodeId !== null) {
			let cache = this.becPlugin.canvasCache.getCache(this.file, data),
				serialized: CanvasData = { nodes: [], edges: [] };

			if (cache) {
				let target = cache.nodes[nodeId];
				if (target) {
					if (target.type == 'group') {
						let grouped = cache.groups[target.id];
						if (!this.becPlugin.settings.embedGroupContentOnly)
							serialized.nodes.push(target);
						if (grouped) {
							serialized.nodes.push(...Object.values(grouped.nodes));
							serialized.edges = cache.edges.filter(edge => (
								edge.fromNode in grouped.nodes &&
								edge.toNode in grouped.nodes
							));
						}
					}
					
					else {
						if (!this.becPlugin.settings.embedNodeContentOnly) {
							serialized.nodes.push(target);
						} else {
							// Rendered as markdown embed.
							mode = CanvasEmbedMode.Markdown;
							if (target.type == 'text') {
								markdown = target.text;
							} else if (target.type == 'file') {
								// Only display clickable link for file node. User should embed file
								// directly instead of using canvas as a middleman.
								markdown = `[[${target.file}]]`;
							} else {
								markdown = target.url;
							}
						}
					}

					subHeader = target.id;
				}
				Object.assign(serialized, cache.data);
			}

			this.canvas.setData(serialized);
		}

		else try {
			let serialized = JSON.parse(data) as CanvasData;
			this.canvas.setData(serialized);
		} catch (err) {
			console.error(err);
		}

		// Update subtitle based on current subpath.
		if (subHeader != this.headerEl.getAttr('data-sub-header')) {
			this.headerEl.setAttr('data-sub-header', subHeader);
		}
		
		this.setMode(mode);
		this.updateHeader();

		if (this.mode == CanvasEmbedMode.Markdown) {
			this.child = this.addChild(new Component());
			// Reset rendered markdown on child unload.
			this.child.register(() => this.markdownPreviewEl.empty());
			await MarkdownRenderer.render(this.app, markdown, this.markdownPreviewEl, this.ctx.sourcePath ?? '', this.child);
		}

		if (firstLoad) {
			if (beingExportedAsPDF(this.containerEl)) {
				this.initRender();
			} else {
				// Sometimes, `containerEl` is not immediately loaded into the DOM.
				this.containerEl.onNodeInserted(this.initRender.bind(this), true);
			}
		} else {
			this.canvas.requestFrame();
		}

		// Let Advanced Canvas plugin run on top of this embed.
		this.app.workspace.trigger('advanced-canvas:canvas-changed', this.canvas);
	}

	/**
	 * Initialize canvas rendering.
	 */
	private initRender(): void {
		this.updateHeader();
		this.updateHeight();
		this.canvas.zoomToFitQueued = true;
		this.canvas.onResize();

		// Start all observers at first load.
		this.resizeObserver.observe(this.containerEl);
		this.mutationObserver.observe(this.containerEl, {
			attributes: true,
			attributeFilter: ['width', 'alt']
		});
	}

	/**
	 * Open canvas individually at preferred tab.
	 */
	private async openOnClick(evt: PointerEvent): Promise<void> {
		let leaf = this.app.workspace.getLeaf(Keymap.isModEvent(evt));
		await leaf.openFile(this.file);

		// Select the node and zoom canvas to it.
		if (this.nodeId && leaf.view instanceof CanvasView) {
			let canvas = leaf.view.canvas,
				node = canvas.nodes.get(this.nodeId);

			if (node) {
				canvas.selectOnly(node);
				canvas.zoomToSelection();
			}
		}
	}

	/**
	 * Update embed title based on file name and link alias.
	 */
	private updateHeader(): void {
		let alias = this.containerEl.getAttr('alt');
		if (alias) {
			if (this.headerInnerEl.getText() != alias) this.headerInnerEl.setText(alias);
		} else {
			let title = this.file.name,
				subTitle = this.headerEl.getAttr('data-sub-header');

			if (subTitle) title = `${title} > ${subTitle}`;
			if (this.headerInnerEl.getText() != title) this.headerInnerEl.setText(title);
		}
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
			? toPx(height)
			: toPx(MIN_CANVAS_HEIGHT)
		});
	}

	/**
	 * Set current embed mode.
	 */
	private setMode(mode: CanvasEmbedMode): void {
		if (this.mode === mode) return;

		this.mode = mode;

		if (mode === CanvasEmbedMode.Canvas) {
			this.markdownEl.detach();
			this.containerEl.append(this.contentEl);

			this.containerEl.removeClass('markdown-embed');
			this.headerEl.removeClass('markdown-embed-title');
		} else {
			this.contentEl.detach();
			this.containerEl.append(this.markdownEl);

			this.containerEl.addClass('markdown-embed');
			this.headerEl.addClass('markdown-embed-title');
		}
	}

	/**
	 * Attach drag handler to the embed header, making it as draggable
	 * link/file.
	 */
	private attachDragHandler(): void {
		this.app.dragManager.handleDrag(this.headerEl, evt => {
			let linkText = this.ctx.linktext,
				sourcePath = this.ctx.sourcePath ?? '',
				source = this.becPlugin.manifest.id;

			return linkText
				? this.app.dragManager.dragLink(evt, linkText, sourcePath, undefined, source)
				: null;
		});
	}

	private onAliasChange(): void {
		this.updateHeader();
		this.updateHeight();
	}

	private async handleModify(aFile: TAbstractFile): Promise<void> {
		if (aFile != this.file) return;
		// Update the canvas when the file is modified.
		let data = await this.app.vault.cachedRead(this.file);
		await this.setData(data, false);
	}

	private handleInteractionBtnClick(): void {
		let enable = this.canvas.noInteraction ?? false;
		store.iterateCanvasEmbeds(embed => embed.toggleInteraction(enable));
		// Save current configuration to the local storage.
		this.app.saveLocalStorage(`${this.becPlugin.manifest.id}:no-interaction`, !enable);
	}

	private handleSettingsChange(changed: Set<BetterEmbeddedCanvasSettingKey>): void {
		if (changed.has('showCanvasName')) {
			let show = this.becPlugin.settings.showCanvasName;
			this.headerEl.toggle(show);
		}
		if (changed.has('embedGroupContentOnly') || changed.has('embedNodeContentOnly')) {
			void this.reload();
		}
	}

	private handlePointerEnter(): void {
		this.isPointerOver = true;
	}

	private handlePointerLeave(): void {
		this.isPointerOver = false;
	}

	private handleGlobalKeydown(evt: KeyboardEvent): void {
		if (!this.becPlugin.settings.spaceKeyToPan || !this.isPointerOver) return;
		// Prevent scrolling when using space key to pan embedded canvas.
		if (evt.key == ' ' && this.canvas.isHoldingSpace) evt.preventDefault();
	}

	/**
	 * Implementation of `EmbedCreator`.
	 */
	public static create(becPlugin: BetterEmbeddedCanvasPlugin, ctx: EmbedContext, file: TFile, subpath?: string): CanvasEmbedComponent {
		return new CanvasEmbedComponent(becPlugin, ctx, file, subpath);
	}
}