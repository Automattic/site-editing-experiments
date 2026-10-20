/**
 * Colours: for one block, or (after asking) for every block of its kind.
 *
 * Changing one heading's colour applies straight away, then a message asks
 * whether to use it for every heading on the site. Saying yes sets it in the
 * site's styles (Global Styles) and clears one-off colours of that kind, so
 * everything of that kind follows it.
 */
import { __, sprintf } from '@wordpress/i18n';
import { dispatch, select, resolveSelect } from '@wordpress/data';
import {
	store as blockEditorStore,
	useSettings,
} from '@wordpress/block-editor';
import { store as coreStore } from '@wordpress/core-data';
import { store as noticesStore } from '@wordpress/notices';

/** The theme's colours (or WordPress's own if the theme has none). */
export function usePalette() {
	const [ theme, def ] = useSettings(
		'color.palette.theme',
		'color.palette.default'
	);
	return ( theme && theme.length ? theme : def ) || [];
}

/**
 * What a block's colour is as a hex value, for showing in a swatch.
 * @param slug
 * @param custom
 * @param palette
 */
export function hexOf( slug, custom, palette ) {
	if ( custom ) {
		return custom.startsWith( 'var:preset|color|' )
			? hexOf( custom.split( '|' ).pop(), null, palette )
			: custom;
	}
	const found = slug && palette.find( ( c ) => c.slug === slug );
	return found ? found.color : undefined;
}

function nameOf( hex, palette ) {
	const found = palette.find(
		( c ) => c.color.toLowerCase() === ( hex || '' ).toLowerCase()
	);
	return found ? found.name : ( hex || '' ).toUpperCase();
}

/**
 * Kinds of block that share a colour, what to call them, and where their
 * colour lives in the site's styles.
 */
export const KINDS = {
	heading: {
		blocks: [ 'core/heading' ],
		all: __( 'Every heading', 'frankenthaler' ),
		question: __(
			'Use %s for every heading on your site?',
			'frankenthaler'
		),
		paths: [ [ 'elements', 'heading', 'color', 'text' ] ],
		attr: 'textColor',
		styleKey: 'text',
	},
	text: {
		blocks: [ 'core/paragraph', 'core/list' ],
		all: __( 'All body text', 'frankenthaler' ),
		question: __(
			'Use %s for all body text on your site?',
			'frankenthaler'
		),
		paths: [
			[ 'blocks', 'core/paragraph', 'color', 'text' ],
			[ 'blocks', 'core/list', 'color', 'text' ],
		],
		attr: 'textColor',
		styleKey: 'text',
	},
	quote: {
		blocks: [ 'core/quote', 'core/pullquote', 'core/verse' ],
		all: __( 'Every quote', 'frankenthaler' ),
		question: __( 'Use %s for every quote on your site?', 'frankenthaler' ),
		paths: [
			[ 'blocks', 'core/quote', 'color', 'text' ],
			[ 'blocks', 'core/pullquote', 'color', 'text' ],
			[ 'blocks', 'core/verse', 'color', 'text' ],
		],
		attr: 'textColor',
		styleKey: 'text',
	},
	code: {
		blocks: [ 'core/code', 'core/preformatted' ],
		all: __( 'All code', 'frankenthaler' ),
		question: __( 'Use %s for all code on your site?', 'frankenthaler' ),
		paths: [
			[ 'blocks', 'core/code', 'color', 'text' ],
			[ 'blocks', 'core/preformatted', 'color', 'text' ],
		],
		attr: 'textColor',
		styleKey: 'text',
	},
	button: {
		blocks: [ 'core/button' ],
		all: __( 'Every button', 'frankenthaler' ),
		question: __(
			'Use %s for every button on your site?',
			'frankenthaler'
		),
		paths: [ [ 'elements', 'button', 'color', 'background' ] ],
		attr: 'backgroundColor',
		styleKey: 'background',
	},
	// An outline button's colour is its text and border.
	outlineButton: {
		blocks: [ 'core/button' ],
		all: __( 'Every outline button', 'frankenthaler' ),
		question: __(
			'Use %s for every outline button on your site?',
			'frankenthaler'
		),
		paths: [
			[
				'blocks',
				'core/button',
				'variations',
				'outline',
				'color',
				'text',
			],
		],
		attr: 'textColor',
		styleKey: 'text',
	},
	section: {
		blocks: [
			'core/group',
			'core/media-text',
			'core/columns',
			'core/cover',
		],
		all: __( 'Every section', 'frankenthaler' ),
		question: __(
			'Use %s for every section on this page?',
			'frankenthaler'
		),
		paths: null, // Sections change one by one, on this page only.
		attr: 'backgroundColor',
		styleKey: 'background',
	},
};

export function kindOf( name ) {
	return Object.keys( KINDS ).find(
		( k ) =>
			k !== 'section' &&
			k !== 'outlineButton' &&
			KINDS[ k ].blocks.includes( name )
	);
}

/**
 * Attributes that give a block colour `hex` (a palette slug where there is one).
 * @param attributes
 * @param kind
 * @param hex
 * @param palette
 */
