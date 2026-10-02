import type { CanvasData } from 'obsidian/canvas';
import {
	type App,
	type EmbedComponent,
	type EmbedContext,
	type PaneType,
	type TAbstractFile,
	type TFile,
	Component,
	Keymap,
	setIcon
} from './obsidian';
import type { BetterEmbeddedCanvasPlugin } from './main';
import { beingExportedAsPDF, insideCanvasNode, onceElInserted, toPx } from './utils';
import type { BetterEmbeddedCanvasSettingKey, BetterEmbeddedCanvasSettings } from './settings';
import { DEFAULT_PAGE_MARGIN, PageSize } from './page-sizes';
import { CanvasView } from './hook';
import { CanvasEmbedInteractiveRenderer } from './renderers/interactive-renderer';
import { CanvasEmbedStaticRenderer } from './renderers/static-renderer';
import { CanvasEmbedMarkdownRenderer } from './renderers/markdown-renderer';
import store from './store';

const enum CanvasEmbedMode {
	Interactive = 'interactive',
	Static = 'static',
	Markdown = 'markdown'
}

/**
 * Wrapper that manages the lifecycle of embedded canvas.
 */
export class CanvasEmbed extends Component implements EmbedComponent {
	public readonly app: App;
	public readonly plugin: BetterEmbeddedCanvasPlugin;
	public readonly containerEl: HTMLElement;
	public readonly contentEl: HTMLElement;
	public readonly headerEl: HTMLElement;
	public readonly file: TFile;
	public readonly subpath?: string | undefined;

	private readonly ctx: EmbedContext;
	private readonly headerInnerEl: HTMLElement;
	/**
	 * Notifies canvas height and alias update.
	 */
	private readonly mutationObserver: MutationObserver;

	private mode: CanvasEmbedMode | null;
	private renderer: CanvasEmbedRenderer | null;

	public get depth(): number {
		return this.ctx.depth;
	}

	public set depth(n: number) {
		this.ctx.depth = n;
	}

	private constructor(plugin: BetterEmbeddedCanvasPlugin, ctx: EmbedContext, file: TFile, subpath?: string) {
		super();

		this.app = plugin.app;
		this.plugin = plugin;
		this.ctx = ctx;
		this.file = file;
		this.subpath = subpath;
		this.mutationObserver = new MutationObserver(this.onAliasChange.bind(this));

		this.mode = null;
		this.renderer = null;

		this.containerEl = ctx.containerEl;
		this.containerEl.addClass('canvas-embed', 'better-canvas-embed');
		this.containerEl.toggleClass('inline-embed', ctx.showInline ?? false);
		this.headerEl = createDiv('embed-title', el => {
			el.createSpan('file-embed-icon', iconEl => setIcon(iconEl, 'lucide-layout-dashboard'));
			el.setAttr('data-sub-header', '');
			el.addEventListener('click', evt => void this.open(evt));
			el.toggle(this.settings.showCanvasName);
		});
		this.headerInnerEl = this.headerEl.createSpan('embed-title-inner');
		this.contentEl = this.containerEl.createDiv('embed-content');

		if (this.isInternalEmbed()) this.containerEl.prepend(this.headerEl);
	}

	/**
	 * Id that belongs to specific canvas node that will be rendered. `null`
	 * means the whole canvas is to be rendered instead.
	 */
	private get nodeId(): string | null {
		if (!this.subpath) return null;
		return this.subpath.startsWith('#')
			? this.subpath.slice(1)
			: this.subpath;
	}

	public get settings(): BetterEmbeddedCanvasSettings {
		return this.plugin.settings;
	}

	public override onload(): void {
		this.app.vault.on('modify', this.onModify.bind(this));
		this.plugin.settingManager.on('settings-changed', this.onSettingsChange.bind(this));
		this.attachDragHandler();

		this.mutationObserver.observe(this.containerEl, {
			attributes: true,
			attributeFilter: ['width', 'alt']
		});

		store.storeCanvasEmbed(this);

		if (beingExportedAsPDF(this.containerEl) && !insideCanvasNode(this.containerEl)) {
			this.relayoutForPdf();
		}
	}

	public override onunload(): void {
		this.mutationObserver.disconnect();
		store.discardCanvasEmbed(this);
	}

