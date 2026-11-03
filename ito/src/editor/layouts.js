/**
 * Layouts made from a section's own content, for when no pattern has the
 * same blocks (and alongside the patterns when some do).
 *
 * A section is taken apart into its content, in order: its pictures and its
 * content blocks (headings, paragraphs, buttons, lists, quotes and so on).
 * Each layout puts the same content back in new layout blocks: groups,
 * columns, button rows and covers. The content blocks themselves are used as
 * they are, so nothing is added, removed or changed; only how it's laid out,
 * and sometimes where a picture sits, is new.
 *
 * Works on plain { name, attributes, innerBlocks } objects and never changes
 * the blocks it's given.
 */
import { __, _n, sprintf } from '@wordpress/i18n';

import { pictureOf, roleOf, signature } from './swap';

const b = ( name, attributes = {}, innerBlocks = [] ) => ( {
	name,
	attributes,
	innerBlocks,
} );

/** Room around a section, from the theme's spacing sizes. */
const ROOMY = {
	top: 'var:preset|spacing|60',
	bottom: 'var:preset|spacing|60',
	left: 'var:preset|spacing|50',
	right: 'var:preset|spacing|50',
};

/**
 * A section's content in order. Each part is a picture ({ picture, image }:
 * the picture, and the Image block when it was one) or a content block
 * ({ block }), whole with whatever is inside it.
 *
 * @param {Object}   block
 * @param {Object[]} parts Collects the parts.
 * @return {Object[]} The parts.
 */
function partsOf( block, parts = [] ) {
	const role = roleOf( block );
	const inner = () =>
		( block.innerBlocks || [] ).forEach( ( x ) => partsOf( x, parts ) );
	if ( role === 'wrap' ) {
		inner();
	} else if ( role === 'hold' ) {
		parts.push( { picture: pictureOf( block ) } );
		inner();
	} else if ( role === 'picture' ) {
		parts.push( { picture: pictureOf( block ), image: block } );
	} else if ( role !== 'skip' ) {
		parts.push( { block } );
	}
	return parts;
}

const isPicture = ( part ) => ! part.block;
const headingOf = ( parts ) =>
	parts.find( ( p ) => p.block?.name === 'core/heading' );

/**
 * Whether a picture can be shown as a cover's background: it has an image,
 * and nothing that only an Image block can show (a caption or a link).
 *
 * @param {Object} part
 */
function canCover( part ) {
	const a = part.image?.attributes || {};
	// A caption may be rich text, which is an object even when it's empty.
	return !! part.picture && ! String( a.caption ?? '' ) && ! a.href;
}

/**
 * Parts as blocks: pictures as Image blocks, and buttons next to each other
 * in one row.
 *
 * @param {Object[]} parts
 * @return {Object[]} Blocks.
 */
function place( parts ) {
	const out = [];
	let row = null; // the button row being filled
	for ( const part of parts ) {
		if ( part.block?.name === 'core/button' ) {
			if ( ! row ) {
				row = b( 'core/buttons' );
				out.push( row );
			}
			row.innerBlocks.push( part.block );
			continue;
		}
		row = null;
		out.push(
			part.block ||
				part.image ||
				b( 'core/image', { ...part.picture, sizeSlug: 'large' } )
		);
	}
	return out;
}

const column = ( parts ) =>
	b( 'core/column', { verticalAlignment: 'center' }, place( parts ) );

/**
 * The layouts, each with when it applies and how it's built. `top` gives the
 * attributes every section keeps (its alignment and name).
 */
