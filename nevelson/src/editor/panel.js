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
import { dispatch } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';

import { place, placeAt, placeSheet, isSheet, overlaps, union } from './place';
import { coreAlignLabels } from './alignment';
import { store as nevelsonStore } from './store';

export const closeIcon = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Path d="M12 13.06l3.712 3.713 1.061-1.06L13.061 12l3.712-3.712-1.06-1.06L12 10.938 8.288 7.227l-1.061 1.06L10.939 12l-3.712 3.712 1.06 1.061L12 13.061z" />
	</SVG>
);

// What stays in the block's toolbar: the icon and movers' group, the
// formatting group (marked by Nevelson), the pencil and the options menu.
const KEPT =
	'.block-editor-block-toolbar__block-controls, .nevelson-inline-marker, .nevelson-toolbar-button, .block-editor-block-settings-menu';

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
		// The parent block's button isn't helpful anywhere.
		if ( group.matches( '.block-editor-block-parent-selector' ) ) {
			continue;
		}
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
			tool.style.removeProperty( 'width' );
			tool.style.removeProperty( 'clip-path' );
			tool.classList.remove( 'nevelson-offstage' );
			tool.querySelectorAll( '[data-nevelson-label]' ).forEach( ( b ) =>
				b.removeAttribute( 'data-nevelson-label' )
			);
			marked.delete( tool );
		}
	}
}

/**
 * Puts the tools the block's toolbar doesn't show into the Actions panel in
 * the block's settings, as a list, one under another, each with its name.
 * They stay core's own, in the block toolbar's popover, positioned over the
 * Actions panel's place, so they scroll with the settings, and are clipped
 * to the settings' scrolling area; when the Actions panel isn't showing
 * (another tab, or it's closed), they're hidden. When the toolbar is docked
 * at the top of the editor, as on phones, they're shown there instead.
 *
 * @param {Element} panel  The panel.
 * @param {Set}     marked The tools Nevelson has moved.
 * @return {number} How many tools there are for the Actions panel.
 */
function placeTools( panel, marked ) {
	const toolbar = document.querySelector(
		'.block-editor-block-contextual-toolbar .block-editor-block-toolbar'
	);
	if ( ! toolbar ) {
		unmark( marked, new Set() );
		return -1; // Hidden as you type: keep what there was.
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

	// Core's alignment dropdowns are panels in the settings now.
	const replaced = coreAlignLabels();
	const shown = [];
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
		// A setting, not a toolbar button: its name beside its icon, when
		// it has only an icon.
		tool.querySelectorAll( 'button' ).forEach( ( button ) => {
			const label = button.getAttribute( 'aria-label' );
			if ( label && ! button.textContent.trim() ) {
				button.dataset.nevelsonLabel = label;
			}
		} );
		// Nothing left in it, once the alignment dropdowns are out.
		const empty = ! [
			...tool.querySelectorAll( '[data-toolbar-item], button' ),
		].some( ( item ) => ! item.closest( '.nevelson-replaced' ) );
		tool.classList.toggle( 'nevelson-empty', empty );
		if ( ! empty ) {
			shown.push( tool );
		}
	}

	const slot = panel.querySelector( '.nevelson-actions-slot' );
	const body = panel.querySelector( '.nevelson-body' );
	const offstage = ! slot || ! body;
	shown.forEach( ( tool ) =>
		tool.classList.toggle( 'nevelson-offstage', offstage )
	);
	if ( offstage ) {
		return shown.length;
	}

	const from = toolbar.getBoundingClientRect();
	const area = slot.getBoundingClientRect();
	const view = body.getBoundingClientRect();
	let y = area.top;
	for ( const tool of shown ) {
		// One under another, as wide as the Actions panel.
		tool.style.width = `${ Math.round( area.width ) }px`;
		tool.style.left = `${ Math.round( area.left - from.left ) }px`;
		tool.style.top = `${ Math.round( y - from.top ) }px`;
		const height = tool.offsetHeight;
		// Clipped to the settings' scrolling area, like the settings.
		const above = Math.max( 0, view.top - y );
		const below = Math.max( 0, y + height - view.bottom );
		tool.classList.toggle(
			'nevelson-offstage',
			above >= height || below >= height
		);
		tool.style.clipPath =
			above || below ? `inset(${ above }px 0 ${ below }px 0)` : '';
		y += height;
	}
	const total = Math.round( y - area.top );
	if ( slot.style.height !== `${ total }px` ) {
		slot.style.height = `${ total }px`;
	}
	return shown.length;
}

