import {
	type AliasLinkSuggestResult,
	type SearchMatches,
	type SearchResult,
	type TFile,
	prepareFuzzySearch
} from './obsidian';
import type { BetterEmbeddedCanvasPlugin } from './main';

/**
 * Get suggest results for canvas nodes.
 * 
 * @param plugin
 * @param file Canvas file.
 * @param linkpath Linkpath of the canvas file.
 * @param query Query used to search canvas nodes. Retrieved from link
 * subpath.
 */
export async function getNodeSuggests(
	plugin: BetterEmbeddedCanvasPlugin,
	file: TFile,
	linkpath: string,
	query: string
): Promise<AliasLinkSuggestResult[]> {
	const results: AliasLinkSuggestResult[] = [];
	const cache = await plugin.canvasCache.getCacheAsync(file);

	if (query.startsWith('#')) query = query.slice(1);

	if (cache) {
		const search = prepareFuzzySearch(query);

		Object.each(cache.nodes, node => {
			let downranked = false;
			// Displayed as suggestion title.
			let label = '';
			let alias = '';
			let isGroupNode = false;

			if (node.type == 'text') {
				label = node.text;
			} else if (node.type == 'group') {
				label = node.label ?? '';
				// Use group label as an alias.
				alias = label || '';
				isGroupNode = true;
			} else {
				return;
			}

			let matches: SearchMatches | null = null;
			let idMatches: SearchMatches | null = null;
			let score = 0;

			if (query) {
				let result: SearchResult | null = null;
				let idResult: SearchResult | null = null;

				if (label) result = search(label);
				idResult = search(node.id);

				matches = result?.matches ?? null;
				idMatches = idResult?.matches ?? null;
				score = result?.score ?? idResult?.score ?? 0;
				// Downrank the suggestion as the query does not match the label.
				downranked = !result;
			} else {
				// Show all suggestions if the query is an empty string.
				matches = [];
				// Downrank the suggestion as the label does not exist.
				downranked = !label;
			}

			if (matches || idMatches) results.push({
				type: 'alias',
				alias,
				file,
				label,
				// linktext
				path: linkpath + `#${node.id}`,
				nodeId: node.id,
				isGroupNode,
				matches,
				idMatches,
				score,
				downranked,
				isCanvasNode: true
			});
		});
	}

	// Use query as a fallback result.
	if (results.length < 0) results.push({
		type: 'alias',
		alias: '',
		file: null,
		path: linkpath,
		score: 0,
		label: query,
		matches: [[0, query.length]]
	});

	return results;
}

/**
 * Create a suggest item that matches to builtin suggest item.
 * 
 * @param suggestEl If specified, apply to this element.
 * 
 * @returns Complex suggest item components.
 */
export function getComplexSuggestTemplate(suggestEl?: HTMLElement): {
	contentEl: HTMLElement;
	auxEl: HTMLElement;
	titleEl: HTMLElement;
	noteEl: HTMLElement;
	flairEl: HTMLElement;
} {
	suggestEl ??= createDiv('suggestion-item');
	suggestEl.addClass('mod-complex');

	const contentEl = suggestEl.createDiv('suggestion-content');
	const auxEl = suggestEl.createDiv('suggestion-aux');
	const titleEl = contentEl.createDiv('suggestion-title');
	const noteEl = contentEl.createDiv('suggestion-note');
	const flairEl = auxEl.createSpan('suggestion-flair');

	return { contentEl, auxEl, titleEl, noteEl, flairEl };
}
