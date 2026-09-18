import type { CanvasGroupData, CanvasTextData } from 'obsidian/canvas';
import {
	type FuzzyMatch,
	type SearchResult,
	type TFile,
	FuzzySuggestModal,
	prepareFuzzySearch,
	renderMatches,
	renderResults,
	setIcon,
	SuggestModal,
} from './obsidian';
import type { BetterEmbeddedCanvasPlugin } from './main';
import { getComplexSuggestTemplate } from './suggest';
import { defer } from './utils';

export interface CanvasNodeSuggestResult {
	data: EmbeddableCanvasNodeData;
	/**
	 * Node id search result.
	 */
	idResult: SearchResult | null;
	/**
	 * Search result from group label or content of text node.
	 */
	labelResult: SearchResult | null;
}

/**
 * Let user choose a canvas file in the vault through prompt and run
 * specific action on choose.
 */
export class CanvasChooserModal extends FuzzySuggestModal<TFile> {
	private readonly plugin: BetterEmbeddedCanvasPlugin;

	private isOpen: boolean;
	private files: TFile[] | null;
	private onChoose?: (file: TFile, evt: MouseEvent | KeyboardEvent) => void;

	public constructor(plugin: BetterEmbeddedCanvasPlugin) {
		super(plugin.app);
		this.plugin = plugin;
		this.isOpen = false;
		this.files = null;
	}

	public override open(): void {
		this.isOpen = true;
		super.open();
	}

	public override close(): void {
		this.isOpen = false;
		super.close();
	}

	public override async onOpen(): Promise<void> {
		this.files = this.app.vault
			.getFiles()
			.filter(file => file.extension.toLowerCase() == 'canvas');

		await super.onOpen();
	}

	public override onClose(): void {
		super.onClose();
		this.files = null;
		// onChooseItem() is run after close().
		defer(() => delete this.onChoose);
	}

	public override renderSuggestion(result: FuzzyMatch<TFile>, el: HTMLElement): void {
		let { titleEl, noteEl } = getComplexSuggestTemplate(el);
		titleEl.setText(result.item.basename);
		renderResults(noteEl, result.item.path, result.match);
	}

	public getItems(): TFile[] {
		return this.files ?? [];
	}

	public getItemText(file: TFile): string {
		return file.path;
	}

	public onChooseItem(file: TFile, evt: MouseEvent | KeyboardEvent): void {
		this.onChoose?.(file, evt);
	}

	/**
	 * Use this instead of `open()` to specify what the action should be run
	 * when choosing a canvas file. Running `open()` will do nothing.
	 * 
	 * @param purpose Run upon choosing a canvas file.
	 */
	public openFor(purpose: (file: TFile, evt: MouseEvent | KeyboardEvent) => void): void;
	/**
	 * Let user open the canvas node chooser upon choosing a canvas file.
	 * 
	 * @param onNodeChoose Run on choosing a canvas node in the later
	 * chooser.
	 */
	public openFor(purpose: 'node-chooser', onNodeChoose: (file: TFile, data: EmbeddableCanvasNodeData, evt: MouseEvent | KeyboardEvent) => void): void;
	public openFor(
		purpose: 'node-chooser' | ((file: TFile, evt: MouseEvent | KeyboardEvent) => void),
		onNodeChoose?: (file: TFile, data: EmbeddableCanvasNodeData, evt: MouseEvent | KeyboardEvent) => void
	): void {
		if (this.isOpen) return;

		if (purpose == 'node-chooser') {
			if (onNodeChoose) this.onChoose = file => new CanvasNodeChooserModal(this.plugin, file, onNodeChoose).open();
		} else {
			this.onChoose = purpose;
		}

		this.open();
	}
}

type EmbeddableCanvasNodeData = CanvasTextData | CanvasGroupData;

/**
 * Let user choose a node from a canvas file through prompt and run
 * specific action on choose.
 */
class CanvasNodeChooserModal extends SuggestModal<CanvasNodeSuggestResult> {
	private readonly plugin: BetterEmbeddedCanvasPlugin;
	private readonly file: TFile;
	private readonly onChoose: (file: TFile, data: EmbeddableCanvasNodeData, evt: MouseEvent | KeyboardEvent) => void;

