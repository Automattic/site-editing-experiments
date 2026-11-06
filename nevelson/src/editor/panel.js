/**
 * The floating panel: the editor's own block inspector, in a card beside the
 * selected block that follows it as the page scrolls and changes.
 */
import { BlockInspector } from '@wordpress/block-editor';
import { Button, SVG, Path } from '@wordpress/components';
import { useLayoutEffect, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

import { place, placeAt, placeSheet, isSheet, overlaps, union } from './place';

export const closeIcon = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Path d="M12 13.06l3.712 3.713 1.061-1.06L13.061 12l3.712-3.712-1.06-1.06L12 10.938 8.288 7.227l-1.061 1.06L10.939 12l-3.712 3.712 1.06 1.061L12 13.061z" />
	</SVG>
);

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

/**
 * @param {Object}   props
 * @param {string[]} props.clientIds The selected blocks.
 * @param {boolean}  props.isTyping  Whether you're typing in the canvas.
 * @param {Object}   props.offset    Where it's been dragged to, or null to follow the block.
 * @param {Function} props.setOffset Puts it somewhere, or null to follow the block again.
 * @param {Function} props.onClose   Closes it until another block is selected.
 */
export function FloatingPanel( {
	clientIds,
	isTyping,
	offset,
	setOffset,
	onClose,
} ) {
	const ref = useRef();
	const live = useRef( {} );
	live.current = { clientIds, isTyping, offset };

	// Follow the block, every frame: it moves when the page scrolls, when
	// anything above it changes size, and as you type.
	useLayoutEffect( () => {
		let frame;
		let last = '';
		let shown = '';
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
			const sheet = isSheet( canvas );
			// The block's toolbar counts as part of the block, so the panel
			// doesn't cover it when it's wider than the block; not when the
			// toolbar is docked at the top of the editor.
			const toolbar = document
				.querySelector( '.block-editor-block-contextual-toolbar' )
				?.getBoundingClientRect();
			const near =
				own &&
				toolbar?.width &&
				toolbar.bottom >= own.top - 80 &&
				toolbar.top <= own.bottom + 80;
			const block = ( own &&
				( ! sheet && near ? union( [ own, toolbar ] ) : own ) ) || {
				left: canvas.right,
				top: canvas.top,
				right: canvas.right,
				bottom: canvas.top,
			};
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
			const key = [
				p.left,
				p.top,
				p.maxHeight,
				p.side,
				p.width,
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
		};
		tick();
		return () => window.cancelAnimationFrame( frame );
	}, [] );

	// Drag it by its top bar; it stays where you put it, for every block,
	// until Follow block.
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
			{  }
			<div className="nevelson-head" onPointerDown={ onPointerDown }>
				<span className="nevelson-kind">
					{ __( 'Block settings', 'nevelson' ) }
				</span>
				{ offset && (
					<Button
						size="small"
						className="nevelson-follow"
						onClick={ () => setOffset( null ) }
						label={ __(
							'Put it back beside the selected block',
							'nevelson'
						) }
						showTooltip
					>
						{ __( 'Follow block', 'nevelson' ) }
					</Button>
				) }
				<Button
					size="small"
					icon={ closeIcon }
					label={ __( 'Close', 'nevelson' ) }
					onClick={ onClose }
				/>
			</div>
			<div className="nevelson-body">
				<BlockInspector />
			</div>
		</div>
	);
}
