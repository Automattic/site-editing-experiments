/**
 * Small shared pieces: icons, the blocks the Add menu creates, and the live
 * miniature of a section used by the layouts panel.
 */
import { __ } from '@wordpress/i18n';
import { createBlock } from '@wordpress/blocks';
import { useLayoutEffect, useRef } from '@wordpress/element';

import { SETTINGS, withClassValue } from './model';

const svg = ( d, extra = {} ) => (
	<svg
		width={ extra.size || 18 }
		height={ extra.size || 18 }
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth={ extra.stroke || 2 }
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		{ d }
	</svg>
);

export const ICONS = {
	layout: svg( <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 9v12" /></> ),
	content: svg( <><path d="M4 20h4L19 9l-4-4L4 16v4z" /><path d="M13 7l4 4" /></> ),
	free: svg( <path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" /> ),
	up: svg( <path d="M12 19V5M6 11l6-6 6 6" />, { size: 16, stroke: 2.2 } ),
	down: svg( <path d="M12 5v14M6 13l6 6 6-6" />, { size: 16, stroke: 2.2 } ),
	copy: svg( <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>, { size: 16 } ),
	bin: svg( <><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" /><path d="M9 7V4h6v3" /></>, { size: 16 } ),
	plus: svg( <path d="M12 5v14M5 12h14" />, { size: 14, stroke: 2.4 } ),
	heading: svg( <path d="M6 4v16M18 4v16M6 12h12" /> ),
	paragraph: svg( <path d="M4 6h16M4 11h16M4 16h11" /> ),
	button: svg( <><rect x="3" y="8" width="18" height="8" rx="4" /><path d="M9 12h6" /></> ),
	image: svg( <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 17l-5-5-9 8" /></> ),
	card: svg( <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M4 11h16M8 15h8" /></> ),
	question: svg( <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6M12 17h.01" /></> ),
	person: svg( <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></> ),
	plan: svg( <><path d="M20 12l-8 8-9-9V3h8z" /><circle cx="7.5" cy="7.5" r="1.5" /></> ),
};

export const ADD_LABELS = {
	heading: __( 'Heading', 'degas' ),
	paragraph: __( 'Paragraph', 'degas' ),
	button: __( 'Button', 'degas' ),
	image: __( 'Image', 'degas' ),
	card: __( 'Card', 'degas' ),
	question: __( 'Question', 'degas' ),
	person: __( 'Person', 'degas' ),
	plan: __( 'Plan', 'degas' ),
};

let photoTurn = 0;
function photo() {
	const list = SETTINGS.photos || [];
	const p = list[ photoTurn++ % Math.max( 1, list.length ) ] || {};
	return { url: p.src, alt: p.alt || '' };
}
const image = ( className = 'degas-media' ) => createBlock( 'core/image', { ...photo(), className } );
const p = ( content, className ) => createBlock( 'core/paragraph', { content, className } );
const h3 = ( content ) => createBlock( 'core/heading', { content, level: 3 } );
const buttons = ( text ) => createBlock( 'core/buttons', {}, [ createBlock( 'core/button', { text } ) ] );

/** The block the Add menu inserts for each kind of item. */
export function newItem( type ) {
	switch ( type ) {
		case 'heading':
			return createBlock( 'core/heading', { content: __( 'New heading', 'degas' ), level: 2 } );
		case 'paragraph':
			return p( __( 'A new paragraph. Switch to Edit content to change this text.', 'degas' ) );
		case 'button':
			return buttons( __( 'New button', 'degas' ) );
		case 'image':
			return image();
		case 'card':
			return createBlock( 'core/group', { className: 'degas-card', layout: { type: 'default' } }, [
				image(),
				h3( __( 'New card', 'degas' ) ),
				p( __( 'Describe this card. Switch to Edit content to change the text.', 'degas' ) ),
			] );
		case 'question':
			return createBlock( 'core/group', { className: 'degas-card degas-qa', layout: { type: 'default' } }, [
				h3( __( 'A new question?', 'degas' ) ),
				p( __( 'The answer goes here. Switch to Edit content to change it.', 'degas' ) ),
			] );
		case 'person':
			return createBlock( 'core/group', { className: 'degas-card degas-person', layout: { type: 'default' } }, [
				image( 'degas-media degas-avatar' ),
				h3( __( '[Name]', 'degas' ) ),
				p( __( '[Role]', 'degas' ) ),
			] );
		case 'plan':
			return createBlock( 'core/group', { className: 'degas-card degas-plan', layout: { type: 'default' } }, [
				h3( __( 'New plan', 'degas' ) ),
				p( __( '[£00] / month', 'degas' ), 'degas-price' ),
				p( __( 'What’s included in this plan.', 'degas' ) ),
				buttons( __( 'Choose plan', 'degas' ) ),
			] );
	}
	return null;
}

const STRIP = [ 'id', 'data-block', 'data-type', 'data-title', 'tabindex', 'contenteditable', 'role', 'aria-label', 'aria-describedby', 'data-empty' ];

/**
 * A live miniature of a section, drawn in another layout and palette: a copy
 * of the section as it is in the canvas, shrunk to fit.
 *
 * @param {Object}      props
 * @param {HTMLElement} props.element The section's element in the canvas.
 * @param {string}      props.layout  Layout to draw it in.
 * @param {string}      props.palette Palette to draw it in.
 * @param {number}      props.width   Thumbnail width.
 * @param {number}      props.height  Thumbnail height.
 * @param {any}         props.version Redraws when this changes.
 */
export function Mini( { element, layout, palette, width = 120, height = 76, version } ) {
	const ref = useRef();
	useLayoutEffect( () => {
		const host = ref.current;
		if ( ! host || ! element ) {
			return;
		}
		host.textContent = '';
		const copy = element.cloneNode( true );
		[ copy, ...copy.querySelectorAll( '*' ) ].forEach( ( n ) => {
			STRIP.forEach( ( a ) => n.removeAttribute( a ) );
			n.classList?.remove( 'is-selected', 'is-hovered', 'has-child-selected', 'is-highlighted' );
		} );
		copy.className = withClassValue(
			withClassValue( copy.className, 'degas-layout-', layout ),
			'degas-palette-',
			palette === 'default' ? null : palette
		);
		copy.style.margin = '0';
		const stage = element.ownerDocument.createElement( 'span' );
		stage.className = 'dg-mini-stage';
		stage.style.width = element.offsetWidth + 'px';
		stage.appendChild( copy );
		host.appendChild( stage );
		const k = width / element.offsetWidth;
		const h = stage.offsetHeight * k;
		stage.style.transform = `translate(0, ${ Math.max( 0, ( height - h ) / 2 ) }px) scale(${ k })`;
	}, [ element, layout, palette, width, height, version ] );
	return <span className="dg-mini" ref={ ref } aria-hidden="true" inert="" style={ { width, height } } />;
}
