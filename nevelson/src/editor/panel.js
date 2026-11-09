/**
 * The floating panel: the editor's own block inspector, in a card beside the
 * selected block that follows it as the page scrolls and changes.
 */
import {
	BlockIcon,
	BlockInspector,
	useBlockDisplayInformation,
} from '@wordpress/block-editor';
import { Button, SVG, Path } from '@wordpress/components';
import { useLayoutEffect, useRef } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

import { place, placeAt, placeSheet, isSheet, overlaps, union } from './place';
import { AlignmentPanels, coreAlignLabels } from './alignment';

export const closeIcon = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Path d="M12 13.06l3.712 3.713 1.061-1.06L13.061 12l3.712-3.712-1.06-1.06L12 10.938 8.288 7.227l-1.061 1.06L10.939 12l-3.712 3.712 1.06 1.061L12 13.061z" />
	</SVG>
);

// What stays in the block's toolbar: the icon and movers' group, the
// formatting group (marked by Nevelson), the pencil and the options menu.
const KEPT =
	'.block-editor-block-toolbar__block-controls, .nevelson-inline-marker, .nevelson-toolbar-button, .block-editor-block-settings-menu';

// The room around the tools in the panel's band, and the height of a row.
const BAND_PAD = 6;
const ROW = 48;

/**
 * The tools the block's toolbar doesn't show: whole groups (alignment, the
 * block's own tools) and anything sharing the pencil's group (such as
 * Replace).
 *
 * @param {Element} toolbar The block toolbar.
 * @return {Element[]} The tools, in the toolbar's order.
 */
function movedTools( toolbar ) {
	const tools = [];
	for ( const group of toolbar.children ) {
		if ( ! group.querySelector( KEPT ) ) {
			tools.push( group );
		} else if ( group.querySelector( '.nevelson-toolbar-button' ) ) {
			const slot = group.querySelector(
				'.block-editor-block-toolbar__slot'
			);
			for ( const item of slot?.children || [] ) {
				if ( ! item.matches( '.nevelson-toolbar-button, [hidden]' ) ) {
					tools.push( item );
				}
			}
		}
	}
	return tools;
}

// Puts tools back in the block's toolbar, but for those still in the panel.
function unmark( marked, keep ) {
	for ( const tool of marked ) {
		if ( ! keep.has( tool ) ) {
			tool.classList.remove(
				'nevelson-moved',
				'nevelson-unhidden',
				'nevelson-empty'
			);
			tool.querySelectorAll( '.nevelson-replaced' ).forEach( ( r ) =>
				r.classList.remove( 'nevelson-replaced' )
			);
			tool.style.removeProperty( 'left' );
			tool.style.removeProperty( 'top' );
			marked.delete( tool );
		}
	}
}

/**
 * Puts the tools the block's toolbar doesn't show into the panel's band, in
 * rows, from the left. They stay core's own, in the block toolbar's
 * popover, positioned over the panel. When the toolbar is docked at the top
 * of the editor, as on phones, they're shown there instead.
 *
 * @param {Element} panel  The panel.
 * @param {Set}     marked The tools Nevelson has moved.
 * @return {number|null} How many rows of tools there are, or null when the toolbar's hidden.
 */