	public async loadFile(): Promise<void> {
		const rawData = await this.app.vault.cachedRead(this.file);

		if (this.containerEl.isShown()) {
			this.ensureDepth();
			await this.parse(rawData);
		} else onceElInserted(this.containerEl, () => {
			this.ensureDepth();
			void this.parse(rawData);
		}, this);
	}

	/**
	 * Forcibly rerender the embed.
	 * 
	 * @param raw Replaces canvas raw data.
	 */
	public async reload(raw?: string): Promise<void> {
		const rawData = raw ?? await this.app.vault.cachedRead(this.file);
		await this.parse(rawData);
	}

	/**
	 * Open canvas file on a tab.
	 * 
	 * @param evt Mouse event or pane type. If given mouse event, the event
	 * will be translated into pane type.
	 */
	public async open(evtOrPane?: MouseEvent | PaneType | boolean): Promise<void> {
		const paneType = typeof evtOrPane === 'object'
			? Keymap.isModEvent(evtOrPane)
			: evtOrPane;

		const leaf = this.app.workspace.getLeaf(paneType);
		await leaf.openFile(this.file);

		// Select the node and zoom canvas to it.
		if (this.nodeId && leaf.view instanceof CanvasView) {
			const canvas = leaf.view.canvas;
			const node = canvas.nodes.get(this.nodeId);

			if (node) {
				canvas.selectOnly(node);
				canvas.zoomToSelection();
			}
		}
	}

	public toggleInteraction(enable: boolean): void {
		if (this.renderer instanceof CanvasEmbedInteractiveRenderer) {
			this.renderer.toggleInteraction(enable);
		}
	}

	/**
	 * Parse canvas raw data and render the embed from it.
	 */
	private async parse(raw: string): Promise<void> {
		const nodeId = this.nodeId;
		const serialized: CanvasData = { nodes: [], edges: [] };

		let subHeader = '';
		let mode = this.shouldBeStatic()
			? CanvasEmbedMode.Static
			: CanvasEmbedMode.Interactive;

		// Render single node / group.
		if (nodeId !== null) {
			const cache = this.plugin.canvasCache.getCache(this.file, raw);
			if (cache) {
				const target = cache.nodes[nodeId];
				Object.assign(serialized, cache.data);

				if (target) {
					subHeader = target.id;

					if (target.type == 'group') {
						const grouped = cache.groups[target.id];
						if (!this.settings.embedGroupContentOnly)
							serialized.nodes.push(target);
						if (grouped) {
							serialized.nodes.push(...Object.values(grouped.nodes));
							serialized.edges = cache.edges.filter(edge => (
								edge.fromNode in grouped.nodes &&
								edge.toNode in grouped.nodes
							));
						}
					} else {
						serialized.nodes.push(target);
						if (this.settings.embedNodeContentOnly) {
							// Rendered as markdown embed.
							mode = CanvasEmbedMode.Markdown;
						}
					}
				}
			}
		} else try {
			Object.assign(serialized, JSON.parse(raw));
		} catch (err) {
			console.error(err);
		}

		// Update subtitle based on current subpath.
		if (subHeader != this.headerEl.getAttr('data-sub-header')) {
			this.headerEl.setAttr('data-sub-header', subHeader);
		}

		// Render the canvas.
		this.setMode(mode);
		this.updateHeader();
		await this.renderer?.setData(serialized);
	}

	/**
	 * Set current embed mode.
	 */
	private setMode(mode: CanvasEmbedMode): void {
		if (this.mode === mode) return;

		if (this.renderer) {
			this.removeChild(this.renderer);
			this.renderer = null;
		}

		this.mode = mode;

		switch (this.mode) {
			case CanvasEmbedMode.Interactive: {
				this.renderer = this.addChild(new CanvasEmbedInteractiveRenderer(this));
				break;
			}
			case CanvasEmbedMode.Static: {
				this.renderer = this.addChild(new CanvasEmbedStaticRenderer(this));
				break;
			}
			case CanvasEmbedMode.Markdown: {
				this.renderer = this.addChild(new CanvasEmbedMarkdownRenderer(this));
				break;
			}
		}
	}

