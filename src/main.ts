import {
	type App,
	type EmbedCreator,
	type InternalPlugin,
	type InternalPluginId,
	type PluginManifest,
	Plugin
} from './obsidian';
import { CanvasEmbedComponent } from './embed';
import { CanvasCacheManager } from './cache';
import { getInternalPlugin, replaceEmbedCreator } from './utils';
import { patchCanvasEditor } from './patch';
import { discardAllCanvasEmbeds } from './store';
import { noticeCanvasIsDisabled, noticeReloadAfterDisable, noticeRestartApp } from './notice';
import { hookCanvasEditor } from './hook';
import {
	type BetterEmbeddedCanvasSettings,
	BetterEmbeddedCanvasSettingTab,
	SettingManager
} from './settings';

const ADVANCED_CANVAS_PLUGIN_ID = 'advanced-canvas';

export class BetterEmbeddedCanvasPlugin extends Plugin {
	public override readonly settings: Readonly<BetterEmbeddedCanvasSettings>;
	public readonly settingManager: SettingManager;
	public readonly canvasCache: CanvasCacheManager;

	private readonly settingTab: BetterEmbeddedCanvasSettingTab;

	/**
	 * Stores builtin `EmbedCreator` of embedded canvas.
	 */
	private builtinCanvasEmbedCreator: EmbedCreator | null;
	private isAdvancedCanvasEnabled: boolean;

	public constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);

		this.builtinCanvasEmbedCreator = null;
		this.isAdvancedCanvasEnabled = false;
		this.settingManager = this.addChild(new SettingManager(this));
		this.canvasCache = this.addChild(new CanvasCacheManager(app));
		this.settings = this.settingManager.proxify();
		this.settingTab = new BetterEmbeddedCanvasSettingTab(this);

		// Hook and patch `CanvasEditor` in the beginning of execution order.
		hookCanvasEditor(app);
		patchCanvasEditor(this);
	}

	public override async onload(): Promise<void> {
		await super.onload();

		// Register plugin setting tab.
		this.addSettingTab(this.settingTab);
		// Triggered each time a core plugin is enabled/disabled.
		this.registerEvent(this.app.internalPlugins.on('change', this.handleInternalPluginChange.bind(this)));

		// Replace current creator of embedded canvas at first.
		if (getInternalPlugin(this.app, 'canvas').enabled) {
			// This plugin's embed must override Advanced Canvas' embed, not
			// otherwise.
			if (this.app.plugins.isEnabled(ADVANCED_CANVAS_PLUGIN_ID) || this.app.workspace.layoutReady) {
				this.replaceCanvasEmbedCreator();
			} else {
				// Replacement must be done before any canvas embed can be rendered.
				// Vault loads files after all enabled plugins are loaded.
				let ref = this.app.vault.on('create', () => {
					this.replaceCanvasEmbedCreator();
					this.app.vault.offref(ref);
				});
				this.app.workspace.onLayoutReady(() => {
					if (!this.builtinCanvasEmbedCreator) this.replaceCanvasEmbedCreator();
					this.app.vault.offref(ref);
				});
			}
		}
		
		else {
			// Prompt user to re-enable Canvas plugin and restart the app.
			this.app.workspace.onLayoutReady(noticeCanvasIsDisabled);
		}

		this.app.workspace.onLayoutReady(() => {
			this.isAdvancedCanvasEnabled = this.app.plugins.isEnabled(ADVANCED_CANVAS_PLUGIN_ID);
			this.registerEvent(this.app.plugins.on('changed', this.handleExternalPluginChange.bind(this)));
		});
	}

	public override onunload(): void {
		super.onunload();
		discardAllCanvasEmbeds();

		if (this.builtinCanvasEmbedCreator)
			replaceEmbedCreator(this.app, 'canvas', this.builtinCanvasEmbedCreator);

		noticeReloadAfterDisable(this.app);
	}

	private replaceCanvasEmbedCreator(): void {
		this.builtinCanvasEmbedCreator = replaceEmbedCreator(this.app, 'canvas', (ctx, file, subpath?) => {
			// Avoid deeply, or probably infinite, embedded canvases.
			//
			// KNOWN ISSUE:
			// It only works on canvas embedded within embedded notes. In contrast,
			// it does not work on canvas embedded within embedded canvas as
			// `ctx.depth` remains at 1.
			if (ctx.depth !== undefined && ctx.depth > 2) {
				return this.builtinCanvasEmbedCreator!(ctx, file, subpath);
			} else {
				return CanvasEmbedComponent.create(this, ctx, file, subpath);
			}
		});
	}

	private handleInternalPluginChange<T extends InternalPluginId>(plugin: InternalPlugin<T>): void {
		// Prompt user to re-enable Canvas plugin and restart the app.
		if (plugin.instance.id as string == 'canvas' && !plugin.enabled)
			noticeCanvasIsDisabled();
	}

	private handleExternalPluginChange(): void {
		// Prompt user to restart the app after toggling Advanced Canvas plugin.
		let isAdvancedCanvasEnabled = this.app.plugins.isEnabled(ADVANCED_CANVAS_PLUGIN_ID);
		if (this.isAdvancedCanvasEnabled != isAdvancedCanvasEnabled) {
			this.isAdvancedCanvasEnabled = isAdvancedCanvasEnabled;
			noticeRestartApp();
		}
	}
}

export default BetterEmbeddedCanvasPlugin;