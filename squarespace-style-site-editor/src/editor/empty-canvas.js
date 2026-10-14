/**
 * A big "Add section" button on an empty page.
 *
 * When a page is edited without its template, its blocks sit at the root of
 * the canvas, and an empty page has no blocks for the section chrome to hang
 * off. This renders the button into the canvas iframe, after the block list.
 */
import { useSelect } from '@wordpress/data';
import { createPortal, useEffect, useState } from '@wordpress/element';
import { store as blockEditorStore } from '@wordpress/block-editor';

import { AddSectionButton } from './section-controls';
import { useIsEditMode } from './chrome';

function findRootContainer() {
	const iframe = document.querySelector( 'iframe[name="editor-canvas"]' );
	const doc = iframe?.contentDocument;
	return doc?.querySelector( '.is-root-container' ) || null;
}

export default function EmptyCanvas() {
	const isEmpty = useSelect( ( select ) => {
		const be = select( blockEditorStore );
		const order = be.getBlockOrder();
		if ( order.length > 1 ) {
			return false;
		}
		// A lone empty paragraph is how a new page starts.
		if ( order.length === 1 ) {
			const block = be.getBlock( order[ 0 ] );
			if (
				block?.name !== 'core/paragraph' ||
				( block.attributes.content?.toString?.() ?? '' ) !== ''
			) {
				return false;
			}
		}
		return ! be.getTemplateLock();
	}, [] );

	const isEditMode = useIsEditMode();
	const show = isEmpty && isEditMode;
	const [ container, setContainer ] = useState( null );

	useEffect( () => {
		if ( ! show ) {
			setContainer( null );
			return;
		}
		// The canvas iframe can be recreated while the page stays empty, so
		// keep checking that the button is still in it.
		let node = null;
		const attach = () => {
			const root = findRootContainer();
			if ( ! root || ( node?.isConnected && root.contains( node ) ) ) {
				return;
			}
			if ( node?.isConnected && node.previousElementSibling === root ) {
				return;
			}
			node?.remove();
			node = root.ownerDocument.createElement( 'div' );
			node.className = 'sse-empty-canvas';
			root.after( node );
			setContainer( node );
		};
		attach();
		const timer = setInterval( attach, 500 );
		return () => {
			clearInterval( timer );
			node?.remove();
		};
	}, [ show ] );

	if ( ! container ) {
		return null;
	}

	return createPortal(
		<div className="sse-section-anchor is-empty-page">
			<AddSectionButton rootClientId="" index={ 0 } position="first" />
		</div>,
		container
	);
}
