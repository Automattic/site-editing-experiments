/**
 * Matching patterns by their content blocks, and moving a section's content
 * into another pattern.
 */
import { describe, expect, it } from 'vitest';

import { findSwaps, isCandidate, signature, transferContent } from '../swap';

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
const image = ( url, alt = '', id ) =>
	b( 'core/image', { url, alt, id, sizeSlug: 'large' } );
const buttons = ( ...inner ) => b( 'core/buttons', {}, inner );
const button = ( text, url ) => b( 'core/button', { text, url } );

/**
 * Every block in a tree, depth first.
 *
 * @param {Object} block
 */
const flat = ( block ) => [ block, ...block.innerBlocks.flatMap( flat ) ];
const find = ( block, name ) =>
	flat( block ).filter( ( x ) => x.name === name );

describe( 'signature', () => {
	it( 'ignores groups, columns and button rows around the content', () => {
		const stacked = group(
			heading( 'A' ),
			para( 'B' ),
			buttons( button( 'Go' ) )
		);
		const split = group(
			columns(
				[ heading( 'A' ) ],
				[ para( 'B' ), buttons( button( 'Go' ) ) ]
			)
		);
		expect( signature( stacked ) ).toEqual( [
			'core/heading',
			'core/paragraph',
			'core/button',
		] );
		expect( signature( split ) ).toEqual( signature( stacked ) );
	} );

	it( 'keeps the order of the content', () => {
		expect( signature( group( heading( 'A' ), para( 'B' ) ) ) ).not.toEqual(
			signature( group( para( 'B' ), heading( 'A' ) ) )
		);
	} );

	it( 'counts every item, so three cards are not four', () => {
		const card = ( n ) => [ heading( `Card ${ n }`, 3 ), para( 'Text' ) ];
		const three = group( columns( card( 1 ), card( 2 ), card( 3 ) ) );
		const four = group(
			columns( card( 1 ), card( 2 ), card( 3 ), card( 4 ) )
		);
		expect( signature( three ) ).not.toEqual( signature( four ) );
	} );

	it( 'treats a cover or media & text picture as an image, then reads what is inside', () => {
		const cover = b(
			'core/cover',
			{ url: 'a.jpg', alt: 'A', dimRatio: 50 },
			[ heading( 'A' ) ]
		);
		const mediaText = b(
			'core/media-text',
			{ mediaUrl: 'a.jpg', mediaType: 'image' },
			[ heading( 'A' ) ]
		);
		const split = group(
			columns( [ image( 'a.jpg' ) ], [ heading( 'A' ) ] )
		);
		expect( signature( cover ) ).toEqual( [ 'image', 'core/heading' ] );
		expect( signature( mediaText ) ).toEqual( signature( split ) );
		expect( signature( cover ) ).toEqual( signature( split ) );
	} );

	it( 'treats a cover without a picture as a wrapper', () => {
		const plain = b(
			'core/cover',
			{ overlayColor: 'contrast', dimRatio: 100 },
			[ heading( 'A' ) ]
		);
		expect( signature( plain ) ).toEqual( [ 'core/heading' ] );
	} );

	it( 'ignores spacers and separators', () => {
		const spaced = group(
			heading( 'A' ),
			b( 'core/spacer', { height: '40px' } ),
			b( 'core/separator' ),
			para( 'B' )
		);
		expect( signature( spaced ) ).toEqual( [
			'core/heading',
			'core/paragraph',
		] );
	} );

	it( 'reads a list as one item, however many entries it has', () => {
		const list = ( n ) =>
			b(
				'core/list',
				{},
				Array.from( { length: n }, () =>
					b( 'core/list-item', { content: 'x' } )
				)
			);
		expect( signature( group( list( 2 ) ) ) ).toEqual( [ 'core/list' ] );
		expect( signature( group( list( 5 ) ) ) ).toEqual(
			signature( group( list( 2 ) ) )
		);
	} );
} );

