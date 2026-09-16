import type { AllCanvasNodeData, CanvasData, CanvasEdgeData } from 'obsidian/canvas';
import { type App, type TAbstractFile, Component, TFile } from './obsidian';
import { getEdgesFromNodes, getGroupedNodes } from './utils';

/**
 * Cached canvas data, contains only node and edge data.
 */
interface CanvasCache {
	/**
	 * Canvas node data mapped to its id.
	 */
	nodes: Record<string, AllCanvasNodeData>;
	/**
	 * List of canvas node data, mapped to the group id.
	 */
	groups: Record<string, CanvasGroupCache>;
	/**
	 * Canvas edge data.
	 */
	edges: CanvasEdgeData[];
	/**
	 * Other properties assigned to the referred canvas data.
	 */
	data: Record<string, unknown>;
}

interface CanvasGroupCache {
	nodes: Record<string, AllCanvasNodeData>;
	edges: CanvasEdgeData[];
}

/**
 * Lazy-cache canvas data. Only cache when canvas data is explicitly
 * requested.
 */
export class CanvasCacheManager extends Component {
	private readonly app: App;
	private readonly cache: Map<TFile, CanvasCache>;

	public constructor(app: App) {
		super();
		this.app = app;
		this.cache = new Map();
	}

	public override onload(): void {
		this.registerEvent(this.app.vault.on('modify', this.handleVaultChange.bind(this)));
		this.registerEvent(this.app.vault.on('delete', this.handleVaultChange.bind(this)));
	}

	public override onunload(): void {
		this.cache.clear();
	}

	/**
	 * Get cached canvas data from a file.
	 * 
	 * @param content Specify raw file content explicitly. Overrides original
	 * content.
	 */
	public getCache(file: TFile, content?: string): CanvasCache | null {
		let data = this.cache.get(file) ?? null;
		if (data) return data;
		if (content) return this.compute(file, content);
		void this.computeFromFile(file);
		return null;
	}

	/**
	 * Get cached canvas data from a file asynchronously.
	 * 
	 * @param content Specify raw file content explicitly. Overrides original
	 * content.
	 */
	public async getCacheAsync(file: TFile, content?: string): Promise<CanvasCache | null> {
		let data = this.cache.get(file) ?? null;
		if (data) return data;
		if (content) return this.compute(file, content);
		return await this.computeFromFile(file);
	}

	/**
	 * Compute cached canvas data from raw data specified explicitly.
	 */
	public compute(file: TFile, content: string): CanvasCache | null {
		// Only receives canvas file.
		if (file.extension != 'canvas') return null;

		try {
			let data = JSON.parse(content) as CanvasData,
				cache: CanvasCache = { nodes: {}, edges: data.edges, groups: {}, data: {} };

			// Map all nodes to their id.
			data.nodes.forEach(node => {
				cache.nodes[node.id] = node;
				// Group nodes and edges by their group.
				if (node.type == 'group') {
					let groupeCache: CanvasGroupCache = {
						nodes: {},
						edges: []
					};
					cache.groups[node.id] = groupeCache;
					getGroupedNodes(node, data).forEach(node => groupeCache.nodes[node.id] = node);
					groupeCache.edges = getEdgesFromNodes(groupeCache.nodes, data);
				}
			});

			// Transfer other properties.
			Object.keys(data).forEach(prop => {
				if (prop == 'nodes' || prop == 'edges') return;
				cache.data[prop] = data[prop];
			});

			this.cache.set(file, cache);
			return cache;
		} catch (err) {
			console.error(err);
		}

		return null;
	}

	/**
	 * Compute cached canvas data from raw data.
	 */
	private async computeFromFile(file: TFile): Promise<CanvasCache | null> {
		return this.compute(file, await this.app.vault.cachedRead(file));
	}

	private handleVaultChange(aFile: TAbstractFile): void {
		// Remove cached canvas data when the file is deleted or modified.
		if (aFile instanceof TFile) this.cache.delete(aFile);
	}
}