/**
 * The page's settings, as a Page tab in the Document overview, beside List
 * View and Outline.
 *
 * Core's overview has no place for another tab, so Nevelson adds a button to
 * the start of its tab list, so Page comes first. The tab's content is core's own sidebar for the page (the
 * editor's Page or Template settings), placed over the overview's tab panel:
 * Page is open when that sidebar is, and the List View and Outline tabs, or
 * closing the overview, close it.
 */
import { useSelect, useDispatch, useRegistry } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';
import { createPortal, useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

export const SCOPE = 'core';
export const DOCUMENT = 'edit-post/document';

// Below WordPress' mobile breakpoint the overview and the sidebar each fill
// the screen, so the page's settings open as core opens them.
export const isWide = () => window.matchMedia( '(min-width: 782px)' ).matches;

const TABLIST = '.editor-list-view-sidebar [role="tablist"]';

// The overview's tab list, once it's open, and a place at its start for the
// Page tab, which comes first.
function useTabList( open ) {
	const [ list, setList ] = useState( null );
	const [ slot ] = useState( () => {
		const el = document.createElement( 'span' );
		el.className = 'nevelson-page-tab-slot';
		return el;
	} );
	useEffect( () => {
		const find = () => {
			const found = open ? document.querySelector( TABLIST ) : null;
			if ( found && found.firstChild !== slot ) {
				found.insertBefore( slot, found.firstChild );
			}
			setList( ( prev ) => ( prev === found ? prev : found ) );
		};
		find();
		const t = setInterval( find, 300 );
		return () => {
			clearInterval( t );
			slot.remove();
		};
	}, [ open, slot ] );
	return { list, slot };
}

export default function PageTab( { loading } ) {
	const registry = useRegistry();
	const { listOpen, pageOpen, label } = useSelect( ( select ) => {
		const editor = select( 'core/editor' );
		const type = editor.getCurrentPostType();
		return {
			listOpen: editor.isListViewOpened(),
			pageOpen:
				select( 'core/interface' ).getActiveComplementaryArea(
					SCOPE
				) === DOCUMENT,
			label:
				select( coreStore ).getPostType( type )?.labels
					?.singular_name || __( 'Page' ),
		};
	}, [] );
	const { enableComplementaryArea, disableComplementaryArea } =
		useDispatch( 'core/interface' );
	const { setIsListViewOpened } = useDispatch( 'core/editor' );
	const { list, slot } = useTabList( listOpen );
	const on = pageOpen && listOpen && isWide();

	// Page lives in the overview: opening the page's settings some other way
	// (a keyboard shortcut, say) opens the overview at Page, and closing the
	// overview closes them.
	useEffect( () => {
		if ( ! isWide() || loading.current ) {
			return;
		}
		if ( pageOpen && ! listOpen ) {
			setIsListViewOpened( true );
		}
	}, [ pageOpen ] ); // eslint-disable-line react-hooks/exhaustive-deps
	useEffect( () => {
		if ( isWide() && ! listOpen && pageOpen ) {
			disableComplementaryArea( SCOPE );
		}
	}, [ listOpen ] ); // eslint-disable-line react-hooks/exhaustive-deps

	// Choosing List View or Outline goes back to them.
	useEffect( () => {
		if ( ! list ) {
			return;
		}
		const click = ( event ) => {
			const tab = event.target.closest( '[role="tab"]' );
			if ( tab && ! tab.classList.contains( 'nevelson-page-tab' ) ) {
				registry
					.dispatch( 'core/interface' )
					.disableComplementaryArea( SCOPE );
			}
		};
		// And back along it to Page with the arrow keys, from the first of
		// core's tabs, or Home from any of them.
		const key = ( event ) => {
			const tabs = list.querySelectorAll(
				'[role="tab"]:not(.nevelson-page-tab)'
			);
			const page = list.querySelector( '.nevelson-page-tab' );
			const core = [ ...tabs ].includes( event.target );
			if (
				page &&
				core &&
				( event.key === 'Home' ||
					( event.key === 'ArrowLeft' &&
						event.target === tabs[ 0 ] ) )
			) {
				event.preventDefault();
				event.stopPropagation();
				page.focus();
				page.click();
			}
		};
		list.addEventListener( 'click', click, true );
		list.addEventListener( 'keydown', key, true );
		return () => {
			list.removeEventListener( 'click', click, true );
			list.removeEventListener( 'keydown', key, true );
		};
	}, [ list, registry ] );

	// While Page is open, its content is placed over the overview's tab
	// panel, and the tab list's indicator moves under Page. Kept in CSS
	// variables, so the styles place them.
	useEffect( () => {
		document.body.classList.toggle( 'nevelson-page-on', on );
		if ( ! on ) {
			return;
		}
		let frame;
		const put = () => {
			frame = window.requestAnimationFrame( put );
			const box = document
				.querySelector( '.editor-list-view-sidebar' )
				?.getBoundingClientRect();
			const head = document
				.querySelector(
					'.editor-list-view-sidebar .block-editor-tabbed-sidebar__tablist-and-close-button'
				)
				?.getBoundingClientRect();
			if ( ! box || ! head ) {
				return;
			}
			const tab = document.querySelector( '.nevelson-page-tab' );
			const body = document.body.style;
			body.setProperty( '--nevelson-page-top', `${ head.bottom }px` );
			body.setProperty( '--nevelson-page-left', `${ box.left }px` );
			body.setProperty( '--nevelson-page-width', `${ box.width }px` );
			body.setProperty(
				'--nevelson-page-height',
				`${ box.bottom - head.bottom }px`
			);
			if ( tab ) {
				body.setProperty(
					'--nevelson-tab-left',
					`${ tab.offsetLeft }`
				);
				body.setProperty(
					'--nevelson-tab-width',
					`${ tab.offsetWidth }`
				);
			}
		};
		put();
		return () => {
			window.cancelAnimationFrame( frame );
			document.body.classList.remove( 'nevelson-page-on' );
		};
	}, [ on ] );

	if ( ! list ) {
		return null;
	}
	// Dressed as core's tabs are.
	const like = list.querySelector( '[role="tab"]:not(.nevelson-page-tab)' );
	return createPortal(
		<button
			type="button"
			role="tab"
			aria-selected={ on }
			tabIndex={ on ? 0 : -1 }
			className={ `${ like?.className || '' } nevelson-page-tab` }
			onClick={ () =>
				pageOpen ? null : enableComplementaryArea( SCOPE, DOCUMENT )
			}
			onKeyDown={ ( event ) => {
				// On along the tab list with the arrow keys.
				if ( [ 'ArrowRight', 'End' ].includes( event.key ) ) {
					const tabs = list.querySelectorAll(
						'[role="tab"]:not(.nevelson-page-tab)'
					);
					const to =
						event.key === 'End'
							? tabs[ tabs.length - 1 ]
							: tabs[ 0 ];
					to?.focus();
					to?.click();
				}
			} }
		>
			{ label }
		</button>,
		slot
	);
}