const RECIPES = [
	{
		key: 'stacked',
		label: () => __( 'Stacked', 'ito' ),
		applies: () => true,
		build: ( parts, top ) =>
			b(
				'core/group',
				{
					...top,
					layout: { type: 'constrained' },
					style: { spacing: { padding: ROOMY } },
				},
				place( parts )
			),
	},
	{
		key: 'centred',
		label: () => __( 'Centred', 'ito' ),
		applies: () => true,
		build: ( parts, top ) =>
			b(
				'core/group',
				{
					...top,
					layout: {
						type: 'flex',
						orientation: 'vertical',
						justifyContent: 'center',
					},
					style: { spacing: { padding: ROOMY } },
				},
				place( parts )
			),
	},
	{
		key: 'picture-moved',
		label: ( parts ) =>
			isPicture( parts[ 0 ] )
				? __( 'Picture last', 'ito' )
				: __( 'Picture first', 'ito' ),
		applies: ( pictures, text ) => pictures.length === 1 && text.length > 0,
		build: ( parts, top, [ picture ], text ) =>
			b(
				'core/group',
				{
					...top,
					layout: { type: 'constrained' },
					style: { spacing: { padding: ROOMY } },
				},
				place(
					isPicture( parts[ 0 ] )
						? [ ...text, picture ]
						: [ picture, ...text ]
				)
			),
	},
	...[ 'left', 'right' ].map( ( side ) => ( {
		key: 'split-' + side,
		label: () =>
			side === 'left'
				? __( 'Picture on the left', 'ito' )
				: __( 'Picture on the right', 'ito' ),
		applies: ( pictures, text ) => pictures.length === 1 && text.length > 0,
		build: ( parts, top, [ picture ], text ) => {
			const cols = [ column( [ picture ] ), column( text ) ];
			return b(
				'core/group',
				{
					...top,
					layout: { type: 'constrained' },
					style: { spacing: { padding: ROOMY } },
				},
				[
					b(
						'core/columns',
						{ align: 'wide', verticalAlignment: 'center' },
						side === 'left' ? cols : cols.reverse()
					),
				]
			);
		},
	} ) ),
	{
		key: 'cover',
		label: () => __( 'Picture behind', 'ito' ),
		applies: ( pictures, text ) =>
			pictures.length === 1 &&
			canCover( pictures[ 0 ] ) &&
			text.length > 0,
		build: ( parts, top, [ picture ], text ) =>
			b(
				'core/cover',
				{
					...top,
					...picture.picture,
					dimRatio: 50,
					minHeight: 480,
					isDark: true,
					layout: { type: 'constrained' },
					style: { spacing: { padding: ROOMY } },
				},
				place( text )
			),
	},
	{
		key: 'two-columns',
		label: () => __( 'Split in two', 'ito' ),
		// For text: the split layouts are for a picture. The first heading goes
		// above both columns.
		applies: ( pictures, text ) =>
			! pictures.length && text.length - !! headingOf( text ) >= 2,
		build: ( parts, top ) => {
			const head = headingOf( parts );
			const rest = parts.filter( ( p ) => p !== head );
			const half = Math.ceil( rest.length / 2 );
			return b(
				'core/group',
				{
					...top,
					layout: { type: 'constrained' },
					style: { spacing: { padding: ROOMY } },
				},
				[
					...place( head ? [ head ] : [] ),
					b( 'core/columns', { align: 'wide' }, [
						b( 'core/column', {}, place( rest.slice( 0, half ) ) ),
						b( 'core/column', {}, place( rest.slice( half ) ) ),
					] ),
				]
			);
		},
	},
	{
		key: 'card',
		label: () => __( 'Card', 'ito' ),
		applies: () => true,
		build: ( parts, top ) =>
			b(
				'core/group',
				{
					...top,
					layout: { type: 'constrained' },
					style: { spacing: { padding: ROOMY } },
				},
				[
					b(
						'core/group',
						{
							layout: { type: 'constrained' },
							style: {
								color: {
									background:
										'color-mix(in srgb, currentColor 6%, transparent)',
								},
								border: { radius: '16px' },
								spacing: {
									padding: {
										top: 'var:preset|spacing|50',
										bottom: 'var:preset|spacing|50',
										left: 'var:preset|spacing|50',
										right: 'var:preset|spacing|50',
									},
								},
							},
						},
						place( parts )
					),
				]
			),
	},
];

/** The most columns a Columns block can have. */
const MOST_COLUMNS = 6;

const kindOf = ( block ) => signature( block ).join( '|' );

const isGrid = ( block ) =>
	block.name === 'core/group' &&
	block.attributes?.layout?.type === 'grid' &&
	Number.isInteger( block.attributes.layout.columnCount );

/**
 * Alike cards among a block's children, if there are some: Columns blocks
 * next to each other whose columns all hold the same kind of content (empty
 * columns aside), or a grid with a set number of columns whose cells all do.
 *
 * @param {Object[]} children
 * @return {?Object} { start, end, count, cells }: where they are among the
 *                   children, how many columns they're in, and the cards.
 */
function cardsIn( children ) {
	for ( let start = 0; start < children.length; start++ ) {
		const first = children[ start ];
		if ( isGrid( first ) ) {
			const kinds = new Set( first.innerBlocks.map( kindOf ) );
			if (
				first.innerBlocks.length >= 2 &&
				kinds.size === 1 &&
				! kinds.has( '' )
			) {
				return {
					start,
					end: start + 1,
					count: first.attributes.layout.columnCount,
					cells: first.innerBlocks,
				};
			}
			continue;
		}
		const cells = [];
		let end = start;
		while ( children[ end ]?.name === 'core/columns' ) {
			const filled = children[ end ].innerBlocks.filter( kindOf );
			const kind = kindOf( cells[ 0 ] || filled[ 0 ] || {} );
			if (
				! filled.length ||
				filled.some( ( c ) => kindOf( c ) !== kind )
			) {
				break;
			}
			cells.push( ...filled );
			end++;
		}
		if ( cells.length >= 2 ) {
			return { start, end, count: first.innerBlocks.length, cells };
		}
	}
	return null;
}

