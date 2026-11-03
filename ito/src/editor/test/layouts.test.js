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
	'three services': services( 3 ),
	'two rows of quotes': quotes(),
	'a grid of four': grid( 2, 4 ),
	'columns on their own': b(
		'core/columns',
		{ align: 'wide' },
		[ 1, 2, 3 ].map( ( i ) => card( `Plain ${ i }` ) )
	),
};

/**
 * A column holding one card: a picture, a heading and a paragraph.
 *
 * @param {string} title
 * @param {Object} extra The column's attributes.
 */
function card( title, extra = {} ) {
	return b( 'core/column', { width: '33.33%', ...extra }, [
		image( `${ title }.jpg` ),
		heading( title, 3 ),
		para( `About ${ title }.` ),
	] );
}

/**
 * A styled section: a heading, then a row of `count` cards.
 *
 * @param {number} count
 */
function services( count ) {
	return b(
		'core/group',
		{
			align: 'full',
			metadata: { name: 'Services', patternName: 'theme/services' },
			style: { color: { background: '#eee' } },
		},
		[
			heading( 'What we do' ),
			b(
				'core/columns',
				{ align: 'wide', style: { spacing: { blockGap: '2rem' } } },
				Array.from( { length: count }, ( _, i ) =>
					card( `Service ${ i + 1 }`, { style: { border: '1px' } } )
				)
			),
		]
	);
}

/** Two rows of three quotes. */
function quotes() {
	const row = ( from ) =>
		b(
			'core/columns',
			{ className: 'is-quotes' },
			[ 0, 1, 2 ].map( ( i ) =>
				b( 'core/column', {}, [
					b( 'core/quote', {}, [ para( `Quote ${ from + i }` ) ] ),
				] )
			)
		);
	return group( heading( 'They said' ), row( 1 ), row( 4 ) );
}

/**
 * A grid group of `cells` alike groups, `count` across.
 *
 * @param {number} count
 * @param {number} cells
 */
function grid( count, cells ) {
	return group(
		b(
			'core/group',
			{ layout: { type: 'grid', columnCount: count } },
			Array.from( { length: cells }, ( _, i ) =>
				group( heading( `Place ${ i + 1 }`, 3 ), para( 'Address' ) )
			)
		)
	);
}

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

