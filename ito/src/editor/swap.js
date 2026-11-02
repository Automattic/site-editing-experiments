/**
 * Which patterns a section can turn into, and moving its content across.
 *
 * A section's signature is the list of its content blocks in order (headings,
 * paragraphs, pictures, buttons, lists and so on), leaving out the blocks
 * that only arrange them (groups, columns, button rows) and the ones that
 * only add space. Two patterns with the same signature hold the same content
 * in different layouts, so a section can swap to either one: the new
 * pattern's blocks and styling, with the section's words, pictures and links
 * put into its slots in order.
 *
 * Works on plain { name, attributes, innerBlocks } objects and never changes
 * the blocks it's given.
 */

/** Blocks that only arrange what's inside them. */
const WRAPPERS = new Set( [
	'core/group',
	'core/columns',
	'core/column',
	'core/buttons',
] );

/** Blocks that only add space. */
const SPACING = new Set( [ 'core/spacer', 'core/separator' ] );

/** Blocks whose content comes from the site, not the pattern. */
const DYNAMIC =
	/^core\/(post-|query|comment|site-|latest-|template-part|navigation|block$|pattern$|loginout|home-link)/;

/** The attributes that are a block's content; everything else is the pattern's. */
const CONTENT = {
	'core/heading': [ 'content', 'level' ],
	'core/paragraph': [ 'content' ],
	'core/button': [ 'text', 'url', 'linkTarget', 'rel', 'title' ],
	'core/image': [ 'caption', 'href', 'linkDestination', 'linkTarget', 'rel' ],
	'core/list': [ 'ordered', 'start', 'reversed' ],
	'core/quote': [ 'citation' ],
};

/** Blocks that hold a picture as well as other blocks. */
const PICTURE_HOLDERS = new Set( [ 'core/cover', 'core/media-text' ] );

/**
 * The picture in a block, if it's one of the three that hold one.
 *
 * @param {Object} block
 */
function pictureOf( block ) {
	const a = block.attributes || {};
	if ( block.name === 'core/image' || block.name === 'core/cover' ) {
		return a.url ? { url: a.url, alt: a.alt, id: a.id } : null;
	}
	if ( block.name === 'core/media-text' ) {
		return a.mediaUrl && ( a.mediaType || 'image' ) === 'image'
			? { url: a.mediaUrl, alt: a.mediaAlt, id: a.mediaId }
			: null;
	}
	return null;
}

/**
 * A block's attributes with another picture in them.
 *
 * @param {Object} block
 * @param {Object} picture
 */
function withPicture( block, picture ) {
	if ( block.name === 'core/media-text' ) {
		return {
			...block.attributes,
			mediaUrl: picture.url,
			mediaAlt: picture.alt,
			mediaId: picture.id,
			mediaType: 'image',
		};
	}
	return {
		...block.attributes,
		url: picture.url,
		alt: picture.alt,
		id: picture.id,
	};
}

/**
 * What a block is for matching: 'skip' (spacing), 'wrap' (arranges its
 * children), 'hold' (a picture, then its children), 'picture' (an image),
 * 'container' (content with content blocks inside, such as a quote) or
 * 'leaf' (one item of content, whatever's inside it).
 *
 * @param {Object} block
 */
function roleOf( block ) {
	if ( SPACING.has( block.name ) ) {
		return 'skip';
	}
	if ( WRAPPERS.has( block.name ) ) {
		return 'wrap';
	}
	if ( PICTURE_HOLDERS.has( block.name ) ) {
		return pictureOf( block ) ? 'hold' : 'wrap';
	}
	if ( block.name === 'core/image' ) {
		return 'picture';
	}
	if ( block.name === 'core/quote' ) {
		return 'container';
	}
	return 'leaf';
}

/**
 * The slot a block fills in a signature.
 *
 * @param {Object} block
 */
const slotName = ( block ) =>
	[ 'hold', 'picture' ].includes( roleOf( block ) ) ? 'image' : block.name;

