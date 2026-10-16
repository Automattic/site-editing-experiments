/**
 * Degas: Albers' section editing modes in the WordPress editor.
 */
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { registerPlugin } from '@wordpress/plugins';
import { useSelect } from '@wordpress/data';
import { createPortal, useEffect, useState } from '@wordpress/element';
import { store as editorStore } from '@wordpress/editor';

import { Layer } from './layer';

// Every block can carry a freeform position.
addFilter( 'blocks.registerBlockType', 'degas/free-attribute', ( settings ) => ( {
	...settings,
	attributes: { ...settings.attributes, degasFree: { type: 'object' } },
} ) );

// Show a block's freeform position in the canvas, the same way the site does.
addFilter(
	'editor.BlockListBlock',
	'degas/free-position',
	createHigherOrderComponent(
		( BlockListBlock ) =>
			function DegasFreeBlock( props ) {
				const f = props.attributes?.degasFree;
				if ( ! f ) {
					return <BlockListBlock { ...props } />;
				}
				const style = { ...( props.wrapperProps?.style || {} ) };
				const cls = [];
				if ( f.x || f.y ) {
					cls.push( 'has-degas-offset' );
					style[ '--degas-x' ] = f.x || 0;
					style[ '--degas-y' ] = f.y || 0;
				}
				if ( f.w ) {
					cls.push( 'has-degas-width' );
					style[ '--degas-w' ] = f.w;
				}
				if ( f.h ) {
					cls.push( 'has-degas-height' );
					style[ '--degas-h' ] = f.h;
				}
				return (
					<BlockListBlock
						{ ...props }
						className={ [ props.className, ...cls ].filter( Boolean ).join( ' ' ) }
						wrapperProps={ { ...props.wrapperProps, style } }
					/>
				);
			},
		'withDegasFreePosition'
	)
);

/** The editor canvas iframe's document, once it has loaded. */
function useCanvasDocument() {
	const [ doc, setDoc ] = useState( null );
	useEffect( () => {
		const find = () => {
			const iframe = document.querySelector( 'iframe[name="editor-canvas"]' );
			const d = iframe?.contentDocument;
			const ready = d && d.body && d.querySelector( '.is-root-container' );
			setDoc( ( prev ) => ( ready ? ( prev === d ? prev : d ) : null ) );
		};
		find();
		const t = setInterval( find, 600 );
		return () => clearInterval( t );
	}, [] );
	return doc;
}

function Degas() {
	const postType = useSelect( ( select ) => select( editorStore )?.getCurrentPostType?.(), [] );
	const doc = useCanvasDocument();
	const [ host, setHost ] = useState( null );

	useEffect( () => {
		if ( ! doc ) {
			setHost( null );
			return;
		}
		const el = doc.createElement( 'div' );
		el.className = 'dg-layer';
		doc.body.appendChild( el );
		setHost( el );
		return () => el.remove();
	}, [ doc ] );

	// Pages and posts; templates and template parts are left to the site editor.
	if ( ! host || postType === 'wp_template' || postType === 'wp_template_part' || postType === 'wp_block' || postType === 'wp_navigation' ) {
		return null;
	}
	return createPortal( <Layer doc={ doc } layerEl={ host } />, host );
}

registerPlugin( 'degas', { render: Degas } );
