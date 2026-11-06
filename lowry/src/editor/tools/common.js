/**
 * Helpers the tools share: finding blocks, describing them briefly for a
 * model, and working out where new blocks go.
 */
import { dispatch, select } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { store as editorStore } from '@wordpress/editor';
import {
	createBlock,
	getBlockType,
	parse,
	store as blocksStore,
} from '@wordpress/blocks';

export const be = () => select( blockEditorStore );

export function plainText( value, max = 80 ) {
	const text = String( value ?? '' )
		.replace( /<[^>]*>/g, ' ' )
		.replace( /&nbsp;/g, ' ' )
		.replace( /&amp;/g, '&' )
		.replace( /\s+/g, ' ' )
		.trim();
	return text.length > max ? `${ text.slice( 0, max - 1 ) }…` : text;
}

// A block's words, from whichever attribute holds them.
export function blockText( block ) {
	const a = block.attributes || {};
	for ( const key of [
		'content',
		'text',
		'value',
		'citation',
		'caption',
		'alt',
		'title',
		'label',
	] ) {
		if (
			a[ key ] !== undefined &&
			a[ key ] !== null &&
			String( a[ key ] ).trim()
		) {
			return plainText( a[ key ] );
		}
	}
	return '';
}

export function shortName( name ) {
	return name?.startsWith( 'core/' ) ? name.slice( 5 ) : name;
}

export function blockTitle( name ) {
	return getBlockType( name )?.title || name;
}

// Attribute values as plain JSON: rich text becomes its HTML.
export function plainAttributes( attributes = {} ) {
	const out = {};
	Object.entries( attributes ).forEach( ( [ k, v ] ) => {
		if ( v === undefined ) {
			return;
		}
		if (
			v &&
			typeof v === 'object' &&
			typeof v.toHTMLString === 'function'
		) {
			out[ k ] = v.toHTMLString();
		} else if ( typeof v === 'string' && v.length > 600 ) {
			out[ k ] = `${ v.slice( 0, 600 ) }…`;
		} else {
			out[ k ] = v;
		}
	} );
	return out;
}

/**
 * Whether a block can be changed here: 'default', 'contentOnly' (its words
 * and pictures only) or 'disabled'.
 *
 * @param {string} clientId The block.
 * @return {string} The editing mode.
 */
export function editingMode( clientId ) {
	return be().getBlockEditingMode?.( clientId ) || 'default';
}

/**
 * Whether a block is the template's, not the page's: when a page is shown in
 * its template, everything outside Post Content.
 *
 * @param {string} clientId The block.
 * @return {boolean} Whether it is.
 */
export function isTemplate( clientId ) {
	const editor = select( editorStore );
	if (
		[ 'wp_template', 'wp_template_part' ].includes(
			editor.getCurrentPostType()
		) ||
		editor.getRenderingMode?.() === 'post-only'
	) {
		return false;
	}
	const store = be();
	if ( store.getBlockName( clientId ) === 'core/post-content' ) {
		return false;
	}
	return ! store
		.getBlockParents( clientId )
		.some( ( id ) => store.getBlockName( id ) === 'core/post-content' );
}

/**
 * The section a block's layout is locked by, if any: a section from a
 * pattern, or one locked to its content, whose own blocks only take new words
 * and pictures until it's opened with Edit section.
 *
 * @param {string} clientId The block.
 * @return {string|null} The section's id.
 */
export function lockingSection( clientId ) {
	const store = be();
	const fromEditor = store.__unstableGetContentLockingParent?.( clientId );
	if ( fromEditor ) {
		return fromEditor;
	}
	return (
		[
			clientId,
			...[ ...store.getBlockParents( clientId ) ].reverse(),
		].find( ( id ) => {
			const a = store.getBlockAttributes( id ) || {};
			return a.templateLock === 'contentOnly' || a.metadata?.patternName;
		} ) || null
	);
}