/**
 * Pop-outs opened from the panel (a colour picker, duotone, a link) open to
 * its side, level with what opened them, not over the panel: on its left if
 * there's room, or its right. Core places popovers with inline styles, so
 * Nevelson marks the pop-out and keeps where in CSS variables.
 *
 * @param {Element} panel The panel.
 * @param {Object}  state Remembers the pop-out it marked.
 */
function placePopout( panel, state ) {
	const opener = [
		...document.querySelectorAll(
			'.nevelson-panel [aria-expanded="true"], .nevelson-moved [aria-expanded="true"]'
		),
	].pop();
	const popover =
		opener &&
		[ ...document.querySelectorAll( '.components-popover' ) ]
			.filter(
				( p ) =>
					! p.matches(
						'.block-editor-block-popover, .components-tooltip, .block-editor-block-switcher__popover'
					) && ! p.contains( opener )
			)
			.pop();
	if ( state.popover && state.popover !== popover ) {
		state.popover.classList.remove( 'nevelson-side-popover' );
	}
	state.popover = popover || null;
	if ( ! popover ) {
		return;
	}
	popover.classList.add( 'nevelson-side-popover' );
	const card = panel.getBoundingClientRect();
	const from = opener.getBoundingClientRect();
	const box = popover.getBoundingClientRect();
	const GAP = 8;
	const left =
		card.left - GAP - box.width >= GAP
			? card.left - GAP - box.width
			: Math.min( card.right + GAP, window.innerWidth - GAP - box.width );
	const top = Math.max(
		GAP,
		Math.min( from.top, window.innerHeight - GAP - box.height )
	);
	popover.style.setProperty(
		'--nevelson-popout-left',
		`${ Math.round( left ) }px`
	);
	popover.style.setProperty(
		'--nevelson-popout-top',
		`${ Math.round( top ) }px`
	);
}

/**
 * The settings' tabs are icons, with their names only for screen readers:
 * in the panel, they show their names beside their icons.
 *
 * @param {Element} panel The panel.
 */
function labelTabs( panel ) {
	panel
		.querySelectorAll( '.nevelson-body [role="tablist"] [role="tab"]' )
		.forEach( ( tab ) => {
			const name = tab.getAttribute( 'aria-label' );
			let label = tab.querySelector( ':scope > .nevelson-tab-label' );
			if ( ! name ) {
				label?.remove();
				return;
			}
			if ( ! label ) {
				label = document.createElement( 'span' );
				label.className = 'nevelson-tab-label';
				label.setAttribute( 'aria-hidden', 'true' );
				tab.appendChild( label );
			}
			if ( label.textContent !== name ) {
				label.textContent = name;
			}
		} );
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

// The block toolbar's box by the block, with the handle and movers that sit
// out to its left, so the panel can stay clear of it. (Not the tools placed
// in the panel, which are in the toolbar too.)
function toolbarBox() {
	const bar = document.querySelector(
		'.block-editor-block-popover .block-editor-block-contextual-toolbar'
	);
	if ( ! bar ) {
		return null;
	}
	const rects = [
		bar,
		...bar.querySelectorAll(
			'.block-editor-block-toolbar__block-controls, .block-editor-block-mover'
		),
	]
		.filter( ( el ) => ! el.closest( '.nevelson-moved' ) )
		.map( ( el ) => el.getBoundingClientRect() )
		.filter( ( r ) => r.width && r.height );
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
		let actions = -1;
		let bar = null;
		let barFor = '';
		const popout = {};
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
			// The toolbar shows with the panel, so it goes beside both. While
			// you type, core hides the toolbar: keep to where it was, so the
			// panel doesn't jump as you start and stop.
			const now = typing ? null : toolbarBox();
			if ( now || barFor !== ids.join() ) {
				bar = now;
				barFor = ids.join();
			}
			const near =
				bar &&
				own &&
				bar.bottom > own.top - 120 &&
				bar.top < own.bottom + 120;
			const block = own
				? union( near ? [ own, bar ] : [ own ] )
				: {
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
			// The tools that aren't in the block's toolbar any more go in
			// the Actions panel, in the block's settings.
			const count = placeTools( el, marked );
			if ( count >= 0 && count !== actions ) {
				actions = count;
				dispatch( nevelsonStore ).setActions( count );
			}
			placePopout( el, popout );
			labelTabs( el );
			// Wider with three tabs or more, so their names fit.
			el.classList.toggle(
				'has-many-tabs',
				el.querySelectorAll(
					'.nevelson-body [role="tablist"] [role="tab"]'
				).length >= 3
			);

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
			popout.popover?.classList.remove( 'nevelson-side-popover' );
		};
	}, [] );

	// While the panel's open, the toolbar's other tools are in it.
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
			<div className="nevelson-body">
				<BlockInspector />
			</div>
		</div>
	);
}
