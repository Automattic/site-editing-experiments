/**
 * Where the floating panel goes, as in Judd's popovers: beside the selected
 * block on the right, or on the left if there's no room, or over the canvas'
 * right edge for wide blocks. Its top lines up with the block's and stays in
 * the canvas, so the panel is always in view however far the block scrolls.
 *
 * Rectangles are { left, top, right, bottom } in the editor window.
 */

export const GAP = 16; // Between the block and the panel.
export const MARGIN = 12; // Between the panel and the canvas' edges.
export const SHEET_BELOW = 720; // Canvases narrower than this get a sheet.
export const SHEET_SHARE = 0.5; // How much of the canvas a sheet may cover.

const clamp = ( v, min, max ) => Math.min( Math.max( v, min ), max );

/**
 * Whether the canvas is too narrow for a panel beside anything, so the
 * panel is a sheet along the bottom instead, as in Cassatt.
 *
 * @param {Object} canvas The visible part of the canvas.
 * @return {boolean} Whether it is.
 */
export function isSheet( canvas ) {
	return canvas.right - canvas.left < SHEET_BELOW;
}

/**
 * A sheet along the bottom of the canvas, as wide as the canvas and as tall
 * as its content, up to half the canvas.
 *
 * @param {Object} args
 * @param {Object} args.canvas The visible part of the canvas.
 * @param {Object} args.panel  The panel's { height }.
 * @return {{left: number, top: number, width: number, maxHeight: number, side: string}} Where it goes.
 */
export function placeSheet( { canvas, panel } ) {
	const maxHeight = Math.max(
		160,
		Math.round( ( canvas.bottom - canvas.top ) * SHEET_SHARE )
	);
	const height = Math.min( panel.height, maxHeight );
	return {
		left: canvas.left,
		top: canvas.bottom - height,
		width: canvas.right - canvas.left,
		maxHeight,
		side: 'sheet',
	};
}

/**
 * @param {Object} args
 * @param {Object} args.block  The selected blocks' box.
 * @param {Object} args.canvas The visible part of the canvas.
 * @param {Object} args.panel  The panel's { width, height }.
 * @return {{left: number, top: number, maxHeight: number, side: string}} Where it goes, and which side of the block: right, left or over.
 */
export function place( { block, canvas, panel } ) {
	const maxHeight = Math.max( 120, canvas.bottom - canvas.top - MARGIN * 2 );
	const height = Math.min( panel.height, maxHeight );
	let left;
	let side;
	if ( block.right + GAP + panel.width <= canvas.right - MARGIN ) {
		left = block.right + GAP;
		side = 'right';
	} else if ( block.left - GAP - panel.width >= canvas.left + MARGIN ) {
		left = block.left - GAP - panel.width;
		side = 'left';
	} else {
		left = canvas.right - MARGIN - panel.width;
		side = 'over';
	}
	const top = clamp(
		block.top,
		canvas.top + MARGIN,
		Math.max( canvas.top + MARGIN, canvas.bottom - MARGIN - height )
	);
	return { left, top, maxHeight, side };
}

/**
 * Where a panel that's been dragged goes: where it was put, relative to the
 * canvas, kept inside the canvas if the window has changed size.
 *
 * @param {Object} args
 * @param {Object} args.offset Where it was put, from the canvas' top left.
 * @param {Object} args.canvas The visible part of the canvas.
 * @param {Object} args.panel  The panel's { width, height }.
 * @return {{left: number, top: number, maxHeight: number, side: string}} Where it goes.
 */
export function placeAt( { offset, canvas, panel } ) {
	const maxHeight = Math.max( 120, canvas.bottom - canvas.top - MARGIN * 2 );
	const height = Math.min( panel.height, maxHeight );
	return {
		left: clamp(
			canvas.left + offset.x,
			canvas.left + MARGIN,
			Math.max(
				canvas.left + MARGIN,
				canvas.right - MARGIN - panel.width
			)
		),
		top: clamp(
			canvas.top + offset.y,
			canvas.top + MARGIN,
			Math.max( canvas.top + MARGIN, canvas.bottom - MARGIN - height )
		),
		maxHeight,
		side: 'put',
	};
}

/**
 * Whether two rectangles overlap.
 *
 * @param {Object} a
 * @param {Object} b
 * @return {boolean} Whether they do.
 */
export function overlaps( a, b ) {
	return (
		a.left < b.right &&
		b.left < a.right &&
		a.top < b.bottom &&
		b.top < a.bottom
	);
}

/**
 * The box around several boxes.
 *
 * @param {Object[]} rects
 * @return {Object|null} The box, or null if there were none.
 */
export function union( rects ) {
	if ( ! rects.length ) {
		return null;
	}
	return rects.reduce( ( u, r ) => ( {
		left: Math.min( u.left, r.left ),
		top: Math.min( u.top, r.top ),
		right: Math.max( u.right, r.right ),
		bottom: Math.max( u.bottom, r.bottom ),
	} ) );
}