function placeTools( panel, marked ) {
	const toolbar = document.querySelector(
		'.block-editor-block-contextual-toolbar .block-editor-block-toolbar'
	);
	if ( ! toolbar ) {
		unmark( marked, new Set() );
		return null;
	}
	const tools = movedTools( toolbar );
	const keep = new Set( tools );
	unmark( marked, keep );
	const docked = ! toolbar.closest( '.block-editor-block-popover' );
	if ( docked ) {
		tools.forEach( ( tool ) => {
			tool.classList.add( 'nevelson-unhidden' );
			marked.add( tool );
		} );
		return 0;
	}
	const band = panel.querySelector( '.nevelson-band' );
	if ( ! band ) {
		return 0;
	}
	const from = toolbar.getBoundingClientRect();
	const area = band.getBoundingClientRect();
	const left = area.left + BAND_PAD;
	const right = area.right - BAND_PAD;
	let x = left;
	let row = 0;
	// Core's alignment dropdowns are panels in the settings now.
	const replaced = coreAlignLabels();
	let any = false;
	for ( const tool of tools ) {
		tool.classList.add( 'nevelson-moved' );
		marked.add( tool );
		tool.querySelectorAll( '.components-dropdown' ).forEach( ( d ) => {
			const label = d
				.querySelector( '.components-dropdown-menu__toggle' )
				?.getAttribute( 'aria-label' );
			d.classList.toggle(
				'nevelson-replaced',
				replaced.includes( label )
			);
		} );
		// Nothing left in it, once the alignment dropdowns are out.
		const empty = ! [
			...tool.querySelectorAll( '[data-toolbar-item], button' ),
		].some( ( item ) => ! item.closest( '.nevelson-replaced' ) );
		tool.classList.toggle( 'nevelson-empty', empty );
		const width = empty ? 0 : tool.offsetWidth;
		if ( ! width ) {
			continue;
		}
		any = true;
		if ( x > left && x + width > right ) {
			x = left;
			row++;
		}
		tool.style.left = `${ Math.round( x - from.left ) }px`;
		tool.style.top = `${ Math.round(
			area.top + BAND_PAD + row * ROW - from.top
		) }px`;
		x += width;
	}
	return any ? row + 1 : 0;
}

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
 * The panel's heading: the block's icon and name, with its description as
 * the heading's title text, or how many blocks are selected.
 *
 * @param {Object}   props
 * @param {string[]} props.clientIds The selected blocks.
 */
function Heading( { clientIds } ) {
	const info = useBlockDisplayInformation( clientIds[ 0 ] );
	if ( clientIds.length > 1 ) {
		return (
			<span className="nevelson-kind">
				{ sprintf(
					/* translators: %d: how many blocks are selected. */
					__( '%d blocks', 'nevelson' ),
					clientIds.length
				) }
			</span>
		);
	}
	return (
		<span
			className="nevelson-kind"
			title={ info?.description || undefined }
		>
			{ info?.icon && <BlockIcon icon={ info.icon } /> }
			<span className="nevelson-kind-name">{ info?.title }</span>
		</span>
	);
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
		const bandRows = {};
		const marked = new Set();
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
			const block = own || {
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
			// The tools that aren't in the block's toolbar any more go in the
			// panel's band, below its header.
			const rows = placeTools( el, marked );
			if ( rows !== null ) {
				bandRows[ ids.join() ] = rows;
			}
			const shownRows = bandRows[ ids.join() ] ?? 0;
			el.classList.toggle( 'has-tools', shownRows > 0 );
			el.style.setProperty( '--nevelson-band-rows', shownRows );

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
			document.body.classList.toggle( 'nevelson-faded', faded );
		};
		tick();
		return () => {
			window.cancelAnimationFrame( frame );
			document.body.classList.remove( 'nevelson-faded' );
			unmark( marked, new Set() );
		};
	}, [] );

	// While the panel's open, the block toolbar is in it, not by the block.
	useLayoutEffect( () => {
		document.body.classList.add( 'nevelson-open' );
		return () => document.body.classList.remove( 'nevelson-open' );
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
			<div className="nevelson-head" onPointerDown={ onPointerDown }>
				<Heading clientIds={ clientIds } />
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
			{ /* The tools that aren't in the block's toolbar any more sit in
			   this band. */ }
			<div className="nevelson-band">
				<div className="nevelson-band-bar" />
			</div>
			<div className="nevelson-body">
				{ clientIds.length === 1 && (
					<AlignmentPanels clientId={ clientIds[ 0 ] } />
				) }
				<BlockInspector />
			</div>
		</div>
	);
}
