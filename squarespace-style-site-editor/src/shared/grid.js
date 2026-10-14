/**
 * Grid maths shared by the freeform section and item blocks.
 *
 * Layouts are { c, r, w, h }: 1-based column and row, width in columns and
 * height in rows.
 */

export const DESKTOP_COLUMNS = 24;
export const MOBILE_COLUMNS = 8;

const toInt = ( value, fallback ) => {
	const n = parseInt( value, 10 );
	return Number.isFinite( n ) ? n : fallback;
};

const clamp = ( n, min, max ) => Math.min( Math.max( n, min ), max );

export function normalizeLayout( layout = {}, columns = DESKTOP_COLUMNS ) {
	const w = clamp( toInt( layout.w, columns ), 1, columns );
	const c = clamp( toInt( layout.c, 1 ), 1, columns - w + 1 );
	const r = Math.max( 1, toInt( layout.r, 1 ) );
	const h = Math.max( 1, toInt( layout.h, 1 ) );
	return { c, r, w, h };
}

export function sameLayout( a, b ) {
	return (
		!! a && !! b && a.c === b.c && a.r === b.r && a.w === b.w && a.h === b.h
	);
}

/**
 * CSS custom properties that place an item. The front end and the editor use
 * the same properties, so what you see while dragging is what gets saved.
 *
 * @param {Object} attributes              Item attributes.
 * @param {Object} attributes.layout       Desktop layout.
 * @param {Object} attributes.mobileLayout Mobile layout, if any.
 * @param {number} attributes.zIndex       Stacking order.
 * @return {Object} React style object.
 */
export function itemStyle( { layout, mobileLayout, zIndex } ) {
	const d = normalizeLayout( layout, DESKTOP_COLUMNS );
	const style = {
		'--sse-c': d.c,
		'--sse-w': d.w,
		'--sse-r': d.r,
		'--sse-h': d.h,
		// Visual reading order, used to stack items on mobile.
		'--sse-o': d.r * 100 + d.c,
	};
	if ( zIndex ) {
		style[ '--sse-z' ] = zIndex;
	}
	if ( mobileLayout ) {
		const m = normalizeLayout( mobileLayout, MOBILE_COLUMNS );
		style[ '--sse-mc' ] = m.c;
		style[ '--sse-mw' ] = m.w;
		style[ '--sse-mr' ] = m.r;
		style[ '--sse-mh' ] = m.h;
	}
	return style;
}

/**
 * The last row any of the layouts reaches.
 *
 * @param {Object[]} layouts Layouts.
 * @return {number} Bottom row, 0 when there are none.
 */
export function bottomRow( layouts ) {
	return layouts.reduce(
		( max, l ) => ( l ? Math.max( max, l.r + l.h - 1 ) : max ),
		0
	);
}

/**
 * Turns desktop layouts into a single-column mobile layout, in reading order.
 * This matches what the front end shows before a mobile layout exists, so
 * the first drag on mobile starts from what's on screen.
 *
 * @param {Object[]} items Blocks ({ clientId, attributes }).
 * @return {{ layouts: Object, rows: number }} Mobile layouts by clientId.
 */
export function stackForMobile( items ) {
	const sorted = [ ...items ].sort( ( a, b ) => {
		const la = normalizeLayout( a.attributes.layout );
		const lb = normalizeLayout( b.attributes.layout );
		return la.r * 100 + la.c - ( lb.r * 100 + lb.c );
	} );
	const layouts = {};
	let row = 1;
	sorted.forEach( ( item ) => {
		const d = normalizeLayout( item.attributes.layout );
		const h = Math.max( 2, Math.min( d.h, 8 ) );
		layouts[ item.clientId ] = { c: 1, r: row, w: MOBILE_COLUMNS, h };
		row += h;
	} );
	return { layouts, rows: Math.max( row - 1, 1 ) };
}

/**
 * Reads the rendered grid tracks so pointer positions can snap to them.
 *
 * @param {HTMLElement} grid The grid container.
 * @return {Object} Track geometry and snapping helpers.
 */