// Whether a section's layout is locked now.
export function isLockedSection( clientId ) {
	const store = be();
	const a = store.getBlockAttributes( clientId ) || {};
	if ( ! ( a.templateLock === 'contentOnly' || a.metadata?.patternName ) ) {
		return false;
	}
	if ( store.__unstableGetTemporarilyEditingAsBlocks?.() === clientId ) {
		return false;
	}
	return store
		.getClientIdsOfDescendants( [ clientId ] )
		.some( ( id ) => editingMode( id ) !== 'default' );
}

/**
 * Closes a section opened with Edit section when the block isn't in it, as
 * clicking elsewhere does: while a section is open, the rest of the page is
 * locked.
 *
 * @param {string} clientId A block, or '' for the page.
 */
export function leaveOpenSection( clientId ) {
	const store = be();
	const open = store.__unstableGetTemporarilyEditingAsBlocks?.();
	if (
		open &&
		( ! clientId ||
			( clientId !== open &&
				! store.getBlockParents( clientId ).includes( open ) ) )
	) {
		dispatch( blockEditorStore ).__unstableSetTemporarilyEditingAsBlocks(
			null
		);
	}
}

/**
 * Makes sure a block can be changed, the way a person would: a block in the
 * template can't be; a block in a section whose layout is locked can have
 * its content changed, and for anything more the section is opened, as Edit
 * section does.
 *
 * @param {string}  clientId     The block.
 * @param {Object}  options
 * @param {boolean} options.full Whether more than its content will change.
 * @return {string|null} The section it opened, if it opened one.
 */
export function ensureEditable( clientId, { full = true } = {} ) {
	if ( isTemplate( clientId ) ) {
		throw new Error(
			`The ${ blockTitle( be().getBlockName( clientId ) ) } block (${ clientId }) is part of the template, not this page, so it can't be changed here. Tell the person they can change it by editing the template.`
		);
	}
	leaveOpenSection( clientId );
	const mode = editingMode( clientId );
	if ( mode === 'default' || ( mode === 'contentOnly' && ! full ) ) {
		return null;
	}
	const section = lockingSection( clientId );
	if ( section ) {
		dispatch( blockEditorStore ).__unstableSetTemporarilyEditingAsBlocks(
			section
		);
		if ( editingMode( clientId ) === 'default' ) {
			return section;
		}
	}
	throw new Error(
		`The ${ blockTitle( be().getBlockName( clientId ) ) } block (${ clientId }) can't be changed here.`
	);
}

export function getBlockOrThrow( clientId ) {
	if ( ! clientId || typeof clientId !== 'string' ) {
		throw new Error(
			'Give a block id (clientId). get_block_tree lists them.'
		);
	}
	const block = be().getBlock( clientId );
	if ( ! block ) {
		throw new Error(
			`No block with id ${ clientId }. Ids change when blocks are replaced: call get_block_tree again.`
		);
	}
	return block;
}

// Throws for the template's blocks; content-only blocks are fine.: throws for the template's blocks.
export function assertEditable( clientId ) {
	return ensureEditable( clientId, { full: false } );
}

/**
 * Whether setting these attributes changes more than a block's content.
 *
 * @param {string}   name Block type.
 * @param {string[]} keys Attribute names.
 * @return {boolean} Whether it does.
 */
export function changesMoreThanContent( name, keys ) {
	const attrs = getBlockType( name )?.attributes || {};
	return keys.some(
		( k ) =>
			( attrs[ k ]?.role || attrs[ k ]?.__experimentalRole ) !== 'content'
	);
}

export function summary( clientId ) {
	const block = be().getBlock( clientId );
	if ( ! block ) {
		return null;
	}
	const out = { id: clientId, block: shortName( block.name ) };
	const text = blockText( block );
	if ( text ) {
		out.text = text;
	}
	return out;
}

/**
 * The block the page's own content is in: Post Content when a page is shown
 * in its template, or the root.
 *
 * @return {string} A clientId, or '' for the root.
 */
export function contentRoot() {
	const postContent = be().getBlocksByName?.( 'core/post-content' ) || [];
	return postContent[ 0 ] || '';
}

