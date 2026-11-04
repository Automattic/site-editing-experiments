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
	'a grid of pictures': group(
		b(
			'core/group',
			{ layout: { type: 'grid', minimumColumnWidth: '10rem' } },
			[ 'a', 'b', 'c', 'd', 'e' ].map( ( n ) => image( `${ n }.jpg` ) )
		)
	),
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
 * @param {Object} extra More of the grid's layout.
 */
function grid( count, cells, extra = {} ) {
	return group(
		b(
			'core/group',
			{
				layout: {
					type: 'grid',
					...extra,
					...( count && { columnCount: count } ),
				},
			},
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

	it( 'gives a grid its shapes instead', () => {
		expect( counts( grid( 2, 4 ) ) ).toEqual( [] );
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

describe( 'grid shapes', () => {
	const shapes = ( section ) =>
		arrangements( section )
			.filter( ( l ) => l.key.startsWith( 'ito:grid-' ) )
			.map( ( l ) => [ l.key, l.label ] );
	const shape = ( section, key ) =>
		arrangements( section ).find( ( l ) => l.key === 'ito:grid-' + key )
			.block;
	/**
	 * The grid in a layout of a section made by grid().
	 *
	 * @param {Object} block
	 */
	const gridOf = ( block ) => block.innerBlocks[ 0 ];
	const spanOf = ( cell ) => cell.attributes.style?.layout;

	it( 'offers every number across, a featured cell and a banner', () => {
		expect( shapes( grid( 2, 4 ) ) ).toEqual( [
			[ 'ito:grid-1', '4 × 1 grid' ],
			[ 'ito:grid-3', '2 × 3 grid' ],
			[ 'ito:grid-4', '1 × 4 grid' ],
			[ 'ito:grid-featured-3', 'Featured, 3 across' ],
			[ 'ito:grid-banner-3', 'Banner, then 3 across' ],
		] );
	} );

	it( 'goes up to six across, with a featured cell in three or four', () => {
		// Eight cells, three across now; seven left for a banner fill no rows.
		expect( shapes( grid( 3, 8 ) ).map( ( [ key ] ) => key ) ).toEqual( [
			'ito:grid-1',
			'ito:grid-2',
			'ito:grid-4',
			'ito:grid-5',
			'ito:grid-6',
			'ito:grid-featured-3',
			'ito:grid-featured-4',
		] );
	} );

	it( 'offers a banner only when the rest fill their rows', () => {
		const keys = ( section ) => shapes( section ).map( ( [ key ] ) => key );
		expect( keys( grid( 3, 7 ) ) ).toContain( 'ito:grid-banner-2' );
		expect( keys( grid( 3, 7 ) ) ).toContain( 'ito:grid-banner-3' );
		expect( keys( grid( 3, 7 ) ) ).toContain( 'ito:grid-banner-6' );
		expect( keys( grid( 3, 6 ) ) ).toContain( 'ito:grid-banner-5' );
		expect( keys( grid( 3, 6 ) ) ).not.toContain( 'ito:grid-banner-2' );
	} );

	it( 'changes only the number across, keeping the cells', () => {
		const section = grid( 2, 4 );
		const before = gridOf( section );
		const after = gridOf( shape( section, '3' ) );
		expect( after.attributes ).toEqual( {
			layout: { type: 'grid', columnCount: 3 },
		} );
		expect( after.innerBlocks ).toEqual( before.innerBlocks );
	} );

	it( 'gives a grid that sizes its own columns a set number across, without a minimum width that would allow fewer', () => {
		const section = grid( undefined, 6, { minimumColumnWidth: '12rem' } );
		const keys = shapes( section ).map( ( [ key ] ) => key );
		expect( keys ).toContain( 'ito:grid-2' );
		expect( keys ).toContain( 'ito:grid-3' );
		expect( gridOf( shape( section, '3' ) ).attributes.layout ).toEqual( {
			type: 'grid',
			columnCount: 3,
		} );
	} );

	it( 'takes any cells, alike or not', () => {
		const section = group(
			b( 'core/group', { layout: { type: 'grid', columnCount: 4 } }, [
				group( heading( 'Shop' ) ),
				image( 'a.jpg' ),
				image( 'b.jpg' ),
				image( 'c.jpg' ),
			] )
		);
		expect( shapes( section ).length ).toBeGreaterThan( 0 );
	} );

	it( 'makes the first cell two by two when featured, as it was otherwise', () => {
		const section = grid( 2, 5 );
		const cells = gridOf( shape( section, 'featured-3' ) ).innerBlocks;
		expect(
			gridOf( shape( section, 'featured-3' ) ).attributes.layout
		).toEqual( { type: 'grid', columnCount: 3 } );
		expect( spanOf( cells[ 0 ] ) ).toEqual( { columnSpan: 2, rowSpan: 2 } );
		expect( cells[ 0 ].innerBlocks ).toBe(
			gridOf( section ).innerBlocks[ 0 ].innerBlocks
		);
		expect( cells.slice( 1 ).map( spanOf ) ).toEqual( [
			undefined,
			undefined,
			undefined,
			undefined,
		] );
	} );

	it( 'makes the first cell as wide as the grid for a banner', () => {
		const cells = gridOf( shape( grid( 2, 5 ), 'banner-4' ) ).innerBlocks;
		expect( spanOf( cells[ 0 ] ) ).toEqual( { columnSpan: 4 } );
	} );

	it( 'keeps the rest of a cell’s style when it spans', () => {
		const section = group(
			b( 'core/group', { layout: { type: 'grid', columnCount: 2 } }, [
				b( 'core/group', { style: { border: { radius: '8px' } } }, [
					para( 'One' ),
				] ),
				group( para( 'Two' ) ),
				group( para( 'Three' ) ),
			] )
		);
		const [ first ] = gridOf( shape( section, 'featured-3' ) ).innerBlocks;
		expect( first.attributes.style ).toEqual( {
			border: { radius: '8px' },
			layout: { columnSpan: 2, rowSpan: 2 },
		} );
	} );

	it( 'puts a content block that spans in a group, leaving the block as it was', () => {
		const pic = image( 'a.jpg' );
		const section = group(
			b( 'core/group', { layout: { type: 'grid', columnCount: 3 } }, [
				pic,
				image( 'b.jpg' ),
				image( 'c.jpg' ),
			] )
		);
		const [ first ] = gridOf( shape( section, 'banner-2' ) ).innerBlocks;
		expect( first.name ).toBe( 'core/group' );
		expect( spanOf( first ) ).toEqual( { columnSpan: 2 } );
		expect( first.innerBlocks ).toEqual( [ pic ] );
	} );

	it( 'takes away the spans of an earlier shape', () => {
		const featured = shape( grid( 2, 5 ), 'featured-3' );
		const plain = shape( featured, '5' );
		expect( gridOf( plain ).innerBlocks.map( spanOf ) ).toEqual( [
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
		] );
	} );

	it( 'does not offer the shape the grid already has', () => {
		const featured = shape( grid( 2, 5 ), 'featured-3' );
		const keys = shapes( featured ).map( ( [ key ] ) => key );
		expect( keys ).not.toContain( 'ito:grid-featured-3' );
		expect( keys ).toContain( 'ito:grid-3' );
	} );
} );

describe( 'Stacked, Centred and Card', () => {
	const keys = ( section ) => arrangements( section ).map( ( l ) => l.key );
	const paras = ( count ) =>
		Array.from( { length: count }, ( _, i ) => para( `Para ${ i + 1 }` ) );
	const flexRow = ( ...inner ) =>
		b( 'core/group', { layout: { type: 'flex' } }, inner );

	it( 'offers Stacked only for what is not already one stack', () => {
		expect( keys( SECTIONS[ 'text only' ] ) ).not.toContain(
			'ito:stacked'
		);
		for ( const name of [
			'a cover hero',
			'text beside an image',
			'a media & text section',
			'a grid of four',
			'three services',
		] ) {
			expect( keys( SECTIONS[ name ] ) ).toContain( 'ito:stacked' );
		}
		expect(
			keys( group( flexRow( para( 'A' ), para( 'B' ) ) ) )
		).toContain( 'ito:stacked' );
	} );

	it( 'does not count one filled column or a vertical stack as side by side', () => {
		const oneColumn = group(
			columns( [ heading( 'A' ), para( 'B' ) ], [] )
		);
		const vertical = group(
			b(
				'core/group',
				{ layout: { type: 'flex', orientation: 'vertical' } },
				[ heading( 'A' ), para( 'B' ) ]
			)
		);
		expect( keys( oneColumn ) ).not.toContain( 'ito:stacked' );
		expect( keys( vertical ) ).not.toContain( 'ito:stacked' );
	} );

	it( 'offers Centred for six items or fewer with nothing side by side', () => {
		expect( keys( group( ...paras( 6 ) ) ) ).toContain( 'ito:centred' );
		expect( keys( group( ...paras( 7 ) ) ) ).not.toContain( 'ito:centred' );
		expect( keys( SECTIONS[ 'a cover hero' ] ) ).toContain( 'ito:centred' );
		for ( const name of [
			'text beside an image',
			'a media & text section',
			'a grid of four',
		] ) {
			expect( keys( SECTIONS[ name ] ) ).not.toContain( 'ito:centred' );
		}
	} );

	it( 'offers Card for six items or fewer with no background or cover', () => {
		expect( keys( group( ...paras( 6 ) ) ) ).toContain( 'ito:card' );
		expect( keys( group( ...paras( 7 ) ) ) ).not.toContain( 'ito:card' );
		expect( keys( SECTIONS[ 'text beside an image' ] ) ).toContain(
			'ito:card'
		);
		expect( keys( SECTIONS[ 'a cover hero' ] ) ).not.toContain(
			'ito:card'
		);
		expect(
			keys( group( b( 'core/cover', { url: 'a.jpg' }, paras( 1 ) ) ) )
		).not.toContain( 'ito:card' );
		for ( const attributes of [
			{ backgroundColor: 'accent-1' },
			{ gradient: 'sunset' },
			{ style: { color: { background: '#eee' } } },
			{ style: { color: { gradient: 'linear-gradient(#fff,#000)' } } },
			{ style: { background: { backgroundImage: { url: 'a.jpg' } } } },
		] ) {
			expect(
				keys( b( 'core/group', attributes, paras( 2 ) ) )
			).not.toContain( 'ito:card' );
		}
	} );

	it( 'centres the text through the group, not the blocks in it', () => {
		const section = group( heading( 'A' ), para( 'B' ) );
		const { block } = arrangements( section ).find(
			( l ) => l.key === 'ito:centred'
		);
		expect( block.attributes.className ).toBe( 'has-text-align-center' );
		expect( block.innerBlocks ).toEqual( section.innerBlocks );
	} );

	it( 'falls back to Stacked when nothing else applies', () => {
		const long = group(
			image( 'a.jpg' ),
			...paras( 3 ),
			image( 'b.jpg' ),
			...paras( 3 )
		);
		expect( keys( long ) ).toEqual( [ 'ito:stacked' ] );
	} );
} );
