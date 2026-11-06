/**
 * Nevelson: the block inspector as a floating panel beside the selected
 * block, as Judd's settings are, instead of in the sidebar.
 *
 * The sidebar keeps the page's settings, as Judd's left panel keeps the
 * site's. Selecting a block no longer switches the sidebar to its Block tab;
 * the block's settings open beside it instead. Choose the Block tab, or Move
 * to the sidebar, and they go back in the sidebar; choose the page's tab,
 * Float, or close the sidebar, and they float again.
 */
import { registerPlugin } from '@wordpress/plugins';
import { useSelect, useDispatch, useRegistry } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { Button } from '@wordpress/components';
import { createPortal, useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

import { FloatingPanel, floatIcon } from './panel';
import './style.scss';

const SCOPE = 'core';
const BLOCK = 'edit-post/block';
const DOCUMENT = 'edit-post/document';

// Selecting a block makes the editor switch an open sidebar to its Block tab,
// straight after the selection. A switch this soon after one is the editor's.
const AUTO_SWITCH_MS = 600;

/**
 * Keeps the sidebar on the page's settings while the block's float: undoes
 * the editor's switch to the Block tab when a block is selected, and when the
 * sidebar is opened with a block selected. Choosing the Block tab yourself,
 * from the page's tab, isn't undone.
 *
 * @param {Object} docking Set `current` to true just before docking on purpose.
 */
function useKeepSidebarOnPage( docking ) {
	const registry = useRegistry();
	useEffect( () => {
		const area = () =>
			registry
				.select( 'core/interface' )
				.getActiveComplementaryArea( SCOPE );
		const selection = () =>
			registry.select( blockEditorStore ).getBlockSelectionStart();
		let prevArea = area();
		let prevSelection = selection();
		let selectedAt = 0;
		return registry.subscribe( () => {
			const now = area();
			const sel = selection();
			if ( sel && ! prevSelection ) {
				selectedAt = Date.now();
			}
			prevSelection = sel;
			if ( now === prevArea ) {
				return;
			}
			const was = prevArea;
			prevArea = now;
			if ( now !== BLOCK ) {
				return;
			}
			if ( docking.current ) {
				docking.current = false;
				return;
			}
			const automatic = Date.now() - selectedAt < AUTO_SWITCH_MS;
			const justOpened = was !== DOCUMENT;
			if ( sel && ( automatic || justOpened ) ) {
				registry
					.dispatch( 'core/interface' )
					.enableComplementaryArea( SCOPE, DOCUMENT );
			}
		} );
	}, [ registry, docking ] );
}

// A place in the sidebar's header, just before its close button, once the
// header is there.
function useSidebarHeaderSlot( enabled ) {
	const [ slot, setSlot ] = useState( null );
	useEffect( () => {
		if ( ! enabled ) {
			return;
		}
		const el = document.createElement( 'span' );
		el.className = 'nevelson-float-slot';
		const put = () => {
			const header = document.querySelector(
				'.editor-sidebar__panel-tabs'
			);
			if ( ! header ) {
				return;
			}
			const close = header.querySelector(
				':scope > button:last-child, :scope > .components-button:last-child'
			);
			if ( el.parentNode !== header || el.nextSibling !== close ) {
				header.insertBefore( el, close || null );
			}
			setSlot( el );
		};
		put();
		const t = setInterval( put, 400 );
		return () => {
			clearInterval( t );
			el.remove();
			setSlot( null );
		};
	}, [ enabled ] );
	return slot;
}

function Nevelson() {
	const { key, area, hidden, isTyping } = useSelect( ( select ) => {
		const be = select( blockEditorStore );
		const multi = be.getMultiSelectedBlockClientIds();
		const one = be.getSelectedBlockClientId();
		const ids = multi.length ? multi : [ one ].filter( Boolean );
		const prefs = select( 'core/preferences' );
		return {
			key: ids.join( ',' ),
			area: select( 'core/interface' ).getActiveComplementaryArea(
				SCOPE
			),
			hidden: !! prefs?.get( 'core', 'distractionFree' ),
			isTyping: be.isTyping(),
		};
	}, [] );
	const { enableComplementaryArea, disableComplementaryArea } =
		useDispatch( 'core/interface' );
	const docking = useRef( false );
	useKeepSidebarOnPage( docking );

	// The editor opens without its sidebar, to give the panel room beside the
	// content. The page's settings are still a click away. The sidebar opens
	// a moment after the editor does, so close it when it does, unless you've
	// started on something by then.
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

	const [ closedFor, setClosedFor ] = useState( null );
	const [ offset, setOffset ] = useState( null );
	const docked = area === BLOCK;
	const header = useSidebarHeaderSlot( docked );

	if ( docked ) {
		return header
			? createPortal(
					<Button
						className="nevelson-float"
						size="small"
						icon={ floatIcon }
						label={ __(
							'Float block settings beside the block',
							'nevelson'
						) }
						onClick={ () =>
							enableComplementaryArea( SCOPE, DOCUMENT )
						}
					/>,
					header
				)
			: null;
	}
	if ( ! key || hidden || closedFor === key ) {
		return null;
	}
	return createPortal(
		<FloatingPanel
			clientIds={ key.split( ',' ) }
			isTyping={ isTyping }
			offset={ offset }
			setOffset={ setOffset }
			onDock={ () => {
				docking.current = true;
				enableComplementaryArea( SCOPE, BLOCK );
			} }
			onClose={ () => setClosedFor( key ) }
		/>,
		document.body
	);
}

registerPlugin( 'nevelson', { render: Nevelson } );