describe( 'isCandidate', () => {
	it( 'accepts patterns of ordinary content blocks', () => {
		expect( isCandidate( group( heading( 'A' ), para( 'B' ) ) ) ).toBe(
			true
		);
	} );

	it.each( [
		'core/query',
		'core/post-title',
		'core/template-part',
		'core/navigation',
		'core/block',
		'core/site-title',
	] )( 'rejects a pattern with %s in it', ( name ) => {
		expect( isCandidate( group( heading( 'A' ), b( name ) ) ) ).toBe(
			false
		);
	} );

	it( 'rejects a pattern with no content', () => {
		expect( isCandidate( group( b( 'core/spacer' ) ) ) ).toBe( false );
	} );
} );

describe( 'transferContent', () => {
	const section = group(
		heading( '<strong>Hand</strong>-thrown pots', 1 ),
		para( 'Made in <em>Northfield</em>.' ),
		buttons( button( 'Visit the shop', '/shop' ) ),
		image( 'bowls.jpg', 'Bowls on a shelf', 12 )
	);
	const target = b(
		'core/group',
		{
			align: 'full',
			backgroundColor: 'accent-1',
			metadata: { patternName: 'theme/split' },
		},
		[
			columns(
				[
					heading( 'Pattern heading', 2, {
						fontSize: 'x-large',
						textAlign: 'left',
					} ),
					para( 'Pattern text', { fontSize: 'large' } ),
					buttons(
						b( 'core/button', {
							text: 'Pattern button',
							url: '#',
							className: 'is-style-outline',
						} )
					),
				],
				[
					b( 'core/image', {
						url: 'pattern.jpg',
						alt: '',
						sizeSlug: 'full',
						aspectRatio: '4/3',
					} ),
				]
			),
		]
	);
	const result = transferContent( section, target );

	it( 'takes its structure and styling from the new pattern', () => {
		expect( signature( result ) ).toEqual( signature( target ) );
		expect( result.attributes ).toMatchObject( {
			align: 'full',
			backgroundColor: 'accent-1',
		} );
		expect( find( result, 'core/columns' ) ).toHaveLength( 1 );
		expect( find( result, 'core/heading' )[ 0 ].attributes ).toMatchObject(
			{ fontSize: 'x-large', textAlign: 'left' }
		);
		expect(
			find( result, 'core/paragraph' )[ 0 ].attributes.fontSize
		).toBe( 'large' );
		expect( find( result, 'core/button' )[ 0 ].attributes.className ).toBe(
			'is-style-outline'
		);
		expect( find( result, 'core/image' )[ 0 ].attributes ).toMatchObject( {
			sizeSlug: 'full',
			aspectRatio: '4/3',
		} );
	} );

	it( 'keeps the words, formatting and links from the section', () => {
		expect( find( result, 'core/heading' )[ 0 ].attributes.content ).toBe(
			'<strong>Hand</strong>-thrown pots'
		);
		expect( find( result, 'core/paragraph' )[ 0 ].attributes.content ).toBe(
			'Made in <em>Northfield</em>.'
		);
		expect( find( result, 'core/button' )[ 0 ].attributes ).toMatchObject( {
			text: 'Visit the shop',
			url: '/shop',
		} );
	} );

	it( 'keeps the pictures from the section', () => {
		expect( find( result, 'core/image' )[ 0 ].attributes ).toMatchObject( {
			url: 'bowls.jpg',
			alt: 'Bowls on a shelf',
			id: 12,
		} );
	} );

	it( 'keeps the heading level from the section', () => {
		expect( find( result, 'core/heading' )[ 0 ].attributes.level ).toBe(
			1
		);
	} );

	it( 'does not change the blocks it was given', () => {
		expect( find( target, 'core/heading' )[ 0 ].attributes.content ).toBe(
			'Pattern heading'
		);
		expect(
			find( section, 'core/heading' )[ 0 ].attributes.fontSize
		).toBeUndefined();
	} );

	it( 'moves an image into a cover, and a cover picture into an image', () => {
		const cover = b(
			'core/cover',
			{ url: 'pattern.jpg', alt: '', id: 1, dimRatio: 40 },
			[ heading( 'Pattern' ) ]
		);
		const split = group(
			columns(
				[ image( 'bowls.jpg', 'Bowls', 12 ) ],
				[ heading( 'Pots', 1 ) ]
			)
		);

		const intoCover = transferContent( split, cover );
		expect( intoCover.attributes ).toMatchObject( {
			url: 'bowls.jpg',
			alt: 'Bowls',
			id: 12,
			dimRatio: 40,
		} );
		expect( intoCover.innerBlocks[ 0 ].attributes ).toMatchObject( {
			content: 'Pots',
			level: 1,
		} );

		const backAgain = transferContent( intoCover, split );
		expect( find( backAgain, 'core/image' )[ 0 ].attributes ).toMatchObject(
			{ url: 'bowls.jpg', alt: 'Bowls', id: 12 }
		);
	} );

	it( 'moves an image into media & text', () => {
		const mediaText = b(
			'core/media-text',
			{
				mediaUrl: 'pattern.jpg',
				mediaType: 'image',
				mediaPosition: 'right',
			},
			[ heading( 'Pattern' ) ]
		);
		const result2 = transferContent(
			group( image( 'bowls.jpg', 'Bowls', 12 ), heading( 'Pots' ) ),
			mediaText
		);
		expect( result2.attributes ).toMatchObject( {
			mediaUrl: 'bowls.jpg',
			mediaAlt: 'Bowls',
			mediaId: 12,
			mediaType: 'image',
			mediaPosition: 'right',
		} );
	} );

	it( 'leaves a picture empty when the section has an empty image', () => {
		const cover = b( 'core/cover', { url: 'pattern.jpg', id: 1 }, [
			heading( 'Pattern' ),
		] );
		const empty = group( b( 'core/image', {} ), heading( 'Pots' ) );
		expect(
			transferContent( empty, cover ).attributes.url
		).toBeUndefined();
	} );

	it( 'keeps every entry of a list', () => {
		const items = [ 'One', 'Two', 'Three' ].map( ( content ) =>
			b( 'core/list-item', { content } )
		);
		const mine = group( b( 'core/list', {}, items ) );
		const theirs = group(
			columns( [
				b( 'core/list', { className: 'is-style-checkmark-list' }, [
					b( 'core/list-item', { content: 'Only' } ),
				] ),
			] )
		);
		const list = find( transferContent( mine, theirs ), 'core/list' )[ 0 ];
		expect( list.attributes.className ).toBe( 'is-style-checkmark-list' );
		expect( list.innerBlocks.map( ( x ) => x.attributes.content ) ).toEqual(
			[ 'One', 'Two', 'Three' ]
		);
	} );
} );

