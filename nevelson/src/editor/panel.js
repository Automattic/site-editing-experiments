/**
 * The floating panel: the block's toolbar and the editor's own block
 * inspector, in one card beside the selected block that follows it as the
 * page scrolls and changes.
 */
import { BlockInspector } from '@wordpress/block-editor';
import { Button } from '@wordpress/components';
import { useLayoutEffect, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

import { place, placeAt, placeSheet, isSheet, overlaps, union } from './place';

const canvasFrame = () =>
	document.querySelector( 'iframe[name="editor-canvas"]' );

// The part of the canvas you can see: the canvas frame, inside the editor's
// content area and the window.
function visibleCanvas( iframe ) {
	const r = iframe.getBoundingClientRect();
	if ( ! r.width || ! r.height ) {
		return null;
	}
	const area = document
		.querySelector( '.interface-interface-skeleton__content' )
		?.getBoundingClientRect();
	const c = {
		left: Math.max( r.left, area?.left ?? r.left, 0 ),
		top: Math.max( r.top, area?.top ?? r.top, 0 ),
		right: Math.min( r.right, area?.right ?? r.right, window.innerWidth ),
		bottom: Math.min(
			r.bottom,
			area?.bottom ?? r.bottom,
			window.innerHeight
		),
	};
	// Make room for the page's settings card, when it's open. When it fills
	// the screen, as on phones, there's no room for anything else.
	const card = document
		.querySelector(
			'.interface-interface-skeleton__sidebar .interface-complementary-area'
		)
		?.getBoundingClientRect();
	if ( card?.width && card.left < c.right && card.right > c.left ) {
		if ( card.left - c.left < 320 ) {
			return null;
		}
		c.right = Math.min( c.right, card.left );
	}
	return c.right - c.left > 0 && c.bottom - c.top > 0 ? c : null;
}

// The selected blocks' box, in the editor window.
function blocksBox( iframe, clientIds ) {
	const doc = iframe.contentDocument;
	if ( ! doc ) {
		return null;
	}
	const frame = iframe.getBoundingClientRect();
	const rects = clientIds
		.map( ( id ) => doc.getElementById( `block-${ id }` ) )
		.filter( Boolean )
		.map( ( el ) => el.getBoundingClientRect() )
		.filter( ( r ) => r.width || r.height )
		.map( ( r ) => ( {
			left: frame.left + r.left,
			top: frame.top + r.top,
			right: frame.left + r.right,
			bottom: frame.top + r.bottom,
		} ) );
	return union( rects );
}

// The block toolbar's popover, when it's beside the block (not docked at
// the top of the editor, as on phones).
const toolbarPopover = () =>
	document
		.querySelector(
			'.block-editor-block-popover .block-editor-block-contextual-toolbar'
		)
		?.closest( '.block-editor-block-popover' );

// Heights of the panel's grip, and of its toolbar row before the toolbar's
// been in it.
const GRIP = 14;
const LABEL_ROW = 36;

/**
 * One card for the block: its toolbar along the top, moved there from above
 * the block, and its settings below.
 *
 * @param {Object}   props
 * @param {string[]} props.clientIds The selected blocks.
 * @param {boolean}  props.isTyping  Whether you're typing in the canvas.
 * @param {Object}   props.offset    Where it's been dragged to, or null to follow the block.
 * @param {Function} props.setOffset Puts it somewhere, or null to follow the block again.
 */
export function FloatingPanel( { clientIds, isTyping, offset, setOffset } ) {
	const ref = useRef();
	const live = useRef( {} );
	live.current = { clientIds, isTyping, offset };

	// While the panel's open, the block toolbar is in it.
	useLayoutEffect( () => {
		document.body.classList.add( 'nevelson-open' );
		return () => document.body.classList.remove( 'nevelson-open' );
	}, [] );

	// Follow the block, every frame: it moves when the page scrolls, when
	// anything above it changes size, and as you type.
	useLayoutEffect( () => {
		let frame;
		let last = '';
		let shown = '';
		const heights = {};
		const tick = () => {
			frame = window.requestAnimationFrame( tick );
			const el = ref.current;
			const iframe = canvasFrame();
			const canvas = iframe && visibleCanvas( iframe );
			if ( ! el || ! canvas ) {
				if ( el ) {
					el.style.visibility = 'hidden';
				}
				return;
			}
			const {
				clientIds: ids,
				offset: put,
				isTyping: typing,
			} = live.current;
			const own = blocksBox( iframe, ids );
			const block = own || {
				left: canvas.right,
				top: canvas.top,
				right: canvas.right,
				bottom: canvas.top,
			};
			const sheet = isSheet( canvas );

			// The toolbar wraps to the panel's width, so the panel stays narrow
			// enough to go beside the block. Its row is as tall as it is, and
			// keeps that height while the toolbar is hidden as you type, so
			// the panel doesn't jump. The parent block's button, which sticks
			// out of the toolbar, is hidden: the panel's card shows the parent.
			const popover = toolbarPopover();
			const bar = popover?.querySelector(
				'.block-editor-block-contextual-toolbar'
			);
			let shift = 0;
			if ( bar ) {
				shift =
					bar.getBoundingClientRect().left -
					popover.getBoundingClientRect().left;
				heights[ ids.join() ] = bar.offsetHeight;
			}
			const rowHeight = heights[ ids.join() ] || LABEL_ROW;
			el.classList.toggle( 'has-toolbar', !! bar );
			el.style.setProperty( '--nevelson-row', `${ rowHeight }px` );
			document.body.style.setProperty(
				'--nevelson-toolbar-width',
				`${ el.offsetWidth }px`
			);
			el.classList.toggle( 'is-sheet', sheet );

			const size = { width: el.offsetWidth, height: el.scrollHeight };
			let p;
			if ( sheet ) {
				p = placeSheet( { canvas, panel: size } );
			} else if ( put ) {
				p = placeAt( { offset: put, canvas, panel: size } );
			} else {
				p = place( { block, canvas, panel: size } );
			}
			// A sheet covers the bottom of the page: when a block is selected
			// under it, scroll the block up above it.
			const selection = ids.join();
			if ( sheet && selection !== shown ) {
				shown = selection;
				const under = block.bottom > p.top - 8;
				if ( under || block.top < canvas.top ) {
					iframe.contentWindow?.scrollBy( {
						top: block.top - canvas.top - 24,
						behavior: 'smooth',
					} );
				}
			} else if ( ! sheet ) {
				shown = selection;
			}
			const box = {
				left: p.left,
				top: p.top,
				right: p.left + size.width,
				bottom: p.top + Math.min( size.height, p.maxHeight ),
			};
			// Out of the way while you type, if it's over what you're typing.
			const faded = typing && !! own && overlaps( box, own );

			// The toolbar goes in the panel's toolbar row. Its popover has 8px
			// of room around the toolbar.
			const inset = bar
				? bar.getBoundingClientRect().top -
					popover.getBoundingClientRect().top
				: 0;
			document.body.style.setProperty(
				'--nevelson-toolbar-left',
				`${ Math.round( p.left - shift ) }px`
			);
			document.body.style.setProperty(
				'--nevelson-toolbar-top',
				`${ Math.round( p.top + GRIP - inset ) }px`
			);

			const key = [
				p.left,
				p.top,
				p.maxHeight,
				p.side,
				p.width,
				rowHeight,
				faded,
			].join();
			if ( key === last ) {
				return;
			}
			last = key;
			el.style.width = p.width ? `${ Math.round( p.width ) }px` : '';
			el.style.left = `${ Math.round( p.left ) }px`;
			el.style.top = `${ Math.round( p.top ) }px`;
			el.style.maxHeight = `${ Math.round( p.maxHeight ) }px`;
			el.style.visibility = '';
			el.dataset.side = p.side;
			el.classList.toggle( 'is-faded', faded );
			document.body.classList.toggle( 'nevelson-faded', faded );
		};
		tick();
		return () => {
			window.cancelAnimationFrame( frame );
			document.body.classList.remove( 'nevelson-faded' );
		};
	}, [] );

	// Drag it by its grip; it stays where you put it, for every block, until
	// Follow block.
	const onPointerDown = ( event ) => {
		const el = ref.current;
		if (
			event.button !== 0 ||
			event.target.closest( 'button' ) ||
			el?.classList.contains( 'is-sheet' )
		) {
			return;
		}
		const iframe = canvasFrame();
		const canvas = iframe && visibleCanvas( iframe );
		if ( ! el || ! canvas ) {
			return;
		}
		event.preventDefault();
		const r = el.getBoundingClientRect();
		const grab = { x: event.clientX - r.left, y: event.clientY - r.top };
		const head = event.currentTarget;
		head.setPointerCapture( event.pointerId );
		el.classList.add( 'is-dragging' );
		const move = ( e ) =>
			setOffset( {
				x: e.clientX - grab.x - canvas.left,
				y: e.clientY - grab.y - canvas.top,
			} );
		const up = () => {
			el.classList.remove( 'is-dragging' );
			head.removeEventListener( 'pointermove', move );
			head.removeEventListener( 'pointerup', up );
			head.removeEventListener( 'pointercancel', up );
		};
		head.addEventListener( 'pointermove', move );
		head.addEventListener( 'pointerup', up );
		head.addEventListener( 'pointercancel', up );
	};

	return (
		<div
			ref={ ref }
			className="nevelson-panel"
			role="region"
			aria-label={ __( 'Block settings', 'nevelson' ) }
			style={ { visibility: 'hidden' } }
		>
			<div
				className="nevelson-grip"
				onPointerDown={ onPointerDown }
				title={ __( 'Drag to move', 'nevelson' ) }
			>
				{ offset && (
					<Button
						size="small"
						className="nevelson-follow"
						onClick={ () => setOffset( null ) }
					>
						{ __( 'Follow block', 'nevelson' ) }
					</Button>
				) }
			</div>
			{ /* The block toolbar sits over this row. While it's hidden, as
			   when you're typing, the row says what the panel is. */ }
			<div className="nevelson-toolbar-row">
				<span className="nevelson-kind">
					{ __( 'Block settings', 'nevelson' ) }
				</span>
			</div>
			<div className="nevelson-body">
				<BlockInspector />
			</div>
		</div>
	);
}
