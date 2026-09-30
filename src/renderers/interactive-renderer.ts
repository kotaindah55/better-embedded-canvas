import type { CanvasData } from 'obsidian/canvas';
import {
	type App,
	type CanvasOwner,
	type CanvasPluginInstance,
	type TFile,
	Component,
	Platform,
	setIcon,
	setTooltip
} from '../obsidian';
import type { CanvasEmbed, CanvasEmbedRenderer } from '../embed';
import { Canvas } from '../hook';
import { t } from '../i18n';
import { beingExportedAsPDF, getInternalPlugin, onceElInserted } from '../utils';
import store from '../store';

/**
 * Renderer for `CanvasEmbed` that features interactive canvas. It
 * preserves most of canvas view interface and behaviors, though it is
 * read-only.
 * 
 * While it has outstanding features, it consumes more resource and has
 * a relatively significant impact on performance.
 */
export class CanvasEmbedInteractiveRenderer extends Component implements CanvasEmbedRenderer, CanvasOwner {
	public readonly app: App;
	public readonly owner: CanvasEmbed;
	public readonly canvas: Canvas;
	public readonly plugin: CanvasPluginInstance;

	private readonly resizeObserver: ResizeObserver;
	private readonly mainControlsEl: HTMLElement;
	private readonly zoomControlsEl: HTMLElement;
	private readonly openCanvasBtnEl: HTMLElement;
	private readonly toggleInteractionBtnEl: HTMLElement;

	/**
	 * Indicates whether the canvas has not been loaded before.
	 */
	private firstLoad: boolean;
	/**
	 * Indicates whether a pointer is hovered over the canvas.
	 */
	private isHovered: boolean;

	public constructor(owner: CanvasEmbed) {
		super();

		this.app = owner.app;
		this.owner = owner;
		this.canvas = getCanvas(this);
		this.plugin = getInternalPlugin(this.app, 'canvas').instance;
		this.resizeObserver = new ResizeObserver(this.onResize.bind(this));
		this.firstLoad = true;
		this.isHovered = false;

		this.zoomControlsEl = this.canvas.canvasControlsEl.firstElementChild as HTMLElement;
		this.mainControlsEl = this.canvas.canvasControlsEl.createDiv({
			cls: ['canvas-control-group', 'mod-raised'],
			prepend: true
		});

		// Button to open canvas fully.
		this.openCanvasBtnEl = this.mainControlsEl.createDiv('canvas-control-item', itemEl => {
			setIcon(itemEl, 'lucide-maximize-2');
			setTooltip(itemEl, t('tooltipOpenCanvas'), { placement: 'left' });
			itemEl.addEventListener('click', evt => void this.owner.open(evt));
		});

		// Button to toggle interaction.
		this.toggleInteractionBtnEl = this.mainControlsEl.createDiv('canvas-control-item', itemEl => {
			setIcon(itemEl, 'pointer');
			setTooltip(itemEl, t('tooltipDisableInteraction'), { placement: 'left' });
			itemEl.addEventListener('click', this.onInteractionBtnClick.bind(this));
		});
	}

	public get containerEl(): HTMLElement {
		return this.owner.containerEl;
	}

	public get contentEl(): HTMLElement {
		return this.owner.contentEl;
	}

	public get file(): TFile {
		return this.owner.file;
	}

	public override onload(): void {
		this.contentEl.addClass('canvas-embed-content');

		// Register event handlers.
		this.registerDomEvent(this.canvas.wrapperEl, 'pointerover', this.onPointerEnter.bind(this));
		this.registerDomEvent(this.canvas.wrapperEl, 'pointerleave', this.onPointerLeave.bind(this));
		this.registerDomEvent(this.contentEl.win, 'keydown', this.onGlobalKeydown.bind(this));

		// Load the canvas and local configuration.
		this.canvas.load();
		this.canvas.noInteraction = Boolean(this.app.loadLocalStorage(`${this.owner.plugin.manifest.id}:no-interaction`) ?? true);
		this.toggleInteraction(!this.canvas.noInteraction);
	}

