/**
 * Ito: lay a section out another way, from its own content, so its layout
 * changes and its words and pictures stay.
 */
import { registerPlugin } from '@wordpress/plugins';
import { useSelect } from '@wordpress/data';
import { createPortal, useEffect, useState } from '@wordpress/element';
import { store as editorStore } from '@wordpress/editor';

import { Layer } from './layer';
import './style.scss';

// The editor canvas iframe's document, once it has loaded.
function useCanvasDocument() {
	const [ doc, setDoc ] = useState( null );
	useEffect( () => {
		const find = () => {
			const iframe = document.querySelector(
				'iframe[name="editor-canvas"]'
			);
			const d = iframe?.contentDocument;
			const ready =
				d && d.body && d.querySelector( '.is-root-container' );
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

function Ito() {
	const postType = useSelect(
		( select ) => select( editorStore )?.getCurrentPostType?.(),
		[]
	);
	const doc = useCanvasDocument();
	const [ host, setHost ] = useState( null );

	useEffect( () => {
		if ( ! doc ) {
			setHost( null );
			return;
		}
		const el = doc.createElement( 'div' );
		el.className = 'ito-layer';
		doc.body.appendChild( el );
		setHost( el );
		return () => el.remove();
	}, [ doc ] );

	// Pages and posts; templates and template parts are left to the site editor.
	if (
		! host ||
		[
			'wp_template',
			'wp_template_part',
			'wp_block',
			'wp_navigation',
		].includes( postType )
	) {
		return null;
	}
	return createPortal( <Layer doc={ doc } layerEl={ host } />, host );
}

registerPlugin( 'ito', { render: Ito } );
