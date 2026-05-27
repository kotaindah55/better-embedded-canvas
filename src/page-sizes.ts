import type { PageSize } from './obsidian';

/**
 * Page sizes in pixels at 96 dpi.
 */
export const PageSizes: Record<PageSize, {
	width: number,
	height: number
}> = {
	A3: {
		width: 1123,
		height: 1587
	},
	A4: {
		width: 794,
		height: 1123
	},
	A5: {
		width: 559,
		height: 794
	},
	Legal: {
		width: 816,
		height: 1344
	},
	Letter: {
		width: 816,
		height: 1054
	},
	Tabloid: {
		width: 1056,
		height: 1632
	}
};

/**
 * Default page margin in pixels.
 */
export const DEFAULT_PAGE_MARGIN = 37;