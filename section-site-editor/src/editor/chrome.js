/**
 * Editor chrome that CSS alone can't do:
 *
 * - In browse mode, an "Edit" button on the site preview.
 * - In edit mode, Save and Exit at the left of the top bar and a desktop /
 *   mobile switch at the right, in place of the back arrow, the Save button
 *   on the right and the preview menu. Save and Exit drive core's own
 *   buttons, so saving works exactly as before.
 *
 * The site editor exposes no slots for these spots, so they are rendered into
 * small elements placed in its markup, and re-placed if it re-renders.
 */
import clsx from 'clsx';
import { __ } from '@wordpress/i18n';
import { createPortal, useEffect, useState } from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';
import { Icon, desktop, mobile } from '@wordpress/icons';

import { STORE_NAME } from './store';
import { partArea } from './part-editing';

/**
 * Whether the site editor is in edit mode (the canvas fills the screen).
 *
 * @return {boolean} True while editing.
 */
export function useIsEditMode() {
	const read = () =>
		!! document
			.querySelector( '.edit-site-layout' )
			?.classList.contains( 'is-full-canvas' );
	const [ isEditMode, setIsEditMode ] = useState( read );
	useEffect( () => {
		const timer = setInterval( () => setIsEditMode( read() ), 400 );
		return () => clearInterval( timer );
	}, [] );
	return isEditMode;
}

/**
 * An element kept as the first (or last) child of whatever matches selector.
 *
 * @param {string}  selector  Where to place it.
 * @param {string}  className Class for the element.
 * @param {boolean} active    Whether it's wanted at all.
 * @param {string}  where     'start' or 'end'.
 * @return {HTMLElement|null} The element, once placed.
 */
function useMountPoint( selector, className, active, where = 'start' ) {
	const [ node, setNode ] = useState( null );
	useEffect( () => {
		if ( ! active ) {
			setNode( null );
			return;
		}
		const element = document.createElement( 'div' );
		element.className = className;
		const place = () => {
			const parent = document.querySelector( selector );
			if ( parent && element.parentElement !== parent ) {
				if ( where === 'start' ) {
					parent.prepend( element );
				} else {
					parent.append( element );
				}
				setNode( element );
			}
		};
		place();
		const timer = setInterval( place, 500 );
		return () => {
			clearInterval( timer );
			element.remove();
		};
	}, [ selector, className, active, where ] );
	return node;
}

function clickCore( selector ) {
	document.querySelector( selector )?.click();
}

function EditButton() {
	const node = useMountPoint(
		'.edit-site-layout__canvas',
		'sse-browse-edit',
		true
	);
	if ( ! node ) {
		return null;
	}
	return createPortal(
		<button
			type="button"
			className="sse-browse-edit__button"
			onClick={ () => {
				// The site editor's router follows the URL, so going to the
				// same page with canvas=edit is what entering edit mode is.
				const url = new URL( window.location.href );
				url.searchParams.set( 'canvas', 'edit' );
				window.history.pushState( {}, '', url );
				window.dispatchEvent(
					new window.PopStateEvent( 'popstate', { state: {} } )
				);
			} }
		>
			{ __( 'Edit', 'section-site-editor' ) }
		</button>,
		node
	);
}

function SaveAndExit() {
	const node = useMountPoint(
		'.editor-header__toolbar',
		'sse-save-exit',
		true
	);
	const isDirty = useSelect(
		( select ) =>
			select( coreStore ).__experimentalGetDirtyEntityRecords().length >
			0,
		[]
	);
	if ( ! node ) {
		return null;
	}
	return createPortal(
		<>
			<button
				type="button"
				className={ clsx( 'sse-save-exit__save', {
					'is-dirty': isDirty,
				} ) }
				aria-disabled={ ! isDirty }
				onClick={ () =>
					isDirty &&
					clickCore( '.editor-header .editor-post-publish-button' )
				}
			>
				{ __( 'Save', 'section-site-editor' ) }
			</button>
			<button
				type="button"
				className="sse-save-exit__exit"
				onClick={ () =>
					clickCore( '.editor-header__back-button button' )
				}
			>
				{ __( 'Exit', 'section-site-editor' ) }
			</button>
		</>,
		node
	);
}

/**
 * While the header or footer is being edited, the top bar's title says so,
 * ("Editing Site Header · Global").
 */
function PartTitle() {
	const area = useSelect( ( select ) => {
		const id = select( STORE_NAME ).getEditingPart();
		if ( ! id ) {
			return null;
		}
		return partArea(
			select( 'core/block-editor' ).getBlockAttributes( id )
		);
	}, [] );
	const node = useMountPoint(
		'.editor-header__center',
		'sse-part-title',
		!! area
	);
	if ( ! area || ! node ) {
		return null;
	}
	return createPortal(
		<>
			<strong>
				{ area === 'footer'
					? __( 'Editing Site Footer', 'section-site-editor' )
					: __( 'Editing Site Header', 'section-site-editor' ) }
			</strong>
			<span>{ __( 'Global', 'section-site-editor' ) }</span>
		</>,
		node
	);
}

function DeviceSwitch() {
	const node = useMountPoint(
		'.editor-header__settings',
		'sse-device-switch',
		true
	);
	const device = useSelect(
		( select ) => select( 'core/editor' )?.getDeviceType?.() || 'Desktop',
		[]
	);
	const { setDeviceType } = useDispatch( 'core/editor' );
	if ( ! node || ! setDeviceType ) {
		return null;
	}
	const option = ( type, icon, label ) => (
		<button
			type="button"
			className={ clsx( { 'is-active': device === type } ) }
			aria-pressed={ device === type }
			aria-label={ label }
			title={ label }
			onClick={ () => setDeviceType( type ) }
		>
			<Icon icon={ icon } size={ 20 } />
		</button>
	);
	return createPortal(
		<div className="sse-device-switch__group">
			{ option(
				'Desktop',
				desktop,
				__( 'Desktop', 'section-site-editor' )
			) }
			{ option(
				'Mobile',
				mobile,
				__( 'Mobile', 'section-site-editor' )
			) }
		</div>,
		node
	);
}

let closedSidebarOnce = false;

export default function Chrome() {
	const isEditMode = useIsEditMode();
	const interfaceDispatch = useDispatch( 'core/interface' );

	// Canvas first: the settings sidebar starts closed the
	// first time you go into edit mode. It opens again as usual on request.
	useEffect( () => {
		if ( isEditMode && ! closedSidebarOnce ) {
			closedSidebarOnce = true;
			interfaceDispatch?.disableComplementaryArea?.( 'core' );
		}
	}, [ isEditMode, interfaceDispatch ] );

	if ( ! isEditMode ) {
		return <EditButton />;
	}
	return (
		<>
			<SaveAndExit />
			<PartTitle />
			<DeviceSwitch />
		</>
	);
}
