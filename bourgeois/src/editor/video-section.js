/**
 * Background video for a section (Edit section → Background → Video).
 *
 * Core's Group can't play a video behind its content, but Cover can, so a
 * standard section becomes a Cover when it gets a video and goes back to a
 * Group when the video is removed. Everything the section's controls set
 * (colour theme, divider, anchor, spacing, layout, typography, locking)
 * comes across, and what Cover can't hold (a background image, art, an
 * unusual height) is kept aside in the block's metadata and put back when
 * the video goes.
 */
import { cloneBlock, createBlock } from '@wordpress/blocks';

// Where a Group's settings that Cover can't use wait while it has a video.
const STASH = 'sseBeforeVideo';

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
// gradients and min-height are handled separately.
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

// Attributes both blocks have and mean the same by. (Cover has no
// background colour of its own: a Group's becomes the overlay instead.)
const SHARED = [
	'className',
	'anchor',
	'align',
	'layout',
	'tagName',
	'textColor',
	'fontSize',
	'fontFamily',
	'borderColor',
	'lock',
	'ariaLabel',
];

function withoutStash( metadata ) {
	if ( ! metadata?.[ STASH ] ) {
		return metadata;
	}
	const { [ STASH ]: stash, ...rest } = metadata;
	return Object.keys( rest ).length ? rest : undefined;
}

/**
 * The overlay colour for a section with a video: its colour theme's
 * background, as a palette colour so it follows later palette changes.
 *
 * @param {Object} theme A section colour theme, if the section has one.
 * @return {string|undefined} Palette slug.
 */
export function overlayFor( theme ) {
	return theme ? `sse-${ theme.background }` : undefined;
}

/**
 * Gives a section a background video.
 *
 * @param {Object}  block            A section block (Group or Cover).
 * @param {Object}  media            The chosen video: { url, id }.
 * @param {Object}  options
 * @param {string}  options.overlay  Overlay palette slug (the section's background), if any.
 * @param {number}  options.dimRatio Overlay opacity, 0–100.
 * @param {boolean} options.isDark   Whether the overlay is dark.
 * @return {Object} { block } with a new Cover block, or { attributes } with
 *                  the Cover's new attributes when the section was already
 *                  a Cover.
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
	const style = attributes.style || {};
	const minHeight = style.dimensions?.minHeight;
	const match = /^([\d.]+)(px|vh|vw|em|rem|%)$/.exec( minHeight || '' );

	// What Cover can't hold, kept to put back later.
	const stash = {};
	if ( style.background ) {
		stash.background = style.background;
	}
	if ( style.color?.gradient ) {
		stash.gradient = style.color.gradient;
	}
	if ( minHeight && ! match ) {
		stash.minHeight = minHeight;
	}
	if ( attributes.backgroundColor ) {
		stash.backgroundColor = attributes.backgroundColor;
	}
	const metadata = Object.keys( stash ).length
		? { ...( attributes.metadata || {} ), [ STASH ]: stash }
		: attributes.metadata;

	// No colour theme: a plain background colour makes a good overlay.
	const overlayColor = overlay || attributes.backgroundColor;

	return {
		block: createBlock(
			'core/cover',
			{
				...pick( attributes, SHARED ),
				...( metadata ? { metadata } : {} ),
				align: attributes.align || 'full',
				style: sharedStyle( style ),
				...video,
				dimRatio,
				...( overlayColor
					? { overlayColor, isUserOverlayColor: true }
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
 * standard (Group) section with whatever it had before.
 *
 * @param {Object} block A Cover section with a video.
 * @return {Object} A Group block.
 */
export function withoutVideo( block ) {
	const attributes = block.attributes;
	const stash = attributes.metadata?.[ STASH ] || {};
	const style = sharedStyle( attributes.style ) || {};
	if ( stash.minHeight ) {
		style.dimensions = { minHeight: stash.minHeight };
	} else if ( attributes.minHeight ) {
		style.dimensions = {
			minHeight: `${ attributes.minHeight }${
				attributes.minHeightUnit || 'px'
			}`,
		};
	}
	if ( stash.background ) {
		style.background = stash.background;
	}
	if ( stash.gradient ) {
		style.color = { ...( style.color || {} ), gradient: stash.gradient };
	}
	const metadata = withoutStash( attributes.metadata );
	return createBlock(
		'core/group',
		{
			...pick( attributes, SHARED ),
			...( metadata ? { metadata } : {} ),
			...( stash.backgroundColor
				? { backgroundColor: stash.backgroundColor }
				: {} ),
			align: attributes.align || 'full',
			layout: attributes.layout || { type: 'constrained' },
			...( Object.keys( style ).length ? { style } : {} ),
		},
		block.innerBlocks.map( ( inner ) => cloneBlock( inner ) )
	);
}
