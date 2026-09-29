import type {
	AllCanvasNodeData,
	CanvasColor,
	CanvasData,
	CanvasNodeData,
	NodeSide
} from 'obsidian/canvas';
import type { Point } from './obsidian';
import { measureDistance } from './utils';

/**
 * Default node rectangle radius for static canvas.
 */
const CANVAS_NODE_RADIUS = 20;

const CANVAS_PREDEFINED_COLOR = ['1', '2', '3', '4', '5', '6'];

/**
 * Set color for node/edge element.
 * 
 * @param el Node rectangle or edge path.
 * @param color Can be an integer in range from 1 to 6 or HEX value.
 */
function setColor(el: SVGElement, color?: CanvasColor | number): void {
	color = color ? String(color) : '';
	if (!color) return;
	if (CANVAS_PREDEFINED_COLOR.includes(color)) {
		el.addClass('is-themed', `mod-canvas-color-${color}`);
	} else {
		el.addClass('is-themed', 'mod-canvas-color-custom');
		el.setCssProps({ '--canvas-color': color });
	}
}

/**
 * Expand given bounds using rect info from node data.
 */
function dilate(bounds: DOMRect, rectToInclude: CanvasNodeData): void {
	if (bounds.x > rectToInclude.x) bounds.x = rectToInclude.x;
	if (bounds.y > rectToInclude.y) bounds.y = rectToInclude.y;

	let maxWidth = rectToInclude.x + rectToInclude.width - bounds.x;
	let maxheight = rectToInclude.y + rectToInclude.height - bounds.y;

	if (bounds.width < maxWidth) bounds.width = maxWidth;
	if (bounds.height < maxheight) bounds.height = maxheight;
}

/**
 * Get bezier control point.
 * 
 * @param side Side control point should be bent towards.
 * @param from Start point.
 * @param distance Distance between start point and control point.
 */
function getControlPoint(side: NodeSide, from: Point, distance: number): Point {
	switch (side) {
		case 'left': return {
			x: from.x - distance,
			y: from.y
		};
		case 'right': return {
			x: from.x + distance,
			y: from.y
		};
		case 'top': return {
			x: from.x,
			y: from.y - distance
		};
		case 'bottom': return {
			x: from.x,
			y: from.y + distance
		};
	}
}

/**
 * Get node side center point.
 */
function getSideCenter(node: CanvasNodeData, side: NodeSide): Point {
	switch (side) {
		case 'left': return {
			x: node.x,
			y: node.y + node.height / 2
		};
		case 'right': return {
			x: node.x + node.width,
			y: node.y + node.height / 2
		};
		case 'top': return {
			x: node.x + node.width / 2,
			y: node.y
		};
		case 'bottom': return {
			x: node.x + node.width / 2,
			y: node.y + node.height
		};
	}
}

/**
 * Convert node data to `SVGRectElement`.
 */
function nodeToRectEl(node: CanvasNodeData): SVGRectElement {
	let rectEl = createSvg('rect', {
		attr: {
			x: node.x,
			y: node.y,
			width: node.width,
			height: node.height,
			rx: CANVAS_NODE_RADIUS,
			ry: CANVAS_NODE_RADIUS
		}
	});
	setColor(rectEl, node.color);
	return rectEl;
}

/**
 * Create `SVGPathElement` for edges.
 * 
 * @param from Start point.
 * @param to End point.
 * @param fromSide Which side should bezier start control point be bent
 * towards.
 * @param toSide Which side should bezier end control point be bent
 * towards.
 */
function createEdgePath(from: Point, to: Point, fromSide: NodeSide, toSide: NodeSide): SVGPathElement {
	let controlDistance = Math.clamp(measureDistance(from, to) / 2, 70, 150);
	let p1 = getControlPoint(fromSide, from, controlDistance);
	let p2 = getControlPoint(toSide, to, controlDistance);

	return createSvg('path', {
		attr: {
			d: `M${from.x},${from.y} C${p1.x},${p1.y} ${p2.x},${p2.y} ${to.x},${to.y}`
		}
	});
}

/**
 * Render static canvas inside given svg. It replicates what Obsidian
 * does when creating static canvas.
 * 
 * Static canvas has no interactivity nor displayed content, but it is
 * more performant and faster. It only renders geometric shape of nodes
 * and edges.
 */
export function renderStaticCanvas(data: CanvasData, canvas: SVGSVGElement): void {
	let viewBox = canvas.viewBox.baseVal;
	// Mapped nodes for instant access.
	let nodes: Record<string, AllCanvasNodeData> = {};

	let groupEls: SVGRectElement[] = [];
	let nodeEls: SVGRectElement[] = [];
	let edgeEls: SVGPathElement[] = [];

	// Reset viewbox.
	viewBox.x = 0;
	viewBox.y = 0;
	viewBox.width = 0;
	viewBox.height = 0;

	// Convert node to rect.
	for (let node of data.nodes) {
		dilate(viewBox, node);
		nodes[node.id] = node;

		if (node.type == 'group') {
			groupEls.push(nodeToRectEl(node));
		} else {
			nodeEls.push(nodeToRectEl(node));
		}
	}

	let strokeWidth = String(Math.sqrt((viewBox.width) / 10));
	let padding = Math.max(viewBox.width, viewBox.height) / 20;

	// Convert edge to path.
	for (let edge of data.edges) {
		let srcNode = nodes[edge.fromNode];
		let destNode = nodes[edge.toNode];

		if (srcNode && destNode && edge.fromSide && edge.toSide) {
			let from = getSideCenter(srcNode, edge.fromSide);
			let to = getSideCenter(destNode, edge.toSide);
			let pathEl = createEdgePath(from, to, edge.fromSide, edge.toSide);

			pathEl.setCssProps({ strokeWidth });
			setColor(pathEl, edge.color);
			edgeEls.push(pathEl);
		}
	}

	// Add padding to the svg.
	viewBox.x -= padding;
	viewBox.y -= padding;
	viewBox.width += padding * 2;
	viewBox.height += padding * 2;

	// Groups should placed in the back, and nodes in the foremost z-index.
	for (let collection of [groupEls, edgeEls, nodeEls])
		for (let el of collection) canvas.appendChild(el);
}