/**
 * Where to put blocks: `where` is 'before' or 'after' a block, or 'start' or
 * 'end' inside one. With no block, the start or end of the page's content.
 *
 * @param {Object} position
 * @param {string} position.relativeTo A block's id.
 * @param {string} position.where      'before', 'after', 'start' or 'end'.
 * @return {{rootClientId: string, index: number}} The place.
 */
export function resolvePosition( { relativeTo, where = 'end' } = {} ) {
	const store = be();
	if ( ! relativeTo ) {
		const root = contentRoot();
		return {
			rootClientId: root,
			index: where === 'start' ? 0 : store.getBlockCount( root ),
		};
	}
	getBlockOrThrow( relativeTo );
	if ( where === 'start' || where === 'end' ) {
		return {
			rootClientId: relativeTo,
			index: where === 'start' ? 0 : store.getBlockCount( relativeTo ),
		};
	}
	const rootClientId = store.getBlockRootClientId( relativeTo ) || '';
	const index = store.getBlockIndex( relativeTo );
	return { rootClientId, index: where === 'before' ? index : index + 1 };
}

export function assertCanInsert( names, rootClientId ) {
	const store = be();
	let opened = null;
	if (
		rootClientId &&
		store.getBlockName( rootClientId ) !== 'core/post-content'
	) {
		opened = ensureEditable( rootClientId );
	} else {
		leaveOpenSection( rootClientId );
	}
	names.forEach( ( name ) => {
		if ( ! store.canInsertBlockType( name, rootClientId ) ) {
			throw new Error(
				`A ${ blockTitle( name ) } block can't go there${ rootClientId ? ` (inside ${ blockTitle( store.getBlockName( rootClientId ) ) })` : '' }.`
			);
		}
	} );
	return opened;
}

function fromSpec( spec ) {
	if ( ! spec?.name || ! getBlockType( spec.name ) ) {
		const known = select( blocksStore )
			.getBlockTypes()
			.filter( ( t ) => t.name.startsWith( 'core/' ) )
			.slice( 0, 40 )
			.map( ( t ) => t.name );
		throw new Error(
			`Unknown block type ${ spec?.name }. Some that exist: ${ known.join( ', ' ) }.`
		);
	}
	return createBlock(
		spec.name,
		spec.attributes || {},
		( spec.innerBlocks || [] ).map( fromSpec )
	);
}

/**
 * Blocks from a tool's input: `blocks` as `{ name, attributes, innerBlocks }`
 * or `markup` as serialized block markup.
 *
 * @param {Object}   input        The tool's input.
 * @param {Object[]} input.blocks Blocks as `{ name, attributes, innerBlocks }`.
 * @param {string}   input.markup Block markup.
 * @return {Object[]} New blocks.
 */
export function blocksFromInput( { blocks, markup } ) {
	if ( markup ) {
		const parsed = parse( markup ).filter(
			( b ) =>
				b.name && ! ( b.name === 'core/freeform' && ! blockText( b ) )
		);
		const invalid = parsed.find( ( b ) => b.isValid === false );
		if ( invalid ) {
			throw new Error(
				`The ${ blockTitle( invalid.name ) } block in that markup isn't valid block markup. Send blocks as { name, attributes, innerBlocks } instead.`
			);
		}
		return parsed;
	}
	if ( Array.isArray( blocks ) && blocks.length ) {
		return blocks.map( fromSpec );
	}
	throw new Error(
		'Give blocks (a list of { name, attributes, innerBlocks }) or markup.'
	);
}

// All the blocks in a tree, flattened.
export function flatten( blocks ) {
	return blocks.flatMap( ( b ) => [ b, ...flatten( b.innerBlocks || [] ) ] );
}

export const positionSchema = {
	relativeTo: {
		type: 'string',
		description:
			'A block id. Leave it out for the start or end of the page content.',
	},
	where: {
		type: 'string',
		enum: [ 'before', 'after', 'start', 'end' ],
		description:
			"before or after relativeTo, or at the start or end inside it. Default 'end'.",
	},
};
