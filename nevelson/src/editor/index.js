/**
 * Nevelson: the block inspector as a floating panel beside the selected
 * block, as Judd's settings are, instead of in the sidebar.
 *
 * - The panel opens from a settings button in the block toolbar, and stays
 *   open from block to block until it's closed.
 * - The block's settings are only ever in the panel. It's always the
 *   selected block's own settings, even in a pattern or template part.
 * - The page's settings aren't in a sidebar either: the Settings button opens
 *   them in a card below it, as Judd's Edit page does.
 * - On a narrow canvas, the panel is a sheet along the bottom.
 */
import { registerPlugin } from '@wordpress/plugins';
import { useSelect, useDispatch, useRegistry } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import {
	createPortal,
	useEffect,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';

import { FloatingPanel } from './panel';
import { createSectionEntry } from './sections';
import { store as nevelsonStore } from './toolbar';
import './style.scss';

const SCOPE = 'core';
const BLOCK = 'edit-post/block';
const DOCUMENT = 'edit-post/document';

// Below WordPress' mobile breakpoint the sidebar fills the screen, so the
// page's settings stay as they are.
const isWide = () => window.matchMedia( '(min-width: 782px)' ).matches;

// The editor canvas iframe's document, once it has loaded.
function useCanvasDocument() {
	const [ doc, setDoc ] = useState( null );
	useEffect( () => {
		const find = () => {
			const d = document.querySelector(
				'iframe[name="editor-canvas"]'
			)?.contentDocument;
			const ready = d?.body && d.querySelector( '.is-root-container' );
			setDoc( ( prev ) => {
				if ( ! ready ) {
					return null;
				}
				return prev === d ? prev : d;
			} );
		};
		find();
		const t = setInterval( find, 600 );
		return () => clearInterval( t );
	}, [] );
	return doc;
}

/**
 * The sidebar only ever shows the page's settings: whenever the editor
 * switches it to the Block tab (which it does on selecting a block, and on
 * opening it with one selected), switch it back.
 */
function useSidebarIsForThePage() {
	const registry = useRegistry();
	useEffect( () => {
		const area = () =>
			registry
				.select( 'core/interface' )
				.getActiveComplementaryArea( SCOPE );
		return registry.subscribe( () => {
			if ( area() === BLOCK ) {
				registry
					.dispatch( 'core/interface' )
					.enableComplementaryArea( SCOPE, DOCUMENT );
			}
		} );
	}, [ registry ] );
}

/**
 * Where the page's settings card goes: below the Settings button, lined up
 * with its right edge. Kept in CSS variables, so the styles place it.
 *
 * @param {boolean} open Whether the card is open.
 */
function usePageCardPosition( open ) {
	useEffect( () => {
		const body = document.body;
		const put = () => {
			const header = document
				.querySelector(
					'.editor-header, .interface-interface-skeleton__header'
				)
				?.getBoundingClientRect();
			const toggle = Array.from(
				document.querySelectorAll(
					'.editor-header__settings button[aria-expanded], .interface-pinned-items button'
				)
			).find(
				( b ) =>
					b
						.getAttribute( 'aria-controls' )
						?.includes( 'edit-post' ) ||
					b.getAttribute( 'aria-pressed' ) !== null
			);
			const r = toggle?.getBoundingClientRect();
			body.style.setProperty(
				'--nevelson-page-top',
				`${ Math.round( ( header?.bottom ?? 96 ) + 8 ) }px`
			);
			body.style.setProperty(
				'--nevelson-page-right',
				`${ Math.max( 12, Math.round( window.innerWidth - ( r?.right ?? window.innerWidth - 12 ) ) ) }px`
			);
		};
		put();
		window.addEventListener( 'resize', put );
		return () => window.removeEventListener( 'resize', put );
	}, [ open ] );
}

function Nevelson() {
	const registry = useRegistry();
	const { key, area, hidden, isTyping } = useSelect( ( select ) => {
		const be = select( blockEditorStore );
		const multi = be.getMultiSelectedBlockClientIds();
		const one = be.getSelectedBlockClientId();
		const ids = multi.length ? multi : [ one ].filter( Boolean );
		return {
			key: ids.join( ',' ),
			area: select( 'core/interface' ).getActiveComplementaryArea(
				SCOPE
			),
			hidden: !! select( 'core/preferences' )?.get(
				'core',
				'distractionFree'
			),
			isTyping: be.isTyping(),
		};
	}, [] );
	const { disableComplementaryArea } = useDispatch( 'core/interface' );
	useSidebarIsForThePage();
	usePageCardPosition( area === DOCUMENT );

	useEffect( () => {
		document.body.classList.add( 'nevelson' );
		return () => document.body.classList.remove( 'nevelson' );
	}, [] );

	// The handle and the movers sit left of the block, outside the toolbar,
	// unless there's no room for them there, as for a full-width block.
	useEffect( () => {
		const ROOM = 80;
		let frame;
		const check = () => {
			frame = window.requestAnimationFrame( check );
			const bar = document.querySelector(
				'.block-editor-block-popover .block-editor-block-contextual-toolbar'
			);
			const canvas = document
				.querySelector( '.interface-interface-skeleton__content' )
				?.getBoundingClientRect();
			const inside =
				!! bar &&
				!! canvas &&
				bar.getBoundingClientRect().left - canvas.left < ROOM;
			if (
				document.body.classList.contains( 'nevelson-movers-inside' ) !==
				inside
			) {
				document.body.classList.toggle(
					'nevelson-movers-inside',
					inside
				);
			}
		};
		check();
		return () => {
			window.cancelAnimationFrame( frame );
			document.body.classList.remove( 'nevelson-movers-inside' );
		};
	}, [] );

	// The editor opens without the page's settings. They open a moment after
	// the editor does, so close them when they do, unless you've started on
	// something by then.
	const loading = useRef( true );
	useEffect( () => {
		const done = () => ( loading.current = false );
		const t = setTimeout( done, 4000 );
		window.addEventListener( 'pointerdown', done, true );
		window.addEventListener( 'keydown', done, true );
		return () => {
			clearTimeout( t );
			window.removeEventListener( 'pointerdown', done, true );
			window.removeEventListener( 'keydown', done, true );
		};
	}, [] );
	useEffect( () => {
		if ( loading.current && [ BLOCK, DOCUMENT ].includes( area ) ) {
			loading.current = false;
			disableComplementaryArea( SCOPE );
		}
	}, [ area, disableComplementaryArea ] );

	// Always the selected block's own settings, in sections too.
	const sections = useMemo(
		() => createSectionEntry( registry ),
		[ registry ]
	);
	useEffect( () => {
		const selection = () =>
			registry.select( blockEditorStore ).getSelectedBlockClientId();
		let prev = selection();
		return registry.subscribe( () => {
			const now = selection();
			if ( now !== prev ) {
				prev = now;
				setTimeout( sections.check, 0 );
			}
		} );
	}, [ registry, sections ] );

	// The panel opens from the block toolbar's settings button, and stays
	// open from block to block until it's closed.
	const open = useSelect(
		( select ) => select( nevelsonStore ).isOpen(),
		[]
	);
	const { setOpen } = useDispatch( nevelsonStore );

	const doc = useCanvasDocument();
	useEffect( () => {
		if ( ! doc ) {
			return;
		}
		const down = ( event ) => {
			if ( sections.onPointerDown( event ) ) {
				event.preventDefault();
				event.stopImmediatePropagation();
			}
			// The page's card closes when you go back to the page, as
			// Judd's popovers do.
			const { getActiveComplementaryArea } =
				registry.select( 'core/interface' );
			if (
				isWide() &&
				getActiveComplementaryArea( SCOPE ) === DOCUMENT
			) {
				registry
					.dispatch( 'core/interface' )
					.disableComplementaryArea( SCOPE );
			}
		};
		// Core leaves a section over a few moments after a click outside it,
		// so check more than once. Checking again changes nothing.
		const click = () =>
			[ 30, 250, 600 ].forEach( ( ms ) =>
				setTimeout( sections.check, ms )
			);
		const keep = ( event ) => {
			if ( sections.swallow() ) {
				event.preventDefault();
				event.stopImmediatePropagation();
				return true;
			}
			return false;
		};
		const clickOrKeep = ( event ) => {
			if ( ! keep( event ) ) {
				click();
			}
		};
		// On the canvas' window, capturing, so Nevelson hears clicks before
		// anything in the editor does.
		const win = doc.defaultView;
		const mouse = [ 'mousedown', 'mouseup' ];
		win.addEventListener( 'pointerdown', down, true );
		win.addEventListener( 'click', clickOrKeep, true );
		mouse.forEach( ( t ) => win.addEventListener( t, keep, true ) );
		return () => {
			win.removeEventListener( 'pointerdown', down, true );
			win.removeEventListener( 'click', clickOrKeep, true );
			mouse.forEach( ( t ) => win.removeEventListener( t, keep, true ) );
		};
	}, [ doc, registry, sections ] );

	const [ offset, setOffset ] = useState( null );

	if ( ! key || hidden || ! open ) {
		return null;
	}
	return createPortal(
		<FloatingPanel
			clientIds={ key.split( ',' ) }
			isTyping={ isTyping }
			offset={ offset }
			setOffset={ setOffset }
			onClose={ () => setOpen( false ) }
		/>,
		// In the editor's content area, which is a stacking context of its
		// own, so the block toolbar can go over the panel.
		document.querySelector( '.interface-interface-skeleton__content' ) ||
			document.body
	);
}

registerPlugin( 'nevelson', { render: Nevelson } );
