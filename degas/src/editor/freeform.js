/**
 * Freeform: move and resize a section's items. While you drag, the item is
 * moved directly in the canvas; when you let go, its place is saved to the
 * block as degasFree ({x, y, w, h}: x and w in percent of the section's
 * content width, y and h in pixels), which the section styles apply in the
 * editor and on the site.
 */
import { __, sprintf } from '@wordpress/i18n';
import { useDispatch, useRegistry } from '@wordpress/data';
import { useEffect, useRef, useState } from '@wordpress/element';
import { store as blockEditorStore } from '@wordpress/block-editor';

import { ICONS } from './pieces';

const SNAP = 6;
const MIN_SIZE = 40;
const BOX_HANDLES = [ 'nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w' ];
const TEXT_HANDLES = [ 'e', 'w' ];

const round = ( n, d = 3 ) => Math.round( n * 10 ** d ) / 10 ** d;

/** The width freeform positions are measured against: the section's content box. */
export function contentBox( sectionEl ) {
	const inner = sectionEl?.querySelector( ':scope > .degas-inner' ) || sectionEl;
	if ( ! inner ) {
		return null;
	}
	const r = inner.getBoundingClientRect();
	const cs = inner.ownerDocument.defaultView.getComputedStyle( inner );
	const pl = parseFloat( cs.paddingLeft ) || 0;
	const pr = parseFloat( cs.paddingRight ) || 0;
	return {
		left: r.left + pl,
		right: r.right - pr,
		top: r.top,
		bottom: r.bottom,
		width: r.width - pl - pr,
	};
}

/** degasFree with nothing that does nothing, or undefined. */
export function cleanFree( f ) {
	const out = {};
	[ 'x', 'y', 'w', 'h' ].forEach( ( k ) => {
		if ( Number.isFinite( f?.[ k ] ) && f[ k ] !== 0 ) {
			out[ k ] = round( f[ k ] );
		}
	} );
	return Object.keys( out ).length ? out : undefined;
}

function nearest( points, targets ) {
	let best = null;
	points.forEach( ( p ) =>
		targets.forEach( ( t ) => {
			const d = t - p;
			if ( Math.abs( d ) <= SNAP && ( ! best || Math.abs( d ) < Math.abs( best.d ) ) ) {
				best = { d, at: t };
			}
		} )
	);
	return best;
}

