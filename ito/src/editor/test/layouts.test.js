/**
 * Generated layouts: the section's own content blocks in new layout blocks.
 * Whatever the layout, no content is added, removed or changed.
 */
import { describe, expect, it } from 'vitest';

import { arrangements } from '../layouts';

const b = ( name, attributes = {}, innerBlocks = [] ) => ( {
	name,
	attributes,
	innerBlocks,
} );
const group = ( ...inner ) =>
	b( 'core/group', { layout: { type: 'constrained' } }, inner );
const columns = ( ...cols ) =>
	b(
		'core/columns',
		{},
		cols.map( ( inner ) => b( 'core/column', {}, inner ) )
	);
const heading = ( content, level = 2, extra = {} ) =>
	b( 'core/heading', { content, level, ...extra } );
const para = ( content, extra = {} ) =>
	b( 'core/paragraph', { content, ...extra } );
const image = ( url, extra = {} ) =>
	b( 'core/image', { url, alt: `Alt ${ url }`, id: 7, ...extra } );
const buttons = ( ...inner ) => b( 'core/buttons', {}, inner );
const button = ( text, url ) => b( 'core/button', { text, url } );
const spacer = () => b( 'core/spacer', { height: '40px' } );

/** Blocks that only lay out others, which a layout may add or remove. */
const LAYOUT = [
	'core/group',
	'core/columns',
	'core/column',
	'core/buttons',
	'core/spacer',
	'core/separator',
];

/**
 * Everything in a section that is content, independent of the layout: each
 * picture (wherever it's shown), and every other content block whole, with
 * all its attributes and inner blocks.
 *
 * @param {Object} block
 * @return {string[]} One sorted entry per item of content.
 */
function contentOf( block ) {
	const items = [];
	const strip = ( x ) => ( {
		name: x.name,
		attributes: x.attributes,
		innerBlocks: ( x.innerBlocks || [] ).map( strip ),
	} );
	const walk = ( x ) => {
		const a = x.attributes || {};
		if ( LAYOUT.includes( x.name ) ) {
			x.innerBlocks.forEach( walk );
		} else if ( x.name === 'core/cover' ) {
			if ( a.url ) {
				items.push( { picture: [ a.url, a.alt, a.id ] } );
			}
			x.innerBlocks.forEach( walk );
		} else if ( x.name === 'core/media-text' ) {
			if ( a.mediaUrl ) {
				items.push( {
					picture: [ a.mediaUrl, a.mediaAlt, a.mediaId ],
				} );
			}
			x.innerBlocks.forEach( walk );
		} else if ( x.name === 'core/image' ) {
			items.push( { picture: [ a.url, a.alt, a.id ] } );
			// An image's caption and link are content too.
			if ( a.caption || a.href ) {
				items.push( { image: [ a.caption, a.href, a.linkTarget ] } );
			}
		} else {
			items.push( strip( x ) );
		}
	};
	walk( block );
	return items.map( ( i ) => JSON.stringify( i ) ).sort();
}

const SECTIONS = {
	'a cover hero': b(
		'core/cover',
		{ url: 'hero.jpg', alt: 'Hero', id: 1, dimRatio: 50 },
		[
			heading( 'Welcome', 1 ),
			para( 'A <strong>short</strong> intro.' ),
			buttons( button( 'Start', '/start' ) ),
		]
	),
	'text beside an image': group(
		columns(
			[ heading( 'About' ), para( 'Who we are.' ) ],
			[ image( 'about.jpg' ) ]
		)
	),
	'a media & text section': b(
		'core/media-text',
		{
			mediaUrl: 'side.jpg',
			mediaAlt: 'Side',
			mediaId: 3,
			mediaType: 'image',
		},
		[ heading( 'Side by side', 3 ), para( 'Text.' ) ]
	),
	'a call to action': group(
		spacer(),
		heading( 'Join us' ),
		para( 'It is free.' ),
		buttons( button( 'Sign up', '/join' ), button( 'Learn more', '/more' ) )
	),
	'text only': group(
		heading( 'Story' ),
		para( 'One.' ),
		para( 'Two.' ),
		para( 'Three.' )
	),
	'a quote': group(
		b( 'core/quote', { citation: 'Someone' }, [ para( 'Wise words.' ) ] ),
		para( 'After.' )
	),
	'a hand-built mix': group(
		heading( 'Menu', 2, { textAlign: 'center' } ),
		image( 'dish.jpg', { caption: 'Our dish', href: '/dish' } ),
		b( 'core/list', { ordered: true }, [
			b( 'core/list-item', { content: 'Soup' } ),
			b( 'core/list-item', { content: 'Bread' } ),
		] ),
		para( 'Open daily.' )
	),
	'two pictures': group(
		heading( 'Gallery' ),
		columns( [ image( 'a.jpg' ) ], [ image( 'b.jpg' ) ] )
	),
	'an empty image': group( heading( 'Soon' ), image( undefined ) ),
	'one paragraph': para( 'Just this.' ),
};

describe( 'arrangements', () => {
	it.each( Object.entries( SECTIONS ) )(
		'offers at least one layout for %s',
		( _, section ) => {
			expect( arrangements( section ).length ).toBeGreaterThan( 0 );
		}
	);

	it.each( Object.entries( SECTIONS ) )(
		'never adds, removes or changes content in %s',
		( _, section ) => {
			const before = contentOf( section );
			for ( const { key, block } of arrangements( section ) ) {
				expect( { key, content: contentOf( block ) } ).toEqual( {
					key,
					content: before,
				} );
			}
		}
	);

	it( 'does not change the blocks it was given', () => {
		for ( const section of Object.values( SECTIONS ) ) {
			const copy = JSON.parse( JSON.stringify( section ) );
			arrangements( section );
			expect( section ).toEqual( copy );
		}
	} );

	it( 'puts a picture behind the text when its caption is empty rich text', () => {
		// In the editor, an empty caption is a rich text object, not ''.
		const empty = { toString: () => '' };
		const section = group(
			heading( 'A' ),
			image( 'a.jpg', { caption: empty } )
		);
		expect( arrangements( section ).map( ( l ) => l.key ) ).toContain(
			'ito:cover'
		);
	} );

	it( 'splits text into two columns under its first heading, not when there is a picture', () => {
		const keys = ( section ) =>
			arrangements( section ).map( ( l ) => l.key );
		expect( keys( SECTIONS[ 'text beside an image' ] ) ).not.toContain(
			'ito:two-columns'
		);
		const layout = arrangements(
			group( para( 'Intro.' ), heading( 'Title' ), para( 'More.' ) )
		).find( ( l ) => l.key === 'ito:two-columns' );
		expect( layout.block.innerBlocks.map( ( x ) => x.name ) ).toEqual( [
			'core/heading',
			'core/columns',
		] );
	} );
} );
