/**
 * Background video for a section, as in Squarespace's Edit section →
 * Background → Video.
 *
 * Core's Group can't play a video behind its content, but Cover can, so a
 * standard section becomes a Cover when it gets a video and goes back to a
 * Group when the video is removed. Everything the section's controls set
 * (colour theme, divider, anchor, spacing, layout) comes across.
 */
import { cloneBlock, createBlock } from '@wordpress/blocks';

/**
 * Whether a block is a section showing a background video.
 *
 * @param {Object} block Block.
 * @return {boolean} Whether it has a video background.
 */
export function hasVideoBackground( block ) {
	return (
		block?.name === 'core/cover' &&
		block.attributes.backgroundType === 'video' &&
		!! block.attributes.url
	);
}

// The parts of `style` that mean the same on both blocks. Background images,
// gradients and min-height are handled separately or don't carry over.
function sharedStyle( style = {} ) {
	const { background, dimensions, color, ...rest } = style;
	const next = { ...rest };
	if ( color ) {
		const { gradient, ...colors } = color;
		if ( Object.keys( colors ).length ) {
			next.color = colors;
		}
	}
	return Object.keys( next ).length ? next : undefined;
}

function pick( attributes, keys ) {
	return Object.fromEntries(
		keys
			.filter( ( key ) => attributes[ key ] !== undefined )
			.map( ( key ) => [ key, attributes[ key ] ] )
	);
}

const SHARED = [
	'className',
	'anchor',
	'align',
	'layout',
	'tagName',
	'metadata',
	'backgroundColor',
	'textColor',
];

/**
 * Gives a section a background video.
 *
 * @param {Object}  block            A section block (Group or Cover).
 * @param {Object}  media            The chosen video: { url, id }.
 * @param {Object}  options
 * @param {string}  options.overlay  Overlay colour (the section's background), if any.
 * @param {number}  options.dimRatio Overlay opacity, 0–100.
 * @param {boolean} options.isDark   Whether the overlay is dark.
 * @return {Object} A Cover block, or the Cover's new attributes when the
 *                  section was already a Cover.
 */
export function withVideo( block, media, { overlay, dimRatio = 40, isDark } ) {
	const video = {
		url: media.url,
		id: media.id,
		backgroundType: 'video',
	};
	if ( block.name === 'core/cover' ) {
		return { attributes: video };
	}

	const attributes = block.attributes;
	const minHeight = attributes.style?.dimensions?.minHeight;
	const match = /^([\d.]+)(px|vh|vw|em|rem|%)$/.exec( minHeight || '' );

	return {
		block: createBlock(
			'core/cover',
			{
				...pick( attributes, SHARED ),
				align: attributes.align || 'full',
				style: sharedStyle( attributes.style ),
				...video,
				dimRatio,
				...( overlay
					? { customOverlayColor: overlay, isUserOverlayColor: true }
					: {} ),
				isDark: !! isDark,
				...( match
					? {
							minHeight: Number( match[ 1 ] ),
							minHeightUnit: match[ 2 ],
						}
					: {} ),
			},
			block.innerBlocks.map( ( inner ) => cloneBlock( inner ) )
		),
	};
}

/**
 * Takes a section's background video away, turning the Cover back into a
 * standard (Group) section.
 *
 * @param {Object} block A Cover section with a video.
 * @return {Object} A Group block.
 */
export function withoutVideo( block ) {
	const attributes = block.attributes;
	const style = sharedStyle( attributes.style ) || {};
	if ( attributes.minHeight ) {
		style.dimensions = {
			minHeight: `${ attributes.minHeight }${
				attributes.minHeightUnit || 'px'
			}`,
		};
	}
	return createBlock(
		'core/group',
		{
			...pick( attributes, SHARED ),
			align: attributes.align || 'full',
			layout: attributes.layout || { type: 'constrained' },
			...( Object.keys( style ).length ? { style } : {} ),
		},
		block.innerBlocks.map( ( inner ) => cloneBlock( inner ) )
	);
}
