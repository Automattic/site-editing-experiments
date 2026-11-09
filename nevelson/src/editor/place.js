/**
 * Where the floating panel goes: pinned to the right of the canvas, just
 * below the editor's header, floating over the page, as tall as its
 * controls; or, on a narrow canvas, a sheet along the bottom.
 *
 * Rectangles are { left, top, right, bottom } in the editor window.
 */

export const MARGIN = 12; // Between the panel and the canvas' edges.
export const SHEET_BELOW = 720; // Canvases narrower than this get a sheet.
export const SHEET_SHARE = 0.5; // How much of the canvas a sheet may cover.

/**
 * Whether the canvas is too narrow for a panel at its side, so the panel is
 * a sheet along the bottom instead, as in Cassatt.
 *
 * @param {Object} canvas The visible part of the canvas.
 * @return {boolean} Whether it is.
 */
export function isSheet( canvas ) {
	return canvas.right - canvas.left < SHEET_BELOW;
}

/**
 * The panel pinned to the canvas' top right. It's as tall as its controls,
 * up to the height of the canvas, and scrolls inside past that.
 *
 * @param {Object} args
 * @param {Object} args.canvas The visible part of the canvas.
 * @param {Object} args.panel  The panel's { width }.
 * @return {{left: number, top: number, maxHeight: number, side: string}} Where it goes.
 */
export function placeRight( { canvas, panel } ) {
	return {
		left: canvas.right - MARGIN - panel.width,
		top: canvas.top + MARGIN,
		maxHeight: Math.max( 120, canvas.bottom - canvas.top - MARGIN * 2 ),
		side: 'right',
	};
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