/**
 * Every content slot in a section, in order.
 *
 * @param {Object} block
 */
function slotsOf( block ) {
	const role = roleOf( block );
	if ( role === 'skip' ) {
		return [];
	}
	const inner = ( block.innerBlocks || [] ).flatMap( slotsOf );
	if ( role === 'wrap' ) {
		return inner;
	}
	if ( role === 'hold' || role === 'container' ) {
		return [ block, ...inner ];
	}
	return [ block ];
}

/**
 * A section's content blocks in order, with pictures as 'image' however
 * they're shown.
 *
 * @param {Object} block The section's top block.
 * @return {string[]} Block names, and 'image' for pictures.
 */
export function signature( block ) {
	return slotsOf( block ).map( slotName );
}

/**
 * Whether a pattern can be swapped to: it has content, and none of it comes
 * from the site (posts, the site title, menus, template parts).
 *
 * @param {Object} block The pattern's top block.
 * @return {boolean} Whether it can be swapped to.
 */
export function isCandidate( block ) {
	const dynamic = ( b ) =>
		DYNAMIC.test( b.name ) || ( b.innerBlocks || [] ).some( dynamic );
	return ! dynamic( block ) && signature( block ).length > 0;
}

/**
 * A slot from the pattern, filled with the matching slot from the section.
 *
 * @param {Object} slot
 * @param {Object} from
 */
function fill( slot, from ) {
	const role = roleOf( slot );
	if ( role === 'hold' || role === 'picture' ) {
		// An empty image in the section leaves the pattern's picture empty too.
		const attributes = withPicture( slot, pictureOf( from ) || {} );
		if ( role === 'picture' && from.name === 'core/image' ) {
			for ( const key of CONTENT[ 'core/image' ] ) {
				attributes[ key ] = from.attributes[ key ];
			}
		}
		return { ...slot, attributes };
	}
	const keys = CONTENT[ slot.name ];
	if ( ! keys ) {
		// Nothing is known about it, so it's all content.
		return { ...from, innerBlocks: from.innerBlocks || [] };
	}
	const attributes = { ...slot.attributes };
	for ( const key of keys ) {
		if ( from.attributes[ key ] === undefined ) {
			delete attributes[ key ];
		} else {
			attributes[ key ] = from.attributes[ key ];
		}
	}
	// A leaf's inner blocks, such as a list's entries, are its content too.
	return role === 'leaf'
		? { ...slot, attributes, innerBlocks: from.innerBlocks || [] }
		: { ...slot, attributes };
}

/**
 * The pattern's blocks with the section's content in them. The two must have
 * the same signature.
 *
 * @param {Object} from The section's top block.
 * @param {Object} to   The pattern's top block.
 * @return {Object} A new top block.
 */
export function transferContent( from, to ) {
	const sources = slotsOf( from );
	let next = 0;
	const rebuild = ( block ) => {
		const role = roleOf( block );
		if ( role === 'skip' ) {
			return block;
		}
		let out = block;
		if ( role !== 'wrap' ) {
			out = fill( block, sources[ next++ ] );
			if ( role === 'leaf' || role === 'picture' ) {
				return out;
			}
		}
		return {
			...out,
			innerBlocks: ( out.innerBlocks || [] ).map( rebuild ),
		};
	};
	return rebuild( to );
}

/**
 * The patterns a section can swap to: single-block patterns with the same
 * content blocks, except the one it already is.
 *
 * @param {Object}   section  The section's top block.
 * @param {Object[]} patterns Patterns with their parsed `blocks`.
 * @return {Object[]} The patterns it can swap to.
 */
export function findSwaps( section, patterns ) {
	const wanted = signature( section ).join( '|' );
	const current = section.attributes?.metadata?.patternName;
	return patterns.filter(
		( p ) =>
			p.name !== current &&
			p.blocks?.length === 1 &&
			isCandidate( p.blocks[ 0 ] ) &&
			signature( p.blocks[ 0 ] ).join( '|' ) === wanted
	);
}
