/**
 * The floating panel: the editor's own block inspector, in a card beside the
 * selected block that follows it as the page scrolls and changes.
 */
import { BlockInspector } from '@wordpress/block-editor';
import { Button, SVG, Path } from '@wordpress/components';
import { useLayoutEffect, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

import { place, placeAt, overlaps, union } from './place';

export const closeIcon = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Path d="M12 13.06l3.712 3.713 1.061-1.06L13.061 12l3.712-3.712-1.06-1.06L12 10.938 8.288 7.227l-1.061 1.06L10.939 12l-3.712 3.712 1.06 1.061L12 13.061z" />
	</SVG>
);

export const sidebarIcon = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Path d="M18 4H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-4 14.5H6c-.3 0-.5-.2-.5-.5V6c0-.3.2-.5.5-.5h8v13zm4.5-.5c0 .3-.2.5-.5.5h-2.5v-13H18c.3 0 .5.2.5.5v12z" />
	</SVG>
);

export const floatIcon = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Path d="M18 4H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm.5 14c0 .3-.2.5-.5.5H6c-.3 0-.5-.2-.5-.5V6c0-.3.2-.5.5-.5h12c.3 0 .5.2.5.5v12z" />
		<Path d="M11.5 8h5v8h-5z" />
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
 * @param {Function} props.onDock    Puts the settings back in the sidebar.
 * @param {Function} props.onClose   Closes it until another block is selected.
 */
export function FloatingPanel( {
	clientIds,
	isTyping,
	offset,
	setOffset,
	onDock,
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
			const block = blocksBox( iframe, ids ) || {
				left: canvas.right,
				top: canvas.top,
				right: canvas.right,
				bottom: canvas.top,
			};
			const size = { width: el.offsetWidth, height: el.scrollHeight };
			const p = put
				? placeAt( { offset: put, canvas, panel: size } )
				: place( { block, canvas, panel: size } );
			const box = {
				left: p.left,
				top: p.top,
				right: p.left + size.width,
				bottom: p.top + Math.min( size.height, p.maxHeight ),
			};
			// Out of the way while you type, if it's over what you're typing.
			const faded = typing && overlaps( box, block );
			const key = [ p.left, p.top, p.maxHeight, p.side, faded ].join();
			if ( key === last ) {
				return;
			}
			last = key;
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
		if ( event.button !== 0 || event.target.closest( 'button' ) ) {
			return;
		}
		const el = ref.current;
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
					icon={ sidebarIcon }
					label={ __( 'Move to the sidebar', 'nevelson' ) }
					onClick={ onDock }
				/>
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