	public override onunload(): void {
		// Let Advanced Canvas plugin to have clean operation.
		this.app.workspace.trigger('advanced-canvas:canvas-view-unloaded:before', this);
		this.resizeObserver.disconnect();

		this.canvas.unload();
		this.canvas.wrapperEl.detach();

		this.contentEl.removeClass('canvas-embed-content');
	}

	public setData(data: CanvasData): void {
		this.canvas.setData(data);

		if (this.firstLoad) {
			if (beingExportedAsPDF(this.containerEl) || this.containerEl.isShown()) {
				this.init();
			} else {
				// Sometimes, `containerEl` is not immediately loaded into the DOM.
				onceElInserted(this.containerEl, this.init.bind(this), this);
			}
		} else {
			// Refresh the canvas.
			this.canvas.requestFrame();
		}

		// Let Advanced Canvas plugin run on top of this embed.
		this.app.workspace.trigger('advanced-canvas:canvas-changed', this.canvas);
	}

	public onResize(): void {
		this.canvas.onResize();
	}

	/**
	 * Toggle user interaction on canvas, e.g. scroll, click, and touch.
	 */
	public toggleInteraction(enable: boolean): void {
		// Reset canvas selection.
		this.canvas.deselectAll();
		this.canvas.noInteraction = !enable;
		this.canvas.wrapperEl.toggleClass('mod-no-interaction', !enable);
		// Show zoom control buttons.
		this.zoomControlsEl.toggle(enable);

		// Change button appearance.
		setIcon(this.toggleInteractionBtnEl, enable ? 'pointer' : 'pointer-off');
		setTooltip(this.toggleInteractionBtnEl, t(`tooltip${enable ? 'Enable' : 'Disable'}Interaction`), { placement: 'left' });
	}

	// Dummy methods. Added to prevent `undefined`-related errors.
	public requestSave(): void {}
	public saveLocalData(): void {}

	/**
	 * Run on initial rendering.
	 */
	private init(): void {
		this.resizeObserver.observe(this.containerEl);
		// Fit all canvas nodes to the current canvas viewport.
		this.canvas.zoomToFitQueued = true;
		this.firstLoad = false;
		this.onResize();
	}

	private onInteractionBtnClick(): void {
		const enable = this.canvas.noInteraction ?? false;
		// Toggle interaction on all embedded interactive canvases simultanously.
		store.iterateCanvasEmbeds(embed => embed.toggleInteraction(enable));
		// Save current configuration to the local storage.
		this.app.saveLocalStorage(`${this.owner.plugin.manifest.id}:no-interaction`, !enable);
	}

	private onPointerEnter(): void {
		this.isHovered = true;
	}

	private onPointerLeave(): void {
		this.isHovered = false;
	}

	private onGlobalKeydown(evt: KeyboardEvent): void {
		if (!this.owner.settings.spaceKeyToPan || !this.isHovered) return;
		// Prevent scrolling when using space key to pan embedded canvas.
		if (evt.key == ' ' && this.canvas.isHoldingSpace && !this.canvas.noInteraction)
			evt.preventDefault();
	}
}

/**
 * Get read-only `Canvas`, preconfigured for embed.
 * 
 * @param owner Object that implements `CanvasOwner`.
 */
function getCanvas(owner: CanvasOwner): Canvas {
	const canvas = new Canvas(owner);

	// Hide quick settings button to prevent user from reverting read-only
	// state.
	canvas.quickSettingsButton.parentElement?.detach();
	// Hide history (undo/redo) buttons.
	canvas.undoBtnEl.parentElement?.detach();

	// Canvas help button does not exist on mobile.
	if (!Platform.isMobile) {
		// Hide canvas help button.
		canvas.canvasControlsEl.lastElementChild?.detach();
	}

	// Hide card menu buttons to prevent user from adding canvas node.
	canvas.cardMenuEl.detach();
	// Make it read-only.
	canvas.setReadonly(true);
	// Prevent canvas from being drop destination.
	canvas.wrapperEl.addEventListener('drop', evt => evt.preventDefault(), true);

	// Force canvas direction to ltr, due to quirk behavior: nodes shift
	// slightly to the right inaccurately in rtl direction (bug?).
	canvas.canvasEl.dir = 'ltr';

	return canvas;
}