describe( 'findSwaps', () => {
	const pattern = ( name, blocks ) => ( { name, title: name, blocks } );
	const section = b(
		'core/group',
		{ metadata: { patternName: 'theme/stacked' } },
		[ heading( 'A' ), para( 'B' ) ]
	);
	const patterns = [
		pattern( 'theme/stacked', [ group( heading( 'x' ), para( 'y' ) ) ] ),
		pattern( 'theme/split', [
			group( columns( [ heading( 'x' ) ], [ para( 'y' ) ] ) ),
		] ),
		pattern( 'theme/reversed', [ group( para( 'y' ), heading( 'x' ) ) ] ),
		pattern( 'theme/two-roots', [ heading( 'x' ), para( 'y' ) ] ),
		pattern( 'theme/posts', [
			group( heading( 'x' ), para( 'y' ), b( 'core/query' ) ),
		] ),
	];

	it( 'offers only other single-section patterns with the same content blocks', () => {
		expect( findSwaps( section, patterns ).map( ( p ) => p.name ) ).toEqual(
			[ 'theme/split' ]
		);
	} );

	it( 'offers the original pattern back once the section has been swapped', () => {
		const swapped = {
			...section,
			attributes: { metadata: { patternName: 'theme/split' } },
		};
		expect( findSwaps( swapped, patterns ).map( ( p ) => p.name ) ).toEqual(
			[ 'theme/stacked' ]
		);
	} );

	it( 'offers nothing for a section no pattern matches', () => {
		expect(
			findSwaps(
				group(
					heading( 'A' ),
					image( 'a.jpg' ),
					image( 'b.jpg' ),
					image( 'c.jpg' )
				),
				patterns
			)
		).toEqual( [] );
	} );
} );