describe( 'column counts', () => {
	const counts = ( section ) =>
		arrangements( section )
			.map( ( l ) => l.key )
			.filter( ( k ) => k.startsWith( 'ito:columns-' ) );
	const layout = ( section, n ) =>
		arrangements( section ).find( ( l ) => l.key === `ito:columns-${ n }` );
	/**
	 * The rows of columns in a services section's layout.
	 *
	 * @param {Object} l A layout.
	 */
	const rows = ( l ) => l.block.innerBlocks.slice( 1 );
	const isEmptyColumn = ( x ) =>
		x.name === 'core/column' && ! x.innerBlocks.length;

	it( 'offers one fewer and one more column', () => {
		expect( counts( services( 3 ) ) ).toEqual( [
			'ito:columns-2',
			'ito:columns-4',
		] );
		expect( counts( services( 4 ) ) ).toEqual( [
			'ito:columns-3',
			'ito:columns-5',
		] );
		expect( counts( services( 2 ) ) ).toEqual( [
			'ito:columns-1',
			'ito:columns-3',
		] );
	} );

	it.each( Object.entries( SECTIONS ) )(
		'gives each layout for %s a name of its own',
		( _, section ) => {
			const labels = arrangements( section ).map( ( l ) =>
				l.label.toLowerCase().replace( 'two', '2' )
			);
			expect( new Set( labels ).size ).toBe( labels.length );
		}
	);

	it( 'never goes past six columns', () => {
		expect( counts( services( 6 ) ) ).toEqual( [ 'ito:columns-5' ] );
	} );

	it( 'labels each layout by its number of columns', () => {
		expect( layout( services( 3 ), 4 ).label ).toBe( '4 columns' );
		expect( layout( services( 2 ), 1 ).label ).toBe( '1 column' );
	} );

	it( 'leaves out columns that are not alike', () => {
		expect( counts( SECTIONS[ 'text beside an image' ] ) ).toEqual( [] );
		expect( counts( SECTIONS[ 'a hand-built mix' ] ) ).toEqual( [] );
	} );

	it( 'wraps the cards into rows, filling the last with empty columns', () => {
		const two = rows( layout( services( 3 ), 2 ) );
		expect( two.map( ( r ) => r.innerBlocks.length ) ).toEqual( [ 2, 2 ] );
		expect( isEmptyColumn( two[ 1 ].innerBlocks[ 1 ] ) ).toBe( true );

		const four = rows( layout( services( 3 ), 4 ) );
		expect( four ).toHaveLength( 1 );
		expect( four[ 0 ].innerBlocks ).toHaveLength( 4 );
		expect( isEmptyColumn( four[ 0 ].innerBlocks[ 3 ] ) ).toBe( true );
	} );

	it( 'keeps the cards and the rows as the pattern styled them', () => {
		const section = services( 3 );
		const [ before ] = section.innerBlocks.slice( 1 );
		const [ first, second ] = rows( layout( section, 2 ) );
		for ( const row of [ first, second ] ) {
			expect( row.name ).toBe( 'core/columns' );
			expect( row.attributes ).toEqual( before.attributes );
		}
		// Each card is the same column, without a width meant for three.
		const { width, ...kept } = before.innerBlocks[ 0 ].attributes;
		expect( width ).toBe( '33.33%' );
		expect( first.innerBlocks[ 0 ] ).toEqual( {
			...before.innerBlocks[ 0 ],
			attributes: kept,
		} );
		expect( second.innerBlocks[ 0 ].innerBlocks ).toBe(
			before.innerBlocks[ 2 ].innerBlocks
		);
	} );

	it( 'keeps the rest of the section, but not as the pattern it came from', () => {
		const section = services( 3 );
		const { block } = layout( section, 4 );
		expect( block.name ).toBe( 'core/group' );
		expect( block.attributes ).toEqual( {
			align: 'full',
			metadata: { name: 'Services' },
			style: { color: { background: '#eee' } },
		} );
		expect( block.innerBlocks[ 0 ] ).toBe( section.innerBlocks[ 0 ] );
	} );

	it( 'treats rows of alike cards as one set', () => {
		const section = quotes();
		expect( counts( section ) ).toEqual( [
			'ito:columns-2',
			'ito:columns-4',
		] );
		const two = layout( section, 2 ).block.innerBlocks.slice( 1 );
		expect( two.map( ( r ) => r.innerBlocks.length ) ).toEqual( [
			2, 2, 2,
		] );
		expect( two.map( ( r ) => r.attributes.className ) ).toEqual( [
			'is-quotes',
			'is-quotes',
			'is-quotes',
		] );
		const four = layout( section, 4 ).block.innerBlocks.slice( 1 );
		expect( four.map( ( r ) => r.innerBlocks.length ) ).toEqual( [ 4, 4 ] );
		expect( four[ 1 ].innerBlocks.filter( isEmptyColumn ) ).toHaveLength(
			2
		);
	} );

	it( 'counts a row it filled with empty columns at its full width', () => {
		// After 3 cards went to 4 columns, the choice is 3 or 5.
		const wrapped = layout( services( 3 ), 4 ).block;
		expect( counts( wrapped ) ).toEqual( [
			'ito:columns-3',
			'ito:columns-5',
		] );
		const back = rows( layout( wrapped, 3 ) );
		expect( back ).toHaveLength( 1 );
		expect( back[ 0 ].innerBlocks.filter( isEmptyColumn ) ).toHaveLength(
			0
		);
	} );

	it( "changes only a grid's column count", () => {
		const section = grid( 2, 4 );
		expect( counts( section ) ).toEqual( [
			'ito:columns-1',
			'ito:columns-3',
		] );
		const before = section.innerBlocks[ 0 ];
		const after = layout( section, 3 ).block.innerBlocks[ 0 ];
		expect( after ).toEqual( {
			...before,
			attributes: {
				layout: { type: 'grid', columnCount: 3 },
			},
		} );
		expect( after.innerBlocks ).toBe( before.innerBlocks );
	} );

	it( 'leaves out a grid that sizes its own columns', () => {
		const section = grid( undefined, 4 );
		expect( counts( section ) ).toEqual( [] );
	} );

	it( 'wraps rows in a group when the section is the columns', () => {
		const section = SECTIONS[ 'columns on their own' ];
		const one = layout( section, 4 ).block;
		expect( one.name ).toBe( 'core/columns' );
		expect( one.innerBlocks ).toHaveLength( 4 );
		const two = layout( section, 2 ).block;
		expect( two.name ).toBe( 'core/group' );
		expect( two.attributes ).toEqual( { align: 'wide' } );
		expect( two.innerBlocks.map( ( r ) => r.name ) ).toEqual( [
			'core/columns',
			'core/columns',
		] );
	} );
} );
