/**
 * Section patterns, grouped the way the "Add a Section" picker groups
 * them, plus the user's saved sections.
 */
import { __ } from '@wordpress/i18n';
import { useMemo } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { parse } from '@wordpress/blocks';
import { store as coreStore } from '@wordpress/core-data';

export const OURS = 'sse-';
export const THEME = '__theme';
export const SAVED = '__saved';

// Picker headings, in order. Categories not listed fall under "More".
export const GROUPS = [
	{
		label: __( 'Introduce', 'section-site-editor' ),
		categories: [
			'sse-hero',
			'sse-text',
			'sse-contact',
			'sse-team',
			'sse-faq',
		],
	},
	{
		label: __( 'Sell', 'section-site-editor' ),
		categories: [ 'sse-pricing', 'sse-cta', 'sse-newsletter' ],
	},
	{
		label: __( 'Showcase', 'section-site-editor' ),
		categories: [ 'sse-features', 'sse-image', 'sse-gallery', 'sse-quote' ],
	},
];

const usable = ( p ) =>
	p.inserter !== false &&
	! ( p.block_types || p.blockTypes || [] ).some( ( t ) =>
		t.startsWith( 'core/template-part' )
	);

/**
 * Registered patterns and categories, organised for the picker.
 *
 * @return {Object|null} { categories, patterns, themePatterns, labelToCategory } or null while loading.
 */
export function useSectionPatterns() {
	const { patterns, categories } = useSelect(
		( select ) => ( {
			patterns: select( coreStore ).getBlockPatterns(),
			categories: select( coreStore ).getBlockPatternCategories(),
		} ),
		[]
	);

	return useMemo( () => {
		if ( ! patterns || ! categories ) {
			return null;
		}
		const list = patterns.filter( usable );
		const ours = {};
		categories
			.filter( ( c ) => c.name.startsWith( OURS ) )
			.forEach( ( c ) => {
				ours[ c.name ] = {
					name: c.name,
					label: c.label,
					patterns: list.filter( ( p ) =>
						( p.categories || [] ).includes( c.name )
					),
				};
			} );
		const themePatterns = list.filter(
			( p ) =>
				! ( p.categories || [] ).some( ( c ) => c.startsWith( OURS ) )
		);
		const labelToCategory = {};
		Object.values( ours ).forEach( ( c ) => {
			labelToCategory[ c.label ] = c.name;
		} );
		return {
			categories: ours,
			patterns: list,
			themePatterns,
			labelToCategory,
		};
	}, [ patterns, categories ] );
}

/**
 * The user's saved sections: unsynced patterns created with the heart button
 * (or anywhere else).
 *
 * @return {Object[]|null} Pattern-like objects { name, title, content, id }.
 */
export function useSavedSections() {
	return useSelect( ( select ) => {
		const records = select( coreStore ).getEntityRecords(
			'postType',
			'wp_block',
			{ per_page: 100, context: 'edit' }
		);
		if ( ! records ) {
			return null;
		}
		return records
			.filter( ( r ) => r.wp_pattern_sync_status === 'unsynced' )
			.map( ( r ) => ( {
				name: `saved/${ r.id }`,
				id: r.id,
				title: r.title?.raw || r.title?.rendered || '',
				content: r.content?.raw ?? '',
			} ) );
	}, [] );
}

/**
 * Parsed blocks for a pattern, named so the section tab reads well.
 *
 * @param {Object} pattern Pattern.
 * @param {string} name    Section name to use when the pattern has one block.
 * @return {Object[]} Blocks.
 */
export function blocksForPattern( pattern, name ) {
	const blocks = parse( pattern.content );
	if ( blocks.length === 1 ) {
		const metadata = blocks[ 0 ].attributes.metadata || {};
		blocks[ 0 ].attributes = {
			...blocks[ 0 ].attributes,
			metadata: {
				...metadata,
				name: metadata.name || name || pattern.title,
				...( pattern.name?.startsWith( 'sse/' )
					? { patternName: pattern.name }
					: {} ),
			},
		};
	}
	return blocks;
}

/**
 * Which section category a block came from, for "View layouts".
 *
 * @param {Object} attributes      Block attributes.
 * @param {Object} sectionPatterns From useSectionPatterns().
 * @return {string|null} Category slug.
 */
export function categoryForSection( attributes, sectionPatterns ) {
	if ( ! sectionPatterns ) {
		return null;
	}
	const patternName = attributes?.metadata?.patternName;
	if ( patternName ) {
		const pattern = sectionPatterns.patterns.find(
			( p ) => p.name === patternName
		);
		const category = pattern?.categories?.find( ( c ) =>
			c.startsWith( OURS )
		);
		if ( category ) {
			return category;
		}
	}
	const name = attributes?.metadata?.name;
	return ( name && sectionPatterns.labelToCategory[ name ] ) || null;
}
