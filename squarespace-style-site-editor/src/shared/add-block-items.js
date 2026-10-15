import { __ } from '@wordpress/i18n';
import { createBlock } from '@wordpress/blocks';
import {
	button,
	details,
	heading,
	image,
	list,
	paragraph,
	quote,
	separator,
	video,
} from '@wordpress/icons';

/**
 * What "Add block" offers in a freeform section, with each one's starting
 * size on the 24-column grid.
 *
 * @return {Object[]} Items.
 */
export function getAddBlockItems() {
	return [
		{
			key: 'text',
			label: __( 'Text', 'squarespace-style-site-editor' ),
			icon: paragraph,
			w: 10,
			h: 3,
			create: () => createBlock( 'core/paragraph' ),
		},
		{
			key: 'heading',
			label: __( 'Heading', 'squarespace-style-site-editor' ),
			icon: heading,
			w: 12,
			h: 2,
			create: () => createBlock( 'core/heading', { level: 2 } ),
		},
		{
			key: 'image',
			label: __( 'Image', 'squarespace-style-site-editor' ),
			icon: image,
			w: 8,
			h: 8,
			create: () => createBlock( 'core/image' ),
		},
		{
			key: 'button',
			label: __( 'Button', 'squarespace-style-site-editor' ),
			icon: button,
			w: 6,
			h: 2,
			create: () =>
				createBlock( 'core/buttons', {}, [
					createBlock( 'core/button', {
						text: __(
							'Learn more',
							'squarespace-style-site-editor'
						),
					} ),
				] ),
		},
		{
			key: 'quote',
			label: __( 'Quote', 'squarespace-style-site-editor' ),
			icon: quote,
			w: 12,
			h: 4,
			create: () =>
				createBlock( 'core/quote', {}, [
					createBlock( 'core/paragraph' ),
				] ),
		},
		{
			key: 'list',
			label: __( 'List', 'squarespace-style-site-editor' ),
			icon: list,
			w: 10,
			h: 4,
			create: () =>
				createBlock( 'core/list', {}, [
					createBlock( 'core/list-item' ),
				] ),
		},
		{
			key: 'video',
			label: __( 'Video', 'squarespace-style-site-editor' ),
			icon: video,
			w: 12,
			h: 8,
			create: () => createBlock( 'core/video' ),
		},
		{
			key: 'accordion',
			label: __( 'Accordion', 'squarespace-style-site-editor' ),
			icon: details,
			w: 12,
			h: 3,
			create: () =>
				createBlock(
					'core/details',
					{
						summary: __(
							'A question people ask',
							'squarespace-style-site-editor'
						),
					},
					[ createBlock( 'core/paragraph' ) ]
				),
		},
		{
			key: 'line',
			label: __( 'Line', 'squarespace-style-site-editor' ),
			icon: separator,
			w: 12,
			h: 1,
			create: () => createBlock( 'core/separator' ),
		},
	];
}

const overlaps = ( a, b ) =>
	a.c < b.c + b.w && b.c < a.c + a.w && a.r < b.r + b.h && b.r < a.r + a.h;

/**
 * Finds the first free spot for a w × h item, trying the centre column first,
 * within the section's current rows. Falls back to below everything.
 *
 * @param {Object[]} layouts Existing layouts.
 * @param {number}   w       Width in columns.
 * @param {number}   h       Height in rows.
 * @param {number}   columns Grid columns.
 * @param {number}   rows    Current rows.
 * @return {Object} Layout.
 */
export function findFreeSpot( layouts, w, h, columns, rows ) {
	const width = Math.min( w, columns );
	const centre = Math.floor( ( columns - width ) / 2 ) + 1;
	const candidates = [ centre ];
	for ( let c = 1; c <= columns - width + 1; c++ ) {
		if ( c !== centre ) {
			candidates.push( c );
		}
	}
	for ( let r = 1; r + h - 1 <= rows; r++ ) {
		for ( const c of candidates ) {
			const spot = { c, r, w: width, h };
			if ( ! layouts.some( ( l ) => l && overlaps( spot, l ) ) ) {
				return spot;
			}
		}
	}
	const bottom = layouts.reduce(
		( max, l ) => ( l ? Math.max( max, l.r + l.h - 1 ) : max ),
		0
	);
	return { c: centre, r: bottom + 1, w: width, h };
}
