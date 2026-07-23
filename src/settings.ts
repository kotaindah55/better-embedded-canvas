import {
	type Debouncer,
	type EventRef,
	type SettingDefinitionItem,
	Component,
	debounce,
	Events,
	PluginSettingTab,
	Setting
} from './obsidian';
import type { BetterEmbeddedCanvasPlugin } from './main';
import { t } from './i18n';
import { getAppVersion } from './utils';

export interface BetterEmbeddedCanvasSettings {
	/**
	 * Show canvas name as embed title.
	 */
	showCanvasName: boolean;
}

export type BetterEmbeddedCanvasSettingKey = keyof BetterEmbeddedCanvasSettings;

export class BetterEmbeddedCanvasPluginSettingTab extends PluginSettingTab {
	private readonly plugin: BetterEmbeddedCanvasPlugin;

	public constructor(plugin: BetterEmbeddedCanvasPlugin) {
		super(plugin.app, plugin);
		this.plugin = plugin;
	}

	public override setControlValue<K extends BetterEmbeddedCanvasSettingKey>(
		key: K,
		value: BetterEmbeddedCanvasSettings[K]
	): void {
		this.plugin.settingManager.commit(key, () => value);
	}

	public override getControlValue<K extends BetterEmbeddedCanvasSettingKey>(key: K): BetterEmbeddedCanvasSettings[K] {
		return this.plugin.settings[key];
	}

	public override getSettingDefinitions(): SettingDefinitionItem<BetterEmbeddedCanvasSettingKey>[] {
		return [
			{
				name: t('settings.showCanvasName.name'),
				desc: t('settings.showCanvasName.desc'),
				control: {
					type: 'toggle',
					key: 'showCanvasName'
				}
			}
		];
	}

	public override display(): void {
		// Do not use legacy setting UI for 1.13.x or higher
		let appVer = getAppVersion();
		if (appVer.major >= 1 && appVer.minor >= 13)
			return;

		this.plugin.settingManager.defer(true);

		// Show canvas name
		new Setting(this.containerEl)
			.setName(t('settings.showCanvasName.name'))
			.setDesc(t('settings.showCanvasName.desc'))
			.addToggle(comp => comp
				.setValue(this.getControlValue('showCanvasName'))
				.onChange(this.setControlValue.bind(this, 'showCanvasName'))
			);
	}

	public override hide(): void {
		super.hide();
		this.containerEl.empty();
		this.plugin.settingManager.defer(false);
	}
}

/**
 * Manages plugin settings. Use this to change the settings.
 */
export class SettingManager extends Component {
	private readonly plugin: BetterEmbeddedCanvasPlugin;
	private readonly requestSave: Debouncer<[], void>;
	private readonly dispatcher: Events;

	private settings: BetterEmbeddedCanvasSettings;
	/**
	 * Being deferred will not trigger `settings-changed` event. Run
	 * `defer(false)` to trigger the event if the settings are changed before.
	 */
	private isDeferred: boolean;
	/**
	 * Keys of changed settings.
	 */
	private changed: Set<BetterEmbeddedCanvasSettingKey>;

	public constructor(plugin: BetterEmbeddedCanvasPlugin) {
		super();
		this.plugin = plugin;
		this.settings = getDefaultSettings();
		this.requestSave = debounce(() => plugin.saveData(this.settings), 100);
		this.dispatcher = new Events();
		this.isDeferred = false;
		this.changed = new Set();
	}

	// eslint-disable-next-line @typescript-eslint/no-misused-promises
	public override async onload(): Promise<void> {
		// Obtain plugin settings.
		Object.assign(this.settings, await this.plugin.loadData());
	}

	public override onunload(): void {
		this.changed.clear();
		this.isDeferred = false;
	}

	/**
	 * Triggered when changed the settings.
	 */
	public on(name: 'settings-changed', cb: (changed: Set<BetterEmbeddedCanvasSettingKey>) => unknown, ctx?: unknown): EventRef;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public on(name: string, cb: (...data: any[]) => unknown, ctx?: unknown): EventRef {
		return this.dispatcher.on(name, cb, ctx);
	}

	/**
	 * Defer or continue triggering event.
	 * 
	 * @param enable Set `false` to defer and `true` to continue.
	 */
	public defer(enable: boolean): void {
		if (enable == this.isDeferred) return;
		this.isDeferred = enable;
		if (!this.isDeferred) this.trigger();
	}

	/**
	 * Commit new value to a setting.
	 * 
	 * @param key Key of setting that is being commited.
	 * @param getNewVal Function to generate new setting value. Old value is
	 * passed as its argument.
	 * @param compare Compare between old value and new value. Return `true`
	 * if you want to save the new one, or `false` otherwise. Default is
	 * using strict equality (`===`).
	 */
	public commit<K extends BetterEmbeddedCanvasSettingKey>(
		key: K,
		getNewVal: (oldVal: BetterEmbeddedCanvasSettings[K]) => BetterEmbeddedCanvasSettings[K],
		compare?: (oldVal: BetterEmbeddedCanvasSettings[K], newVal: BetterEmbeddedCanvasSettings[K]) => boolean
	): void {
		let oldVal = this.settings[key],
			newVal = getNewVal(oldVal);

		// Default comparison.
		compare = (oldVal, newVal) => oldVal === newVal;

		if (!compare(oldVal, newVal)) {
			this.settings[key] = newVal;
			this.requestSave();
			this.changed.add(key);
		}

		if (!this.isDeferred) this.trigger();
	}

	/**
	 * Get setting value by setting key.
	 */
	public get<K extends BetterEmbeddedCanvasSettingKey>(key: K): BetterEmbeddedCanvasSettings[K] {
		return this.settings[key];
	}

	/**
	 * Get proxified settings.
	 * 
	 * @param readonly Whether settings are set to readonly. Default to true.
	 */
	public proxify(readonly = true): BetterEmbeddedCanvasSettings {
		return new Proxy(this.settings, {
			get<K extends BetterEmbeddedCanvasSettingKey>(
				settings: BetterEmbeddedCanvasSettings,
				key: K
			): BetterEmbeddedCanvasSettings[K] {
				return settings[key];
			},

			set<K extends BetterEmbeddedCanvasSettingKey>(
				settings: BetterEmbeddedCanvasSettings,
				key: K,
				newValue: BetterEmbeddedCanvasSettings[K]
			): boolean {
				if (readonly) return false;
				settings[key] = newValue;
				return true;
			}
		});
	}

	/**
	 * Trigger `settings-changed` event if the settings are changed before.
	 */
	private trigger(): void {
		if (!this.changed.size) return;
		this.dispatcher.trigger(`settings-changed`, new Set(this.changed));
		this.changed.clear();
	}
}

function getDefaultSettings(): BetterEmbeddedCanvasSettings {
	return {
		showCanvasName: true
	};
}