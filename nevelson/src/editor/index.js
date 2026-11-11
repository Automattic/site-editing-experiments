/**
 * Nevelson: the block inspector as a floating panel beside the selected
 * block, as Judd's settings are, instead of in the sidebar.
 *
 * - The panel opens from a settings button in the block toolbar, and stays
 *   open from block to block until it's closed.
 * - The block's settings are only ever in the panel. It's always the
 *   selected block's own settings, even in a pattern or template part.
 * - The page's settings aren't in a sidebar either: they're a Page tab in the
 *   Document overview, beside List View and Outline.
 * - On a narrow canvas, the panel is a sheet along the bottom.
 */
import { registerPlugin } from '@wordpress/plugins';
import { useSelect, useDispatch, useRegistry } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { createPortal, useEffect, useRef, useState } from '@wordpress/element';

import { FloatingPanel } from './panel';
import PageTab, { SCOPE, DOCUMENT } from './page-tab';
import './toolbar';
import { store as nevelsonStore } from './store';
import './style.scss';

const BLOCK = 'edit-post/block';

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

function Nevelson() {
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

	// The panel opens from the block toolbar's settings button, and stays
	// open from block to block until it's closed.
	const open = useSelect(
		( select ) => select( nevelsonStore ).isOpen(),
		[]
	);
	const { setOpen } = useDispatch( nevelsonStore );

	const [ offset, setOffset ] = useState( null );

	const page = <PageTab loading={ loading } />;
	if ( ! key || hidden || ! open ) {
		return page;
	}
	return (
		<>
			{ page }
			{ createPortal(
				<FloatingPanel
					clientIds={ key.split( ',' ) }
					isTyping={ isTyping }
					offset={ offset }
					setOffset={ setOffset }
					onClose={ () => setOpen( false ) }
				/>,
				// In the editor's content area, which is a stacking context of its
				// own, so the block toolbar can go over the panel.
				document.querySelector(
					'.interface-interface-skeleton__content'
				) || document.body
			) }
		</>
	);
}

registerPlugin( 'nevelson', { render: Nevelson } );
