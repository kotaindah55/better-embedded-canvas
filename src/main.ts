import {
	type App,
	type EmbedCreator,
	type InternalPlugin,
	type InternalPluginIDs,
	type PluginManifest,
	Plugin
} from './obsidian';
import { CanvasEmbedComponent } from './embed';
import { getInternalPlugin, replaceEmbedCreator } from './utils';
import { patchCanvasEditor } from './patch';
import { discardAllCanvasEmbeds } from './store';
import { ReloadNotesPrompt } from './modal';
import { hookCanvasEditor } from './hook';

export const PLUGIN_ID = 'better-embedded-canvas';

export class BetterEmbeddedCanvasPlugin extends Plugin {
	/**
	 * Stores builtin `EmbedCreator` of embedded canvas.
	 */
	private builtinCanvasEmbedCreator: EmbedCreator | null;

	public constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		this.builtinCanvasEmbedCreator = null;
		// Hook and patch `CanvasEditor` in the beginning of execution order.
		hookCanvasEditor(app);
		patchCanvasEditor(this);
	}

	public override async onload(): Promise<void> {
		await super.onload();

		// Triggered each time a core plugin is enabled/disabled.
		this.registerEvent(this.app.internalPlugins.on('change', this.handleInternalPluginChange, this));
		// Replace current creator of embedded canvas at first.
		this.handleInternalPluginChange(getInternalPlugin(this.app, 'canvas'));
	}

	public override onunload(): void {
		super.onunload();
		discardAllCanvasEmbeds();

		if (this.builtinCanvasEmbedCreator)
			replaceEmbedCreator(this.app, 'canvas', this.builtinCanvasEmbedCreator);

		ReloadNotesPrompt.open(this.app);
	}

	private handleInternalPluginChange<T extends InternalPluginIDs>(plugin: InternalPlugin<T>): void {
		if (plugin.instance.id != 'canvas') return;

		// `CanvasEmbedComponent` can only be displayed if Canvas plugin is
		// enabled.
		if (plugin.enabled) {
			this.builtinCanvasEmbedCreator = replaceEmbedCreator(this.app, 'canvas', (ctx, file, subpath?) => {
				// Use Advanced Canvas' custom embed.
				if (this.app.plugins.isEnabled('advanced-canvas') && subpath)
					return this.builtinCanvasEmbedCreator!(ctx, file, subpath);

				// Avoid deeply, or probably infinite, embedded canvases.
				//
				// KNOWN ISSUE:
				// It only works on canvas embedded within embedded notes. In contrast,
				// it does not work on canvas embedded within embedded canvas as
				// `ctx.depth` remains at 1.
				if (ctx.depth !== undefined && ctx.depth > 2) {
					return this.builtinCanvasEmbedCreator!(ctx, file, subpath);
				} else {
					return CanvasEmbedComponent.create(ctx, file, subpath);
				}
			});
		} else {
			this.builtinCanvasEmbedCreator = null;
		}
	}
}

export default BetterEmbeddedCanvasPlugin;