	/**
	 * Set embedded canvas width in exported PDF based on selected page
	 * size and margin. Thus, the content inside is aligned properly.
	 *
	 * That way, as a note is being exported, a new hidden `Window` is
	 * created to be used as pre-rendering container. However, the size of the
	 * `Window` does not match specified page size.
	*/
	private relayoutForPdf(): void {
		// Get last configured settings.
		const exportSettings = this.app.vault.getConfig('pdfExportSettings');
		if (!exportSettings) return;

		const bodyEl = this.containerEl.doc.body;
		const markdownEl = bodyEl.find(':scope > .print > .markdown-preview-view');
		const {
			pageSize: pageType,
			margin: marginType,
			landscape
		} = exportSettings;

		const pageWidth = landscape ? PageSize[pageType].height : PageSize[pageType].width;
		const inlineMargin = marginType == '0' ? DEFAULT_PAGE_MARGIN : 0;
		const inlinePadding = parseInt(markdownEl.getCssPropertyValue('padding-inline').replace('px', ''));
		const canvasWidth = pageWidth - inlineMargin * 2 - inlinePadding * 2;

		this.containerEl.setCssStyles({ width: toPx(canvasWidth) });
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
		const height = Number(this.containerEl.getAttr('width'));
		const heightInPx = height ? toPx(height) : '';
		// Only hardcode variables.
		this.containerEl.setCssProps({
			'--canvas-embed-height': heightInPx,
			'--canvas-embed-minimap-height': heightInPx
		});
	}

	/**
	 * Update embed title based on file name and link alias.
	 */
	private updateHeader(): void {
		const alias = this.containerEl.getAttr('alt');
		if (alias) {
			if (this.headerInnerEl.getText() != alias) this.headerInnerEl.setText(alias);
		} else {
			const subTitle = this.headerEl.getAttr('data-sub-header');
			let title = this.file.name;

			if (subTitle) title = `${title} > ${subTitle}`;
			if (this.headerInnerEl.getText() != title) this.headerInnerEl.setText(title);
		}
	}

	/**
	 * Ensure correct embedding depth of this embed.
	 */
	private ensureDepth(): void {
		const depth = store.getEmbedDepth(this.containerEl);
		if (depth !== null && depth >= this.depth) this.depth = depth + 1;
		store.cacheEmbedDepth(this.containerEl, this.depth);
	}

	/**
	 * Whether the embed should render static canvas depending on user
	 * settings.
	 */
	private shouldBeStatic(): boolean {
		return (
			this.depth > this.settings.maxEmbedDepth ||
			insideCanvasNode(this.containerEl) && !this.settings.nestedCanvas
		);
	}

	private isInternalEmbed(): boolean {
		return this.containerEl.hasClass('internal-embed');
	}

	/**
	 * Attach drag handler to the embed header, making it as draggable
	 * link/file.
	 */
	private attachDragHandler(): void {
		this.app.dragManager.handleDrag(this.headerEl, evt => {
			const linkText = this.ctx.linktext;
			const sourcePath = this.ctx.sourcePath ?? '';
			const source = this.plugin.manifest.id;

			return linkText
				? this.app.dragManager.dragLink(evt, linkText, sourcePath, undefined, source)
				: null;
		});
	}

	/**
	 * Handle alias change.
	 */
	private onAliasChange(): void {
		this.updateHeader();
		this.updateHeight();
	}

	/**
	 * Handle file modify event. Will reload the embed if the file of this
	 * embed is that being modified.
	 */
	private onModify(aFile: TAbstractFile): void {
		if (aFile === this.file) void this.reload();
	}

	private onSettingsChange(changed: Set<BetterEmbeddedCanvasSettingKey>): void {
		// Only internal embed that should have title.
		if (changed.has('showCanvasName') && this.isInternalEmbed()) {
			const show = this.settings.showCanvasName;
			this.headerEl.toggle(show);
		}

		if (
			changed.has('embedGroupContentOnly') || changed.has('embedNodeContentOnly') ||
			changed.has('nestedCanvas') && insideCanvasNode(this.containerEl) ||
			changed.has('maxEmbedDepth') && (this.mode === CanvasEmbedMode.Static) !== this.shouldBeStatic()
		) {
			void this.reload();
		}
	}

	public static create(plugin: BetterEmbeddedCanvasPlugin, ctx: EmbedContext, file: TFile, subpath?: string): CanvasEmbed {
		return new CanvasEmbed(plugin, ctx, file, subpath);
	}
}

/**
 * `CanvasEmbed` delegates its rendering task to `CanvasEmbedRenderer`.
 */
export interface CanvasEmbedRenderer extends Component {
	owner: CanvasEmbed;
	/**
	 * Set serialized `CanvasData` and render it.
	 */
	setData(data: CanvasData): Promise<void> | void;
}