export function Freeform( {
	doc,
	section,
	items,
	selected,
	onSelect,
	onRemove,
	grid,
	snap,
	toLayer,
	sectionRect,
} ) {
	const registry = useRegistry();
	const { updateBlockAttributes } = useDispatch( blockEditorStore );
	const [ guides, setGuides ] = useState( {} );
	const [ , setFrame ] = useState( 0 );
	const drag = useRef( null );

	const elOf = ( id ) => doc.getElementById( 'block-' + id );
	const secEl = elOf( section.clientId );
	const freeOf = ( id ) =>
		registry.select( blockEditorStore ).getBlockAttributes( id )?.degasFree || {};

	function targets( exceptId ) {
		const xs = [];
		const ys = [];
		const box = contentBox( secEl );
		const sr = secEl.getBoundingClientRect();
		if ( box ) {
			xs.push( box.left, box.right, ( box.left + box.right ) / 2 );
		}
		xs.push( ( sr.left + sr.right ) / 2 );
		items.forEach( ( it ) => {
			if ( it.clientId === exceptId ) {
				return;
			}
			const r = elOf( it.clientId )?.getBoundingClientRect();
			if ( r ) {
				xs.push( r.left, r.right, ( r.left + r.right ) / 2 );
				ys.push( r.top, r.bottom, ( r.top + r.bottom ) / 2 );
			}
		} );
		return { xs, ys };
	}

	function start( e, id, handle ) {
		const el = elOf( id );
		const box = contentBox( secEl );
		if ( ! el || ! box ) {
			return;
		}
		const f = freeOf( id );
		const r = el.getBoundingClientRect();
		const item = items.find( ( it ) => it.clientId === id );
		drag.current = {
			id,
			el,
			handle,
			box: item?.box,
			sx: e.clientX,
			sy: e.clientY,
			x0: ( ( f.x || 0 ) * box.width ) / 100,
			y0: f.y || 0,
			w0: r.width,
			h0: r.height,
			rect: r,
			unit: box.width / 100,
			t: snap ? targets( id ) : { xs: [], ys: [] },
			moved: false,
		};
		e.preventDefault();
		e.stopPropagation();
		e.target.setPointerCapture?.( e.pointerId );
	}

	function onPointerDown( e ) {
		if ( e.button !== 0 ) {
			return;
		}
		// The topmost (smallest) item under the pointer.
		let hit = null;
		items.forEach( ( it ) => {
			const r = elOf( it.clientId )?.getBoundingClientRect();
			if ( r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom ) {
				if ( ! hit || r.width * r.height < hit.area ) {
					hit = { id: it.clientId, area: r.width * r.height };
				}
			}
		} );
		onSelect( hit ? hit.id : null );
		if ( hit ) {
			start( e, hit.id, null );
		}
	}

	function onPointerMove( e ) {
		const d = drag.current;
		if ( ! d ) {
			return;
		}
		let dx = e.clientX - d.sx;
		let dy = e.clientY - d.sy;
		if ( ! d.moved && Math.abs( dx ) + Math.abs( dy ) < 3 ) {
			return;
		}
		d.moved = true;
		const g = {};
		let { x0: x, y0: y, w0: w, h0: h } = d;
		const h1 = d.handle;
		if ( ! h1 ) {
			// Moving: snap the item's edges and centre to the guides.
			if ( snap ) {
				const left = d.rect.left + dx;
				const top = d.rect.top + dy;
				const sx = nearest( [ left, left + d.w0 / 2, left + d.w0 ], d.t.xs );
				const sy = nearest( [ top, top + d.h0 / 2, top + d.h0 ], d.t.ys );
				if ( sx ) {
					dx += sx.d;
					g.v = sx.at;
				}
				if ( sy ) {
					dy += sy.d;
					g.h = sy.at;
				}
			}
			x += dx;
			y += dy;
		} else {
			// Resizing from a handle: the edges it holds move, the others stay.
			if ( h1.includes( 'e' ) ) {
				let edge = d.rect.right + dx;
				const s = snap && nearest( [ edge ], d.t.xs );
				if ( s ) {
					edge += s.d;
					g.v = s.at;
				}
				w = Math.max( MIN_SIZE, edge - d.rect.left );
			}
			if ( h1.includes( 'w' ) ) {
				let edge = d.rect.left + dx;
				const s = snap && nearest( [ edge ], d.t.xs );
				if ( s ) {
					edge += s.d;
					g.v = s.at;
				}
				w = Math.max( MIN_SIZE, d.rect.right - edge );
				x = d.x0 + ( d.w0 - w );
			}
			if ( h1.includes( 's' ) ) {
				let edge = d.rect.bottom + dy;
				const s = snap && nearest( [ edge ], d.t.ys );
				if ( s ) {
					edge += s.d;
					g.h = s.at;
				}
				h = Math.max( MIN_SIZE, edge - d.rect.top );
			}
			if ( h1.includes( 'n' ) ) {
				let edge = d.rect.top + dy;
				const s = snap && nearest( [ edge ], d.t.ys );
				if ( s ) {
					edge += s.d;
					g.h = s.at;
				}
				h = Math.max( MIN_SIZE, d.rect.bottom - edge );
				y = d.y0 + ( d.h0 - h );
			}
		}
		d.now = { x, y, w, h };
		// Show the move straight away in the canvas; it's saved on release.
		d.el.style.translate = `${ x }px ${ y }px`;
		if ( h1 ) {
			d.el.style.width = w + 'px';
			d.el.style.maxWidth = 'none';
			d.el.style.flex = '0 0 auto';
			if ( d.box ) {
				d.el.style.height = h + 'px';
			}
		}
		setGuides( g );
		setFrame( ( n ) => n + 1 );
	}

	function onPointerUp() {
		const d = drag.current;
		drag.current = null;
		setGuides( {} );
		if ( ! d || ! d.moved || ! d.now ) {
			return;
		}
		const f = freeOf( d.id );
		const next = { ...f, x: d.now.x / d.unit, y: d.now.y };
		if ( d.handle ) {
			next.w = d.now.w / d.unit;
			if ( d.box ) {
				next.h = d.now.h;
			}
		}
		updateBlockAttributes( d.id, { degasFree: cleanFree( next ) } );
		// Hand over from the live move to the saved position.
		d.el.ownerDocument.defaultView.requestAnimationFrame( () => {
			[ 'translate', 'width', 'maxWidth', 'flex', 'height' ].forEach( ( p ) => ( d.el.style[ p ] = '' ) );
		} );
	}

	// Delete removes the selected item; the arrow keys nudge it.
	useEffect( () => {
		if ( ! selected ) {
			return;
		}
		const onKey = ( e ) => {
			if ( e.target.isContentEditable || /INPUT|TEXTAREA/.test( e.target.tagName ) ) {
				return;
			}
			if ( e.key === 'Delete' || e.key === 'Backspace' ) {
				e.preventDefault();
				onRemove( selected );
				return;
			}
			const step = e.shiftKey ? 10 : 1;
			const moves = { ArrowLeft: [ -step, 0 ], ArrowRight: [ step, 0 ], ArrowUp: [ 0, -step ], ArrowDown: [ 0, step ] };
			if ( moves[ e.key ] ) {
				e.preventDefault();
				const box = contentBox( secEl );
				const f = freeOf( selected );
				updateBlockAttributes( selected, {
					degasFree: cleanFree( {
						...f,
						x: ( f.x || 0 ) + ( moves[ e.key ][ 0 ] * 100 ) / box.width,
						y: ( f.y || 0 ) + moves[ e.key ][ 1 ],
					} ),
				} );
			}
		};
		doc.addEventListener( 'keydown', onKey );
		return () => doc.removeEventListener( 'keydown', onKey );
	} );

	const box = contentBox( secEl );
	const selEl = selected && elOf( selected );
	const selItem = items.find( ( it ) => it.clientId === selected );
	const sel = selEl && toLayer( selEl.getBoundingClientRect() );
	const gridBox = box && toLayer( box );

	return (
		<>
			{ grid && gridBox && (
				<div
					className="dg-grid"
					style={ { left: gridBox.left, top: sectionRect.top, width: gridBox.width, height: sectionRect.height } }
					aria-hidden="true"
				>
					{ Array.from( { length: 12 }, ( _, i ) => <span key={ i } /> ) }
					<i style={ { left: sectionRect.left + sectionRect.width / 2 - gridBox.left } } />
				</div>
			) }
			<div
				className="dg-catcher"
				style={ sectionRect }
				onPointerDown={ onPointerDown }
				onPointerMove={ onPointerMove }
				onPointerUp={ onPointerUp }
				onPointerCancel={ onPointerUp }
			/>
			{ guides.v !== undefined && (
				<span className="dg-guide is-v" style={ { left: toLayer( { left: guides.v, top: 0, width: 0, height: 0 } ).left, top: sectionRect.top, height: sectionRect.height } } />
			) }
			{ guides.h !== undefined && (
				<span className="dg-guide is-h" style={ { top: toLayer( { left: 0, top: guides.h, width: 0, height: 0 } ).top, left: sectionRect.left, width: sectionRect.width } } />
			) }
			{ sel && (
				<div className="dg-selbox" style={ sel }>
					{ ( selItem?.box ? BOX_HANDLES : TEXT_HANDLES ).map( ( h ) => (
						<span
							key={ h }
							className="dg-handle"
							data-h={ h }
							onPointerDown={ ( e ) => start( e, selected, h ) }
							onPointerMove={ onPointerMove }
							onPointerUp={ onPointerUp }
							onPointerCancel={ onPointerUp }
						/>
					) ) }
					<span className="dg-dim">{ Math.round( sel.width ) } × { Math.round( sel.height ) }</span>
					<button
						type="button"
						className="dg-bin is-selected-bin"
						aria-label={ __( 'Remove this item', 'degas' ) }
						title={ sprintf( /* translators: %s: key name. */ __( 'Remove (%s)', 'degas' ), 'Delete' ) }
						onPointerDown={ ( e ) => e.stopPropagation() }
						onClick={ () => onRemove( selected ) }
					>
						{ ICONS.bin }
					</button>
				</div>
			) }
		</>
	);
}
