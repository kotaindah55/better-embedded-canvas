import type { CanvasData } from 'obsidian/canvas';
import {
	type App,
	type CanvasOwner,
	type CanvasPluginInstance,
	type CMEditor,
	type EmbedWidget,
	type Point,
	type TFile,
	Component,
	Menu,
	Platform,
	setIcon,
	setTooltip
} from '../obsidian';
import type { CanvasEmbed, CanvasEmbedRenderer } from '../embed';
import { Canvas } from '../hook';
import { t } from '../i18n';
import {
	beingExportedAsPDF,
	fallbackScroll,
	getInternalPlugin,
	getLinkDisplayText,
	lockEvent,
	onceElInserted,
	parseLinkDisplayText,
	toPx,
	trackPointer
} from '../utils';
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
	private readonly controlMenuBtnEl: HTMLElement;
	private readonly resizerEl: HTMLElement;

	/**
	 * Indicates whether the canvas has not been loaded before.
	 */
	private firstLoad: boolean;
	/**
	 * Indicates whether a pointer is hovered over the canvas.
	 */
	private isHovered: boolean;
	/**
	 * Indicates whether using popout menu for controls.
	 */
	private compactControls: boolean;
	private openControlMenu: Menu | null;

	private editor: CMEditor | null;
	private widget: EmbedWidget | null;

	public constructor(owner: CanvasEmbed) {
		super();

		this.app = owner.app;
		this.owner = owner;
		this.canvas = getCanvas(this);
		this.plugin = getInternalPlugin(this.app, 'canvas').instance;
		this.resizeObserver = new ResizeObserver(this.onResize.bind(this));
		this.firstLoad = true;
		this.isHovered = false;
		this.compactControls = false;
		this.openControlMenu = null;

		this.editor = null;
		this.widget = null;

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
			setIcon(itemEl, 'lucide-pointer');
			setTooltip(itemEl, t('tooltipDisableInteraction'), { placement: 'left' });
			itemEl.addEventListener('click', this.onInteractionBtnClick.bind(this));
		});

		// Button to open control menu.
		this.controlMenuBtnEl = this.mainControlsEl.createDiv('canvas-control-item', itemEl => {
			setIcon(itemEl, 'lucide-more-vertical');
			setTooltip(itemEl, t('buttonMoreOptions'));
			itemEl.addEventListener('click', this.onOpenControlMenuBtnClick.bind(this));
		});

		this.resizerEl = createDiv('canvas-embed-resizer');
		this.resizerEl.createDiv('canvas-embed-resizer-handle');
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
		if (!this.canvas.wrapperEl.isShown()) {
			this.contentEl.append(this.canvas.wrapperEl);
		}

		// Store attached editor and corresponding widget.
		this.widget = this.owner.getEditorWidget();
		this.editor = this.widget?.editor.editor ?? null;

		if (this.widget && this.editor) {
			this.containerEl.append(this.resizerEl);
		}

		this.contentEl.addClass('canvas-embed-content');

		// Load the canvas and local configuration.
		this.canvas.load();
		this.canvas.noInteraction = Boolean(this.app.loadLocalStorage(`${this.owner.plugin.manifest.id}:no-interaction`));
		this.toggleInteraction(!this.canvas.noInteraction);

		// Register event handlers.
		this.registerDomEvent(this.canvas.wrapperEl, 'pointerover', this.onPointerOver.bind(this));
		this.registerDomEvent(this.canvas.wrapperEl, 'pointerleave', this.onPointerLeave.bind(this));
		this.registerDomEvent(this.contentEl.win, 'keydown', this.onGlobalKeydown.bind(this)); // Must be registered after performing canvas.load().
		this.registerDomEvent(this.resizerEl, 'pointerdown', this.onResizerPointerDown.bind(this));
		this.registerDomEvent(this.resizerEl, 'contextmenu', lockEvent);
	}

	public override onunload(): void {
		// Let Advanced Canvas plugin to have clean operation.
		this.app.workspace.trigger('advanced-canvas:canvas-view-unloaded:before', this);
		this.resizeObserver.disconnect();

		this.canvas.unload();
		this.canvas.wrapperEl.detach();

		this.contentEl.removeClass('canvas-embed-content');
		this.resizerEl.detach();
		this.editor = null;
		this.widget = null;
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

	public isInteractionEnabled(): boolean {
		return !this.canvas.noInteraction;
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
		if (!this.compactControls) this.zoomControlsEl.toggle(enable);

		// Change button appearance.
		setIcon(this.toggleInteractionBtnEl, `lucide-pointer${enable ? '' : '-off'}`);
		setTooltip(this.toggleInteractionBtnEl, t(`toggleInteraction`), { placement: 'left' });
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

	/**
	 * Enable drag-to-resize on specific pointer event by tracking pointer
	 * movement, than resizing the canvas based on the pointer location. It
	 * should only be performed on editor-widget-based embed.
	 */
	private dragToResize(evt: PointerEvent): void {
		if (!this.widget || !this.editor) return;

		const threshold = evt.pointerType === 'touch' ? 0 : 5;
		let newHeight: number | null = null;
		evt.preventDefault();

		trackPointer(evt, {
			start: () => {
				// Keep the handler visible in touchscreen devices.
				this.resizerEl.addClass('mod-resizing');
				// Display consistently resize-icon on the cursor.
				this.resizerEl.doc.body.addClass('is-resizing-canvas-embed');
			},

			move: evt => {
				// Calculate changed canvas height.
				const contentRect = this.contentEl.getBoundingClientRect();
				const distance = evt.y - contentRect.bottom;
				newHeight = Math.round(contentRect.height + distance);
				// Temporarily set the height of the canvas.
				this.contentEl.setCssStyles({ height: toPx(newHeight) });

				// Prevent text cursor jump unexpectedly during resizing.
				evt.preventDefault();
			},

			end: evt => {
				const contentRect = this.contentEl.getBoundingClientRect();
				const distance = evt.y - contentRect.bottom;
				newHeight = Math.round(contentRect.height + distance);

				if (this.widget && this.editor) {
					const from = this.editor.offsetToPos(this.widget.start);
					const to = this.editor.offsetToPos(this.widget.end);
					const wikilink = this.editor.getRange(from, to);
					const displayData = parseLinkDisplayText(getLinkDisplayText(wikilink));

					let linktext = this.owner.linktext;
					if (displayData.title) linktext += `|${displayData.title}`;

					// Set the height data to the link, and so to the canvas.
					//
					// We do not use Editor.replaceRange() because it will scroll into the
					// selection unwillingly.
					this.editor.cm.dispatch({
						changes: {
							from: this.widget.start,
							to: this.widget.end,
							insert: `![[${linktext}|${newHeight}]]`
						}
					});
					this.canvas.zoomToFit();
				}
			},

			cleanup: () => {
				this.contentEl.setCssStyles({ height: '' });
				this.resizerEl.removeClass('mod-resizing');
				this.resizerEl.doc.body.removeClass('is-resizing-canvas-embed');
			}
		}, threshold);
	}

	/**
	 * Handle size change notified by resize observer.
	 */
	private onResize(): void {
		// Use popover menu for controls in short embed.
		this.compactControls = this.contentEl.clientHeight < 250;

		this.controlMenuBtnEl.toggle(this.compactControls);
		this.openCanvasBtnEl.toggle(!this.compactControls);
		this.toggleInteractionBtnEl.toggle(!this.compactControls);
		this.zoomControlsEl.toggle(!this.compactControls && this.isInteractionEnabled());

		this.canvas.onResize();
	}

	private onResizerPointerDown(evt: PointerEvent): void {
		if (evt.pointerType === 'touch') {
			const startEvt = evt;
			const win = startEvt.win;

			// User needs to hold the touch for a certain duration.
			const timer = win.setTimeout(() => {
				abortTracker();
				// Notice that user is able to do drag-to-resize.
				ripple(win, evt);
				win.navigator.vibrate(100);
				this.dragToResize(startEvt);
			}, 800);

			const abortTracker = trackPointer(evt, {
				cleanup: () => win.clearTimeout(timer),
				// If user moves the touch before specified duration, drag-to-resize
				// will be dismissed.
				move: moveEvt => {
					abortTracker();
					// Because touch-action is set to none, user with touchscreen device
					// cannot perform swipe-to-scroll from the resizer. It could restrain
					// user interaction with the note unintuitively and create frustating
					// annoyances.
					//
					// Therefore, we should implement a scroll fallback as replacement.
					fallbackScroll(moveEvt);
				}
			});
		}

		else if (evt.pointerType === 'mouse')
			this.dragToResize(evt);
	}

	private onOpenControlMenuBtnClick(): void {
		// Hide the menu if open.
		if (this.openControlMenu) this.openControlMenu.hide();
		else this.openMenu();
	}

	private onInteractionBtnClick(): void {
		const enable = !!this.canvas.noInteraction;
		// Toggle interaction on all embedded interactive canvases simultanously.
		store.iterateCanvasEmbeds(embed => embed.toggleInteraction(enable));
		// Save current configuration to the local storage.
		this.app.saveLocalStorage(`${this.owner.plugin.manifest.id}:no-interaction`, !enable);
	}

	private onPointerOver(): void {
		this.isHovered = true;
	}

	private onPointerLeave(): void {
		this.isHovered = false;
	}

	private onGlobalKeydown(evt: KeyboardEvent): void {
		if (!this.owner.settings.spaceKeyToPan || !this.isHovered) return;
		// Prevent scrolling when using space key to pan embedded canvas.
		// 
		// This handler should be registered after the canvas is loaded.
		// Otherwise, Canvas.isHoldingSpace has not been assigned to true yet.
		if (evt.key === ' ' && this.canvas.isHoldingSpace && !this.canvas.noInteraction)
			evt.preventDefault();
	}

	/**
	 * Open popover menu providing canvas interaction controls, mostly those
	 * that appear in upper-right corner of the canvas.
	 */
	private openMenu(): void {
		const menu = new Menu();
		this.openControlMenu = menu;

		menu.addItem(item => item
			.setTitle(t('tooltipOpenCanvas'))
			.setIcon('lucide-maximize-2')
			.setSection('open')
			.onClick(() => this.owner.open())
		);

		menu.addItem(item => item
			.setTitle(i18next.t('interface.menu.open-in-new-tab'))
			.setIcon('lucide-file-plus')
			.setSection('open')
			.onClick(() => this.owner.open('tab'))
		);

		menu.addItem(item => item
			.setTitle(i18next.t('interface.menu.open-to-the-right'))
			.setIcon('lucide-separator-vertical')
			.setSection('open')
			.onClick(() => this.owner.open('split'))
		);

		menu.addItem(item => item
			.setTitle(t('toggleInteraction'))
			.setIcon('lucide-pointer')
			.setSection('interaction')
			.setChecked(this.isInteractionEnabled())
			.onClick(this.onInteractionBtnClick.bind(this))
		);

		menu.addItem(item => item
			.setTitle(i18next.t('commands.zoom-in'))
			.setIcon('lucide-zoom-in')
			.setSection('interaction')
			.onClick(() => this.canvas.zoomBy(this.canvas.config.zoomMultiplier))
		);

		menu.addItem(item => item
			.setTitle(i18next.t('commands.zoom-out'))
			.setIcon('lucide-zoom-out')
			.setSection('interaction')
			.onClick(() => this.canvas.zoomBy(-this.canvas.config.zoomMultiplier))
		);

		menu.addItem(item => item
			.setTitle(i18next.t('plugins.canvas.action-zoom-to-fit'))
			.setIcon('lucide-maximize')
			.setSection('interaction')
			.onClick(() => this.canvas.zoomToFit())
		);

		menu.addItem(item => item
			.setTitle(i18next.t('commands.reset-zoom'))
			.setIcon('lucide-rotate-cw')
			.setSection('interaction')
			.onClick(() => this.canvas.zoomBy(-this.canvas.zoom))
		);

		// Use button position instead of pointer location.
		const btnRect = this.controlMenuBtnEl.getBoundingClientRect();

		// Unref the menu upon hide.
		menu.register(() => this.openControlMenu = null);
		menu.setParentElement(this.controlMenuBtnEl);
		menu.showAtPosition({ x: btnRect.left, y: btnRect.bottom });
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

/**
 * Create ripple effect on desired location.
 */
function ripple(win: Window, pos: Point): void {
	const rippleEl = win.document.body.createDiv();
	const duration = 200;
	const timer = win.setTimeout(() => cleanup(), duration + 50);

	const cleanup = (): void => {
		win.clearTimeout(timer);
		rippleEl.detach();
	};

	rippleEl.setCssStyles({
		position: 'absolute',
		transform: 'translate(-50%,-50%)',
		left: toPx(pos.x),
		top: toPx(pos.y),
		boxShadow: '0 0 6px 20px var(--color-accent)',
		borderRadius: '200px',
		zIndex: '999'
	});

	const anim = rippleEl.animate({
		width: ['0px', '200px'],
		height: ['0px', '200px'],
		opacity: ['1', '0'],
		easing: ['ease-out']
	}, { duration });

	anim.addEventListener('finish', cleanup);
	anim.addEventListener('cancel', cleanup);
}