export function colourAttributes( attributes, kind, hex, palette ) {
	const k = KINDS[ kind ];
	const style = { ...( attributes.style || {} ) };
	const color = { ...( style.color || {} ) };
	delete color[ k.styleKey ];
	const match =
		hex &&
		palette.find( ( c ) => c.color.toLowerCase() === hex.toLowerCase() );
	const out = { [ k.attr ]: match ? match.slug : undefined };
	if ( hex && ! match ) {
		color[ k.styleKey ] = hex;
	}
	if ( Object.keys( color ).length ) {
		style.color = color;
	} else {
		delete style.color;
	}
	out.style = Object.keys( style ).length ? style : undefined;
	return out;
}

/**
 * Sets one block's colour, then offers to use it for all of that kind.
 *
 * @param {string} clientId Block.
 * @param {string} kind     Kind (KINDS key).
 * @param {string} hex      Colour, or undefined to go back to the default.
 * @param {Array}  palette  Theme colours.
 * @param {Array}  siblings For sections: the other sections on the page.
 */
export function setColour( clientId, kind, hex, palette, siblings = [] ) {
	const be = select( blockEditorStore );
	const block = be.getBlock( clientId );
	if ( ! block ) {
		return;
	}
	dispatch( blockEditorStore ).updateBlockAttributes(
		clientId,
		colourAttributes( block.attributes, kind, hex, palette )
	);

	const k = KINDS[ kind ];
	const others =
		kind === 'section'
			? siblings.filter( ( id ) => id !== clientId )
			: be
					.getClientIdsWithDescendants()
					.filter(
						( id ) =>
							id !== clientId &&
							k.blocks.includes( be.getBlockName( id ) )
					);
	if ( ! others.length && kind === 'section' ) {
		return;
	}
	const label = hex
		? nameOf( hex, palette )
		: __( 'the default colour', 'frankenthaler' );
	dispatch( noticesStore ).createNotice(
		'info',
		sprintf( k.question, label ),
		{
			id: 'frankenthaler-ask',
			type: 'snackbar',
			isDismissible: true,
			actions: [
				{
					label: k.all,
					onClick: () => applyToAll( kind, hex, palette, others ),
				},
			],
		}
	);
}

function setPath( obj, path, value ) {
	let o = obj;
	path.slice( 0, -1 ).forEach( ( key ) => {
		o[ key ] = { ...( o[ key ] || {} ) };
		o = o[ key ];
	} );
	if ( value === undefined ) {
		delete o[ path[ path.length - 1 ] ];
	} else {
		o[ path[ path.length - 1 ] ] = value;
	}
}

async function applyToAll( kind, hex, palette, others ) {
	const k = KINDS[ kind ];
	const be = select( blockEditorStore );
	const { updateBlockAttributes } = dispatch( blockEditorStore );
	const match =
		hex &&
		palette.find( ( c ) => c.color.toLowerCase() === hex.toLowerCase() );
	const label = hex
		? nameOf( hex, palette )
		: __( 'the default colour', 'frankenthaler' );

	if ( kind === 'section' ) {
		[ ...others ].forEach( ( id ) => {
			const b = be.getBlock( id );
			if ( b ) {
				updateBlockAttributes(
					id,
					colourAttributes( b.attributes, kind, hex, palette )
				);
			}
		} );
		dispatch( noticesStore ).createNotice(
			'info',
			sprintf( __( 'Every section is now %s.', 'frankenthaler' ), label ),
			{ type: 'snackbar', id: 'frankenthaler-done' }
		);
		return;
	}

	// The site's styles: every block of this kind, everywhere.
	const id =
		await resolveSelect(
			coreStore
		).__experimentalGetCurrentGlobalStylesId();
	if ( id ) {
		const record = await resolveSelect( coreStore ).getEditedEntityRecord(
			'root',
			'globalStyles',
			id
		);
		const styles = JSON.parse(
			JSON.stringify( ( record && record.styles ) || {} )
		);
		const value = match ? `var:preset|color|${ match.slug }` : hex;
		k.paths.forEach( ( path ) => setPath( styles, path, value ) );
		dispatch( coreStore ).editEntityRecord( 'root', 'globalStyles', id, {
			styles,
		} );
	}
	// One-off colours on this page would hide the change, so they go.
	const isOutline = ( cid ) =>
		/\bis-style-outline\b/.test(
			be.getBlockAttributes( cid ).className || ''
		);
	be.getClientIdsWithDescendants()
		.filter( ( cid ) => k.blocks.includes( be.getBlockName( cid ) ) )
		.filter( ( cid ) => kind !== 'outlineButton' || isOutline( cid ) )
		.filter( ( cid ) => kind !== 'button' || ! isOutline( cid ) )
		.forEach( ( cid ) =>
			updateBlockAttributes(
				cid,
				colourAttributes(
					be.getBlockAttributes( cid ),
					kind,
					undefined,
					palette
				)
			)
		);
	dispatch( noticesStore ).createNotice(
		'info',
		sprintf(
			/* translators: 1: kind, e.g. "Every heading", 2: colour name */ __(
				'%1$s is now %2$s. Save to keep it.',
				'frankenthaler'
			),
			k.all,
			label
		),
		{ type: 'snackbar', id: 'frankenthaler-done' }
	);
}
