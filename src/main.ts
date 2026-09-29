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
import { getInternalPlugin, isPluginEnabled, replaceEmbedCreator } from './utils';
import { patchCanvasEditor, patchInternalLinkEditorSuggest, patchMarkdownEmdedCreator } from './patch';
import { noticeCanvasIsDisabled, noticeReloadAfterDisable, noticeRestartApp } from './notice';
import { CanvasChooserModal } from './chooser-modal';
import { hookCanvasEditor } from './hook';
import { registerCommands } from './commands';
import {
	type BetterEmbeddedCanvasSettings,
	BetterEmbeddedCanvasSettingTab,
	SettingManager
} from './settings';
import * as store from './store';

const ADVANCED_CANVAS_PLUGIN_ID = 'advanced-canvas';

export class BetterEmbeddedCanvasPlugin extends Plugin {
	public override readonly settings: Readonly<BetterEmbeddedCanvasSettings>;
	public readonly settingManager: SettingManager;
	public readonly canvasCache: CanvasCacheManager;
	public readonly canvasChooser: CanvasChooserModal;

	private readonly settingTab: BetterEmbeddedCanvasSettingTab;

	/**
	 * Stores builtin `EmbedCreator` of embedded canvas.
	 */
	private builtinCanvasEmbedCreator: EmbedCreator | null;
	private isAdvancedCanvasEnabled: boolean;

	public constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);

		this.settingManager = this.addChild(new SettingManager(this));
		this.canvasCache = this.addChild(new CanvasCacheManager(app));
		this.canvasChooser = new CanvasChooserModal(this);
		this.settings = this.settingManager.proxify();
		this.settingTab = new BetterEmbeddedCanvasSettingTab(this);

		this.builtinCanvasEmbedCreator = null;
		this.isAdvancedCanvasEnabled = false;
		patchMarkdownEmdedCreator(this);
	}

	public override async onload(): Promise<void> {
		await super.onload();

		// Register plugin setting tab.
		this.addSettingTab(this.settingTab);
		// Triggered each time a core plugin is enabled/disabled.
		this.registerEvent(this.app.internalPlugins.on('change', this.handleInternalPluginChange.bind(this)));
		// Register plugin's commands.
		registerCommands(this);

		// Replace current creator of embedded canvas at first.
		if (getInternalPlugin(this.app, 'canvas').enabled) {
			// This plugin's embed must override Advanced Canvas' embed, not
			// otherwise.
			if (isPluginEnabled(this.app, ADVANCED_CANVAS_PLUGIN_ID) || this.app.workspace.layoutReady) {
				this.patchCanvas();
				this.replaceCanvasEmbedCreator();
			} else {
				let patched = false;
				let doPatch = () => {
					if (patched) return;
					patched = true;
					this.patchCanvas();
					this.replaceCanvasEmbedCreator();
					this.app.vault.offref(ref);
				}

				// Replacement must be done before any canvas embed can be rendered.
				// Vault loads files after all enabled plugins are loaded.
				let ref = this.app.vault.on('create', doPatch);
				this.app.workspace.onLayoutReady(doPatch);
			}
		}
		
		else {
			// Prompt user to re-enable Canvas plugin and restart the app.
			this.app.workspace.onLayoutReady(noticeCanvasIsDisabled);
		}

		this.app.workspace.onLayoutReady(() => {
			this.isAdvancedCanvasEnabled = isPluginEnabled(this.app, ADVANCED_CANVAS_PLUGIN_ID);
			this.registerEvent(this.app.plugins.on('changed', this.handleExternalPluginChange.bind(this)));
			// Ensure that this patch overrides Advanced Canvas' patch.
			patchInternalLinkEditorSuggest(this);
		});
	}

	public override onunload(): void {
		super.onunload();
		store.discardAllCanvasEmbeds();

		if (this.builtinCanvasEmbedCreator)
			replaceEmbedCreator(this.app, 'canvas', this.builtinCanvasEmbedCreator);

		noticeReloadAfterDisable(this.app);
	}

	/**
	 * Hook and patch `CanvasView` and `Canvas`.
	 */
	private patchCanvas(): void {
		hookCanvasEditor(this.app);
		patchCanvasEditor(this);
	}

	private replaceCanvasEmbedCreator(): void {
		this.builtinCanvasEmbedCreator = replaceEmbedCreator(this.app, 'canvas', CanvasEmbedComponent.create.bind(null, this));
	}

	private handleInternalPluginChange<T extends InternalPluginId>(plugin: InternalPlugin<T>): void {
		// Prompt user to re-enable Canvas plugin and restart the app.
		if (plugin.instance.id as string == 'canvas' && !plugin.enabled)
			noticeCanvasIsDisabled();
	}

	private handleExternalPluginChange(): void {
		// Prompt user to restart the app after toggling Advanced Canvas plugin.
		let isAdvancedCanvasEnabled = isPluginEnabled(this.app, ADVANCED_CANVAS_PLUGIN_ID);
		if (this.isAdvancedCanvasEnabled != isAdvancedCanvasEnabled) {
			this.isAdvancedCanvasEnabled = isAdvancedCanvasEnabled;
			noticeRestartApp();
		}
	}
}

export default BetterEmbeddedCanvasPlugin;