	private haystack: EmbeddableCanvasNodeData[] | null;
	private lastResults: CanvasNodeSuggestResult[] | null;
	private lastQuery: string;

	public constructor(
		plugin: BetterEmbeddedCanvasPlugin,
		canvasFile: TFile,
		onChoose: (file: TFile, data: EmbeddableCanvasNodeData, evt: MouseEvent | KeyboardEvent) => void
	) {
		super(plugin.app);
		this.plugin = plugin;
		this.file = canvasFile;
		this.onChoose = onChoose;

		this.haystack = null;
		this.lastResults = null;
		this.lastQuery = '';
	}

	public override async onOpen(): Promise<void> {
		// Must be done first before super.onOpen().
		await this.collectHaystack();
		await super.onOpen();
	}

	public override onClose(): void {
		super.onClose();
		this.haystack = null;
		this.lastResults = null;
		this.lastQuery = '';
	}

	public async getSuggestions(query: string): Promise<CanvasNodeSuggestResult[]> {
		let search = prepareFuzzySearch(query),
			lastQuery = this.lastQuery;

		this.lastQuery = query;

		// Use previouse results as the haystack when current query starts with
		// previous query in order to reduce performance impact on large
		// haystack.
		if (lastQuery && query.startsWith(lastQuery)) {
			if (!this.lastResults) return [];

			this.lastResults = this.lastResults.filter(result => {
				let label = result.data.type == 'text' ? result.data.text : result.data.label;
				result.idResult = search(result.data.id);
				result.labelResult = search(label ?? '');
				return !!result.idResult || !!result.labelResult;
			});

			if (this.lastResults.length <= 0) {
				this.lastResults = null;
				return [];
			} else {
				return this.lastResults.sort(compareCanvasNodeResults);
			}
		}

		else if (this.haystack) {
			let results: CanvasNodeSuggestResult[] = [];
			this.haystack.forEach(data => {
				let label = data.type == 'text' ? data.text : data.label;

				let idResult = search(data.id),
					labelResult = search(label ?? '');

				if (idResult || labelResult) results.push({
					data,
					idResult,
					labelResult,
				});
			});
			
			if (results.length <= 0) {
				this.lastResults = null;
				return [];
			} else {
				// Record current results that may be used as haystack.
				return this.lastResults = results.sort(compareCanvasNodeResults);
			}
		}

		else {
			this.lastResults = null;
			return [];
		}
	}

	public renderSuggestion(result: CanvasNodeSuggestResult, el: HTMLElement): void {
		let { titleEl, noteEl, flairEl } = getComplexSuggestTemplate(el),
			{ data, idResult, labelResult } = result,
			label = data.type == 'text' ? data.text : data.label ?? '';

		renderMatches(noteEl, data.id, idResult?.matches ?? null);

		if (label) {
			renderMatches(titleEl, label, labelResult?.matches ?? null);
		} else {
			titleEl.setText(data.id);
		}
		
		if (data.type == 'group') setIcon(flairEl, 'lucide-group');
	}

	public onChooseSuggestion(result: CanvasNodeSuggestResult, evt: MouseEvent | KeyboardEvent): void {
		this.onChoose(this.file, result.data, evt);
	}

	/**
	 * Collect canvas node data as the haystack. Only accepts group and text
	 * nodes.
	 */
	private async collectHaystack(): Promise<void> {
		let cache = await this.plugin.canvasCache.getCacheAsync(this.file);
		this.haystack = cache
			? Object.values(cache.nodes).filter<EmbeddableCanvasNodeData>((data) => data.type == 'group' || data.type == 'text')
			: null;
	}
}

/**
 * Compare the score between 2 `CanvasNodeSuggestResult`s. Returns
 * negative number when `a` should be placed first, positive number when
 * `b` should be placed first, or zero when the two should be placed as
 * is.
 */
function compareCanvasNodeResults(a: CanvasNodeSuggestResult, b: CanvasNodeSuggestResult): number {
	let idScoreA = a.idResult?.score ?? -100,
		idScoreB = b.idResult?.score ?? -100,
		labelScoreA = a.labelResult?.score ?? -100,
		labelScoreB = b.labelResult?.score ?? -100;

	return (
		labelScoreB - labelScoreA ||
		idScoreB - idScoreA
	);
}