/**
 * Cards in `n` columns: a grid with a new column count, or the cards in
 * rows of `n` like the first row, with the last filled up with empty
 * columns so every column keeps the same width.
 *
 * @param {Object[]} children    The blocks the cards are among.
 * @param {Object}   cards       From cardsIn().
 * @param {number}   cards.start Where they start among the children.
 * @param {Object[]} cards.cells The cards.
 * @param {number}   n
 * @return {Object[]} The blocks in their place.
 */
function inColumns( children, { start, cells }, n ) {
	const first = children[ start ];
	if ( isGrid( first ) ) {
		const { layout } = first.attributes;
		return [
			{
				...first,
				attributes: {
					...first.attributes,
					layout: { ...layout, columnCount: n },
				},
			},
		];
	}
	const rows = [];
	for ( let i = 0; i < cells.length; i += n ) {
		// A width was meant for the old number of columns.
		const row = cells.slice( i, i + n ).map( ( cell ) => {
			const { width, ...attributes } = cell.attributes || {};
			return { ...cell, attributes };
		} );
		while ( row.length < n ) {
			row.push( b( 'core/column' ) );
		}
		rows.push( { ...first, innerBlocks: row } );
	}
	return rows;
}

/**
 * The first alike cards in some blocks, looking at each level before the
 * one inside it, so cards inside the cards are left as they are.
 *
 * @param {Object[]} children
 * @return {?Object} { count, rebuild( n ) }: how many columns they're in, and
 *                   the blocks with them in `n` columns.
 */
function findCards( children ) {
	const cards = cardsIn( children );
	if ( cards ) {
		return {
			count: cards.count,
			rebuild: ( n ) => [
				...children.slice( 0, cards.start ),
				...inColumns( children, cards, n ),
				...children.slice( cards.end ),
			],
		};
	}
	for ( const [ i, child ] of children.entries() ) {
		const found = findCards( child.innerBlocks || [] );
		if ( found ) {
			return {
				count: found.count,
				rebuild: ( n ) =>
					children.map( ( x, j ) =>
						j === i ? { ...x, innerBlocks: found.rebuild( n ) } : x
					),
			};
		}
	}
	return null;
}

/**
 * The section with its cards in one fewer and one more column, styled as it
 * was.
 *
 * @param {Object} section
 * @param {Object} top     The attributes every section keeps.
 * @return {Object[]} { key, label, block } for each.
 */
function columnCounts( section, top ) {
	const found = findCards( [ section ] );
	if ( ! found ) {
		return [];
	}
	return [ found.count - 1, found.count + 1 ]
		.filter( ( n ) => n >= 1 && n <= MOST_COLUMNS )
		.map( ( n ) => {
			const blocks = found.rebuild( n );
			// When the section was the columns, its rows need a group to be one section.
			const block =
				blocks.length === 1
					? blocks[ 0 ]
					: b( 'core/group', {}, blocks );
			const { metadata, ...attributes } = block.attributes;
			return {
				key: 'ito:columns-' + n,
				/* translators: %d: a number of columns. */
				label: sprintf( _n( '%d column', '%d columns', n, 'ito' ), n ),
				block: { ...block, attributes: { ...attributes, ...top } },
			};
		} );
}

/**
 * The layouts a section's content can be shown in.
 *
 * @param {Object} section The section's top block.
 * @return {Object[]} { key, label, block } for each layout that applies.
 */
export function arrangements( section ) {
	const parts = partsOf( section );
	if ( ! parts.length ) {
		return [];
	}
	const pictures = parts.filter( isPicture );
	const text = parts.filter( ( p ) => ! isPicture( p ) );
	// The section keeps its alignment and any name it was given, but it's no
	// longer the pattern it came from.
	const { align, metadata: { patternName, ...metadata } = {} } =
		section.attributes || {};
	const top = {
		...( align && { align } ),
		...( Object.keys( metadata ).length && { metadata } ),
	};
	return [
		...columnCounts( section, top ),
		...RECIPES.filter( ( r ) => r.applies( pictures, text, parts ) ).map(
			( r ) => ( {
				key: 'ito:' + r.key,
				label: r.label( parts ),
				block: r.build( parts, top, pictures, text ),
			} )
		),
	];
}