export function readTracks( grid ) {
	const view = grid.ownerDocument.defaultView;
	const computed = view.getComputedStyle( grid );
	const rect = grid.getBoundingClientRect();
	const colGap = parseFloat( computed.columnGap ) || 0;
	const rowGap = parseFloat( computed.rowGap ) || 0;

	const sizes = ( value ) =>
		value
			.split( /\s+/ )
			.map( parseFloat )
			.filter( ( n ) => Number.isFinite( n ) );

	const colSizes = sizes( computed.gridTemplateColumns );
	const rowSizes = sizes( computed.gridTemplateRows );
	const fallbackRow = rowSizes.length ? rowSizes[ rowSizes.length - 1 ] : 40;

	// Allow dragging below the current rows: the section grows to fit.
	while ( rowSizes.length < 200 ) {
		rowSizes.push( fallbackRow );
	}

	const starts = ( list, gap ) => {
		const out = [];
		let pos = 0;
		list.forEach( ( size ) => {
			out.push( pos );
			pos += size + gap;
		} );
		return out;
	};

	const colStarts = starts( colSizes, colGap );
	const rowStarts = starts( rowSizes, rowGap );
	const colEnds = colStarts.map( ( s, i ) => s + colSizes[ i ] );
	const rowEnds = rowStarts.map( ( s, i ) => s + rowSizes[ i ] );

	const nearest = ( list, value ) => {
		let best = 0;
		let bestDistance = Infinity;
		list.forEach( ( pos, i ) => {
			const distance = Math.abs( pos - value );
			if ( distance < bestDistance ) {
				best = i;
				bestDistance = distance;
			}
		} );
		return best;
	};

	return {
		left: rect.left,
		top: rect.top,
		columns: colSizes.length,
		colStep: colSizes.length ? colSizes[ 0 ] + colGap : 1,
		rowStep: fallbackRow + rowGap,
		// 0-based indexes.
		colAt: ( x ) => nearest( colStarts, x ),
		colEndAt: ( x ) => nearest( colEnds, x ),
		rowAt: ( y ) => nearest( rowStarts, y ),
		rowEndAt: ( y ) => nearest( rowEnds, y ),
	};
}

/**
 * Applies a pointer movement to a layout.
 *
 * @param {Object} start  Layout when the gesture began.
 * @param {string} mode   'move' or a combination of n, e, s, w.
 * @param {Object} tracks From readTracks().
 * @param {Object} box    Item's starting box relative to the grid { left, top, right, bottom }.
 * @param {number} dx     Pointer movement in px.
 * @param {number} dy     Pointer movement in px.
 * @return {Object} The new layout.
 */
export function applyGesture( start, mode, tracks, box, dx, dy ) {
	const columns = tracks.columns;
	let { c, r, w, h } = start;

	if ( mode === 'move' ) {
		c = tracks.colAt( box.left + dx ) + 1;
		r = tracks.rowAt( box.top + dy ) + 1;
		return normalizeLayout( { c, r, w, h }, columns );
	}

	if ( mode.includes( 'e' ) ) {
		const last = tracks.colEndAt( box.right + dx );
		w = Math.max( 1, last - ( c - 1 ) + 1 );
	}
	if ( mode.includes( 'w' ) ) {
		const end = c - 1 + w - 1;
		const first = Math.min( tracks.colAt( box.left + dx ), end );
		c = first + 1;
		w = end - first + 1;
	}
	if ( mode.includes( 's' ) ) {
		const last = tracks.rowEndAt( box.bottom + dy );
		h = Math.max( 1, last - ( r - 1 ) + 1 );
	}
	if ( mode.includes( 'n' ) ) {
		const end = r - 1 + h - 1;
		const first = Math.min( tracks.rowAt( box.top + dy ), end );
		r = first + 1;
		h = end - first + 1;
	}

	w = Math.min( w, columns - c + 1 );
	return normalizeLayout( { c, r, w, h }, columns );
}
