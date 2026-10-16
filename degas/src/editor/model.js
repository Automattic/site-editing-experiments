/**
 * How Degas reads the page: which blocks are sections, what kind each is,
 * its layout and palette (all class names on the section), and which blocks
 * inside it are items you can move, resize and remove.
 */
import { getBlockType } from '@wordpress/blocks';

export const SETTINGS = window.degasSettings || { sections: [], palettes: [] };

export const SECTIONS = Object.fromEntries(
	SETTINGS.sections.map( ( s ) => [ s.kind, s ] )
);

const classes = ( className ) => ( className || '' ).split( /\s+/ ).filter( Boolean );

/** The value of the first class starting with prefix, e.g. degas-layout-. */
export function classValue( className, prefix ) {
	const found = classes( className ).find( ( c ) => c.startsWith( prefix ) );
	return found ? found.slice( prefix.length ) : null;
}

/** className with prefix* replaced by prefix+value (or removed when value is null). */
export function withClassValue( className, prefix, value ) {
	const rest = classes( className ).filter( ( c ) => ! c.startsWith( prefix ) );
	if ( value ) {
		rest.push( prefix + value );
	}
	return rest.join( ' ' );
}

/** The section type, from its degas-<kind> class. */
export function kindOf( attributes ) {
	const list = classes( attributes?.className );
	if ( ! list.includes( 'degas-section' ) ) {
		return null;
	}
	return list.map( ( c ) => c.slice( 6 ) ).find( ( k ) => SECTIONS[ k ] ) || null;
}

export function layoutOf( attributes ) {
	const kind = kindOf( attributes );
	return (
		classValue( attributes?.className, 'degas-layout-' ) ||
		SECTIONS[ kind ]?.layouts[ 0 ]?.id ||
		null
	);
}

export function paletteOf( attributes ) {
	return classValue( attributes?.className, 'degas-palette-' ) || 'default';
}

export function sectionTitle( block ) {
	const kind = kindOf( block?.attributes );
	if ( kind ) {
		return SECTIONS[ kind ].title;
	}
	return (
		block?.attributes?.metadata?.name ||
		getBlockType( block?.name )?.title ||
		'Section'
	);
}

/**
 * Where a page's sections live: the Post Content block when the page is
 * shown in its template, otherwise the editor's root.
 *
 * @param {Object} be Block editor selectors.
 * @return {string} Root client ID ('' for the editor root).
 */
export function findSectionRoot( be ) {
	const [ postContent ] = be.getBlocksByName
		? be.getBlocksByName( 'core/post-content' )
		: [];
	return postContent || '';
}

// Blocks that only arrange other blocks. Their children are the items.
const STRUCTURAL = [ 'core/group', 'core/columns', 'core/column', 'core/row', 'core/stack' ];

function isStructural( block ) {
	if ( ! STRUCTURAL.includes( block.name ) || ! block.innerBlocks?.length ) {
		return false;
	}
	// A card (or any group someone gave a card class) moves as one.
	return ! classes( block.attributes?.className ).includes( 'degas-card' );
}

/**
 * The items in a section: blocks you can move and resize as one, such as a
 * heading, a paragraph, a row of buttons, an image or a card. Wrappers that
 * only arrange things are looked through.
 *
 * @param {Object} section Section block (with innerBlocks).
 * @return {Object[]} { clientId, name, box } in page order; box items resize
 *                    on every side, text items on the left and right only.
 */
export function itemsOf( section ) {
	const out = [];
	const walk = ( blocks ) =>
		blocks.forEach( ( b ) => {
			if ( isStructural( b ) ) {
				walk( b.innerBlocks );
				return;
			}
			const box =
				b.name === 'core/image' ||
				classes( b.attributes?.className ).includes( 'degas-card' ) ||
				( !! b.innerBlocks?.length && b.name !== 'core/buttons' );
			out.push( { clientId: b.clientId, name: b.name, box } );
		} );
	walk( section?.innerBlocks || [] );
	return out;
}

/** Whether a block's main job is holding content (text, an image). */
export function isContentBlock( name ) {
	const type = getBlockType( name );
	if ( ! type ) {
		return false;
	}
	return Object.values( type.attributes || {} ).some(
		( a ) => a.role === 'content' || a.__experimentalRole === 'content'
	);
}

/** Every block in a section, depth first, including the section. */
export function eachBlock( block, fn ) {
	fn( block );
	( block.innerBlocks || [] ).forEach( ( b ) => eachBlock( b, fn ) );
}

/** The first block inside a section with all of the given classes. */
export function findByClass( block, className ) {
	let found = null;
	eachBlock( block, ( b ) => {
		if ( ! found && classes( b.attributes?.className ).includes( className ) ) {
			found = b;
		}
	} );
	return found;
}

/** The layouts a section can switch to: the extra ones appear once there's enough content. */
export function layoutsFor( kind, element, current ) {
	const def = SECTIONS[ kind ];
	if ( ! def ) {
		return [];
	}
	return def.layouts
		.filter( ( l ) => {
			if ( ! l.when || l.id === current ) {
				return true;
			}
			const [ selector, min ] = l.when;
			return element && element.querySelectorAll( selector ).length >= min;
		} )
		.map( ( l ) => ( { ...l, extra: !! l.when } ) );
}

/** What can be added to each section type, and where it goes (a slot class). */
export const ADDABLE = {
	hero: [
		[ 'heading', 'degas-hero__text' ],
		[ 'paragraph', 'degas-hero__text' ],
		[ 'button', 'degas-hero__text' ],
		[ 'image', 'degas-hero__media' ],
	],
	features: [
		[ 'heading', 'degas-inner', 'first' ],
		[ 'paragraph', 'degas-inner', 'first' ],
		[ 'card', 'degas-cards' ],
	],
	cta: [
		[ 'heading', 'degas-cta__text' ],
		[ 'paragraph', 'degas-cta__text' ],
		[ 'button', 'degas-cta__panel' ],
	],
	text: [
		[ 'heading', 'degas-text__body' ],
		[ 'paragraph', 'degas-text__body' ],
		[ 'button', 'degas-text__body' ],
		[ 'image', 'degas-text__body' ],
	],
	image: [
		[ 'heading', 'degas-image__text' ],
		[ 'paragraph', 'degas-image__text' ],
		[ 'button', 'degas-image__text' ],
	],
	gallery: [
		[ 'heading', 'degas-inner', 'first' ],
		[ 'paragraph', 'degas-inner', 'first' ],
		[ 'image', 'degas-gallery__grid' ],
	],
	quote: [
		[ 'heading', 'degas-inner', 'first' ],
		[ 'paragraph', 'degas-inner' ],
		[ 'button', 'degas-inner' ],
	],
	contact: [
		[ 'heading', 'degas-contact__text' ],
		[ 'paragraph', 'degas-contact__text' ],
		[ 'button', 'degas-contact__text' ],
	],
	faq: [
		[ 'question', 'degas-faq__list' ],
		[ 'heading', 'degas-inner', 'first' ],
		[ 'paragraph', 'degas-inner', 'first' ],
	],
	team: [
		[ 'person', 'degas-team__grid' ],
		[ 'heading', 'degas-inner', 'first' ],
		[ 'paragraph', 'degas-inner', 'first' ],
	],
	newsletter: [
		[ 'heading', 'degas-newsletter__text' ],
		[ 'paragraph', 'degas-newsletter__text' ],
	],
	pricing: [
		[ 'plan', 'degas-pricing__plans' ],
		[ 'heading', 'degas-inner', 'first' ],
		[ 'paragraph', 'degas-inner', 'first' ],
	],
};
