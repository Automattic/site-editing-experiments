/**
 * The site editor's tools, which don't change: reading the page, pointing at
 * blocks, changing blocks and the site's styles, and undo. Every change goes
 * through the editor's own data stores, so it shows on the canvas at once,
 * undo takes it back, and nothing is saved until the person saves.
 */
import { dispatch, resolveSelect, select } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { store as coreStore } from '@wordpress/core-data';
import { store as editorStore } from '@wordpress/editor';
import {
	getBlockType,
	serialize,
	store as blocksStore,
	switchToBlockType,
} from '@wordpress/blocks';

import { mark } from '../highlight';
import { getPresets } from '../schema';
import {
	assertCanInsert,
	be,
	changesMoreThanContent,
	ensureEditable,
	isLockedSection,
	leaveOpenSection,
	isTemplate,
	blocksFromInput,
	blockText,
	blockTitle,
	contentRoot,
	editingMode,
	flatten,
	getBlockOrThrow,
	plainAttributes,
	positionSchema,
	resolvePosition,
	shortName,
	summary,
} from './common';

const obj = ( properties = {}, required = [] ) => ( {
	type: 'object',
	properties,
	...( required.length ? { required } : {} ),
	additionalProperties: false,
} );

const showChange = ( ids, label ) =>
	mark( ids, { label, kind: 'change', ms: 2500 } );

function editorContext() {
	const editor = select( editorStore );
	const store = be();
	const postType = editor.getCurrentPostType();
	const postId = editor.getCurrentPostId();
	const record = select( coreStore ).getEditedEntityRecord(
		'postType',
		postType,
		postId
	);
	const selectedId = store.getSelectedBlockClientId();
	const multi = store.getMultiSelectedBlockClientIds();
	const dirty =
		select( coreStore ).__experimentalGetDirtyEntityRecords?.() || [];
	const title =
		typeof record?.title === 'string'
			? record.title
			: record?.title?.raw || record?.title?.rendered || '';
	const context = {
		editing: {
			type: postType,
			id: postId,
			title,
			shownInTemplate: editor.getRenderingMode?.() !== 'post-only',
		},
		selected: null,
		unsavedChanges: dirty.map(
			( r ) => r.title || `${ r.name } ${ r.key }`
		),
		canUndo: !! editor.hasEditorUndo?.(),
		canRedo: !! editor.hasEditorRedo?.(),
		device: editor.getDeviceType?.() || 'Desktop',
	};
	if ( selectedId ) {
		const block = store.getBlock( selectedId );
		context.selected = {
			id: selectedId,
			block: block.name,
			title: blockTitle( block.name ),
			text: blockText( block ) || undefined,
			editing: isTemplate( selectedId )
				? 'template'
				: editingMode( selectedId ),
			parents: store
				.getBlockParents( selectedId )
				.map( ( id ) => shortName( store.getBlockName( id ) ) ),
		};
	} else if ( multi.length ) {
		context.selected = { ids: multi };
	}
	return context;
}

function tree( clientId, depth, budget ) {
	const store = be();
	return store.getBlockOrder( clientId ).flatMap( ( id ) => {
		if ( budget.left-- <= 0 ) {
			budget.cut = true;
			return [];
		}
		const node = summary( id );
		const parent = store.getBlockRootClientId( id );
		if ( isTemplate( id ) && ( ! parent || ! isTemplate( parent ) ) ) {
			node.template = true;
		}
		if ( isLockedSection( id ) ) {
			node.layoutLocked = true;
		}
		const name = store.getBlockName( id );
		if ( name === 'core/template-part' ) {
			node.part = store.getBlockAttributes( id )?.slug;
		}
		if ( depth > 1 && store.getBlockCount( id ) ) {
			node.children = tree( id, depth - 1, budget );
		} else if ( store.getBlockCount( id ) ) {
			node.more = store.getBlockCount( id );
		}
		return [ node ];
	} );
}

function getGlobalStyles() {
	const core = select( coreStore );
	const id = core.__experimentalGetCurrentGlobalStylesId?.();
	if ( ! id ) {
		throw new Error(
			"This site's styles can't be changed here (it isn't using a block theme)."
		);
	}
	return {
		id,
		record: core.getEditedEntityRecord( 'root', 'globalStyles', id ),
	};
}

function setPath( target, path, value ) {
	const out = { ...( target || {} ) };
	const [ key, ...rest ] = path;
	if ( ! rest.length ) {
		if ( value === undefined ) {
			delete out[ key ];
		} else {
			out[ key ] = value;
		}
		return out;
	}
	out[ key ] = setPath( out[ key ], rest, value );
	return out;
}

// "color:accent-1" is a preset; anything else is a CSS value.
function styleValue( value ) {
	const m = /^(color|font-size|font-family|spacing|gradient):([\w-]+)$/.exec(
		value || ''
	);
	return m ? `var:preset|${ m[ 1 ] }|${ m[ 2 ] }` : value;
}

export function editorTools() {
	return [
		// ---------- Reading ----------
		{
			name: 'get_editor_context',
			title: 'What is being edited',
			group: 'Read',
			readOnly: true,
			description:
				"What's open in the site editor: the page or template, what's selected (the person's focus, so 'this' or 'here' usually means it), unsaved changes and whether undo is possible. Call it first.",
			inputSchema: obj(),
			run: () => editorContext(),
		},
		{
			name: 'get_block_tree',
			title: 'Outline of the page',
			group: 'Read',
			readOnly: true,
			description:
				"The blocks on the canvas as an outline: each block's id, type and first words, nested. Blocks marked template: true are the template's (header, footer), not this page's, and can't be changed here. Sections marked layoutLocked: true came from patterns: their words and pictures can change at once, and changing their design or structure opens them for editing first, as Edit section does (the tools do that for you). Give an id to outline just inside that block.",
			inputSchema: obj( {
				clientId: {
					type: 'string',
					description: 'Outline inside this block only.',
				},
				depth: {
					type: 'integer',
					minimum: 1,
					maximum: 8,
					description: 'How many levels deep. Default 4.',
				},
			} ),
			run: ( { clientId = '', depth = 4 } ) => {
				const budget = { left: 250, cut: false };
				const blocks = tree( clientId, depth, budget );
				return budget.cut
					? {
							blocks,
							note: 'Cut short at 250 blocks: outline inside one block for more.',
						}
					: { blocks };
			},
		},
		{
			name: 'get_block',
			title: 'Read a block',
			group: 'Read',
			readOnly: true,
			description:
				"One block in full: its attributes, where it is, what it can be turned into, its style variations and its markup. Use it before changing a block's attributes.",
			inputSchema: obj( { clientId: { type: 'string' } }, [
				'clientId',
			] ),
			run: ( { clientId } ) => {
				const block = getBlockOrThrow( clientId );
				const store = be();
				const root = store.getBlockRootClientId( clientId ) || '';
				const html = serialize( [ block ] );
				return {
					id: clientId,
					block: block.name,
					title: blockTitle( block.name ),
					editing: isTemplate( clientId )
						? 'template'
						: editingMode( clientId ),
					attributes: plainAttributes( block.attributes ),
					parents: store
						.getBlockParents( clientId )
						.map( ( id ) => shortName( store.getBlockName( id ) ) ),
					children: block.innerBlocks.map( ( b ) =>
						summary( b.clientId )
					),
					canTurnInto: (
						store.getBlockTransformItems?.( [ block ], root ) || []
					).map( ( t ) => t.name ),
					styleVariations: (
						select( blocksStore ).getBlockStyles( block.name ) || []
					).map( ( s ) => s.name ),
					markup:
						html.length > 3000
							? `${ html.slice( 0, 3000 ) }…`
							: html,
				};
			},
		},
		{
			name: 'get_site_styles',
			title: "The site's styles",
			group: 'Read',
			readOnly: true,
			description:
				"The theme's presets (colour palette, font sizes, fonts, spacing sizes) and the site-wide styles set on top of the theme. Blocks and set_site_style use the presets by slug.",
			inputSchema: obj(),
			run: () => {
				const presets = getPresets( be().getSettings() );
				let styles = null;
				try {
					styles = getGlobalStyles().record?.styles || {};
				} catch {}
				const brief = ( list ) =>
					list.map( ( p ) => ( {
						slug: p.slug,
						name: p.name,
						value: p.value,
					} ) );
				return {
					palette: brief( presets.colors ),
					gradients: presets.gradients.map( ( p ) => p.slug ),
					fontSizes: brief( presets.fontSizes ),
					fonts: presets.fontFamilies.map( ( p ) => ( {
						slug: p.slug,
						name: p.name,
					} ) ),
					spacing: brief( presets.spacing ),
					siteStyles: styles,
				};
			},
		},
		{
			name: 'search_patterns',
			title: 'Find patterns',
			group: 'Read',
			readOnly: true,
			description:
				"Search the site's patterns, ready-made sections like a hero, a call to action or a team grid. Insert one with insert_pattern.",
			inputSchema: obj( {
				search: {
					type: 'string',
					description:
						'Words to match in the title, description or keywords.',
				},
				category: {
					type: 'string',
					description:
						'A category slug, like "call-to-action", "banner", "team" or "testimonials".',
				},
				limit: { type: 'integer', minimum: 1, maximum: 40 },
			} ),
			run: async ( { search = '', category, limit = 12 } ) => {
				const all =
					( await resolveSelect( coreStore ).getBlockPatterns() ) ||
					[];
				const words = search
					.toLowerCase()
					.split( /\s+/ )
					.filter( Boolean );
				const found = all
					.filter( ( p ) => p.inserter !== false )
					.filter(
						( p ) =>
							! category ||
							( p.categories || [] ).includes( category )
					)
					.map( ( p ) => {
						const hay = [
							p.title,
							p.description,
							...( p.keywords || [] ),
							...( p.categories || [] ),
						]
							.join( ' ' )
							.toLowerCase();
						return {
							p,
							score: words.filter( ( w ) => hay.includes( w ) )
								.length,
						};
					} )
					.filter( ( { score } ) => ! words.length || score > 0 )
					.sort( ( a, b ) => b.score - a.score )
					.slice( 0, limit )
					.map( ( { p } ) => ( {
						name: p.name,
						title: p.title,
						categories: p.categories,
						description: p.description || undefined,
					} ) );
				return { patterns: found, total: all.length };
			},
		},
		{
			name: 'get_unsaved_changes',
			title: 'Unsaved changes',
			group: 'Read',
			readOnly: true,
			description:
				"What has changed since the last save: pages, templates, template parts and site styles. Changes are only saved when the person saves; there's no tool to save for them.",
			inputSchema: obj(),
			run: () => ( {
				unsaved: (
					select(
						coreStore
					).__experimentalGetDirtyEntityRecords?.() || []
				).map( ( r ) => ( {
					kind: r.name,
					title: r.title,
				} ) ),
			} ),
		},

		// ---------- Showing ----------
		{
			name: 'point_at_blocks',
			title: 'Point at blocks',
			group: 'Show',
			readOnly: true,
			description:
				'Outline blocks on the canvas, with a short label, for a few seconds, to show the person something without changing it. Good for "which one do you mean?" and for explaining.',
			inputSchema: obj(
				{
					clientIds: {
						type: 'array',
						items: { type: 'string' },
						minItems: 1,
					},
					label: {
						type: 'string',
						description: 'A few words shown over the first block.',
					},
				},
				[ 'clientIds' ]
			),
			run: ( { clientIds, label } ) => {
				clientIds.forEach( getBlockOrThrow );
				mark( clientIds, { label, kind: 'point', ms: 4500 } );
				return `Pointing at ${ clientIds.length } block${ clientIds.length > 1 ? 's' : '' }.`;
			},
		},
		{
			name: 'select_block',
			title: 'Select a block',
			group: 'Show',
			description:
				'Select a block, as if the person clicked it: the editor scrolls to it and shows its settings, and the selected-block tools change to fit it.',
			inputSchema: obj( { clientId: { type: 'string' } }, [
				'clientId',
			] ),
			run: ( { clientId } ) => {
				getBlockOrThrow( clientId );
				leaveOpenSection( clientId );
				dispatch( blockEditorStore ).selectBlock( clientId );
				mark( [ clientId ], { kind: 'point', ms: 1500 } );
				return editorContext().selected;
			},
		},

		// ---------- Changing ----------
		{
			name: 'update_block',
			title: 'Change a block',
			group: 'Change',
			description:
				"Set some of a block's attributes, leaving the rest. For text, set content (headings, paragraphs) or text (buttons) as HTML. Read the block with get_block first to see its attributes. For the selected block, edit_selected_block and style_selected_block have exact schemas.",
			inputSchema: obj(
				{
					clientId: { type: 'string' },
					attributes: {
						type: 'object',
						description: 'The attributes to set.',
					},
				},
				[ 'clientId', 'attributes' ]
			),
			run: ( { clientId, attributes } ) => {
				const block = getBlockOrThrow( clientId );
				const known = getBlockType( block.name )?.attributes || {};
				const unknown = Object.keys( attributes ).filter(
					( k ) => ! ( k in known )
				);
				if ( unknown.length ) {
					throw new Error(
						`${ blockTitle( block.name ) } has no attribute ${ unknown.join( ', ' ) }. It has: ${ Object.keys( known ).join( ', ' ) }.`
					);
				}
				const opened = ensureEditable( clientId, {
					full: changesMoreThanContent(
						block.name,
						Object.keys( attributes )
					),
				} );
				dispatch( blockEditorStore ).updateBlockAttributes(
					clientId,
					attributes
				);
				showChange( [ clientId ], 'Changed' );
				return withOpened(
					{
						changed: Object.keys( attributes ),
						block: summary( clientId ),
					},
					opened
				);
			},
		},
		{
			name: 'insert_blocks',
			title: 'Add blocks',
			group: 'Change',
			description:
				'Add new blocks, as a list of { name, attributes, innerBlocks } (like { "name": "core/heading", "attributes": { "content": "Hello", "level": 2 } }) or as block markup. Use the theme\'s presets for colours and sizes.',
			inputSchema: obj( {
				blocks: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							name: { type: 'string' },
							attributes: { type: 'object' },
							innerBlocks: {
								type: 'array',
								items: { type: 'object' },
							},
						},
						required: [ 'name' ],
					},
				},
				markup: {
					type: 'string',
					description: 'Serialized block markup, instead of blocks.',
				},
				...positionSchema,
			} ),
			run: ( input ) => {
				const blocks = blocksFromInput( input );
				const { rootClientId, index } = resolvePosition( input );
				const opened = assertCanInsert(
					blocks.map( ( b ) => b.name ),
					rootClientId
				);
				dispatch( blockEditorStore ).insertBlocks(
					blocks,
					index,
					rootClientId,
					false
				);
				const ids = blocks.map( ( b ) => b.clientId );
				showChange( ids, 'Added' );
				return withOpened( { added: ids.map( summary ) }, opened );
			},
		},
		{
			name: 'insert_pattern',
			title: 'Add a pattern',
			group: 'Change',
			description:
				"Add one of the site's patterns, by its name from search_patterns. Then change its words to fit the page.",
			inputSchema: obj( { name: { type: 'string' }, ...positionSchema }, [
				'name',
			] ),
			run: async ( input ) => {
				const all =
					( await resolveSelect( coreStore ).getBlockPatterns() ) ||
					[];
				const pattern = all.find( ( p ) => p.name === input.name );
				if ( ! pattern ) {
					throw new Error(
						`No pattern called ${ input.name }. Use search_patterns to find one.`
					);
				}
				const blocks = blocksFromInput( { markup: pattern.content } );
				if ( blocks.length === 1 ) {
					blocks[ 0 ].attributes.metadata = {
						...( blocks[ 0 ].attributes.metadata || {} ),
						patternName: pattern.name,
						name: pattern.title,
					};
				}
				const { rootClientId, index } = resolvePosition( input );
				const opened = assertCanInsert(
					blocks.map( ( b ) => b.name ),
					rootClientId
				);
				dispatch( blockEditorStore ).insertBlocks(
					blocks,
					index,
					rootClientId,
					false
				);
				const ids = blocks.map( ( b ) => b.clientId );
				showChange( ids, pattern.title );
				return withOpened(
					{
						added: ids.map( summary ),
						text: flatten( blocks )
							.map( ( b ) => ( {
								id: b.clientId,
								block: shortName( b.name ),
								text: blockText( b ),
							} ) )
							.filter( ( b ) => b.text ),
					},
					opened
				);
			},
		},
		{
			name: 'remove_blocks',
			title: 'Remove blocks',
			group: 'Change',
			destructive: true,
			description:
				'Remove blocks, and everything inside them. Undo brings them back.',
			inputSchema: obj(
				{
					clientIds: {
						type: 'array',
						items: { type: 'string' },
						minItems: 1,
					},
				},
				[ 'clientIds' ]
			),
			run: ( { clientIds } ) => {
				const removed = clientIds.map( ( id ) => {
					getBlockOrThrow( id );
					ensureEditable( id );
					return summary( id );
				} );
				dispatch( blockEditorStore ).removeBlocks( clientIds, false );
				return { removed };
			},
		},
		{
			name: 'move_blocks',
			title: 'Move blocks',
			group: 'Change',
			description:
				'Move blocks: one step up or down among their neighbours with direction, or to a place with relativeTo and where.',
			inputSchema: obj(
				{
					clientIds: {
						type: 'array',
						items: { type: 'string' },
						minItems: 1,
					},
					direction: { type: 'string', enum: [ 'up', 'down' ] },
					...positionSchema,
				},
				[ 'clientIds' ]
			),
			run: ( { clientIds, direction, relativeTo, where } ) => {
				const store = be();
				clientIds.forEach( ( id ) => {
					getBlockOrThrow( id );
					ensureEditable( id );
				} );
				const fromRoot =
					store.getBlockRootClientId( clientIds[ 0 ] ) || '';
				const actions = dispatch( blockEditorStore );
				if ( direction ) {
					( direction === 'up'
						? actions.moveBlocksUp
						: actions.moveBlocksDown )( clientIds, fromRoot );
				} else {
					if ( ! relativeTo ) {
						throw new Error(
							'Give a direction, or relativeTo and where.'
						);
					}
					if ( clientIds.includes( relativeTo ) ) {
						throw new Error(
							"Blocks can't move next to themselves."
						);
					}
					const target = resolvePosition( { relativeTo, where } );
					let index = target.index;
					if (
						target.rootClientId === fromRoot &&
						store.getBlockIndex( clientIds[ 0 ] ) < index
					) {
						index -= clientIds.length;
					}
					actions.moveBlocksToPosition(
						clientIds,
						fromRoot,
						target.rootClientId,
						index
					);
				}
				showChange( clientIds, 'Moved' );
				return {
					moved: clientIds.map( summary ),
					now: clientIds.map( ( id ) => ( {
						id,
						index: store.getBlockIndex( id ),
					} ) ),
				};
			},
		},
		{
			name: 'duplicate_block',
			title: 'Duplicate a block',
			group: 'Change',
			description:
				'Copy a block, with everything inside it, just after itself.',
			inputSchema: obj( { clientId: { type: 'string' } }, [
				'clientId',
			] ),
			run: async ( { clientId } ) => {
				getBlockOrThrow( clientId );
				const opened = ensureEditable( clientId );
				const store = be();
				const root = store.getBlockRootClientId( clientId ) || '';
				const index = store.getBlockIndex( clientId );
				await dispatch( blockEditorStore ).duplicateBlocks(
					[ clientId ],
					false
				);
				const copy = store.getBlockOrder( root )[ index + 1 ];
				showChange( [ copy ], 'Copy' );
				return withOpened( { copy: summary( copy ) }, opened );
			},
		},
		{
			name: 'transform_block',
			title: 'Turn a block into another',
			group: 'Change',
			description:
				'Turn a block into another type, keeping its content, like a paragraph into a heading or a list, or images into a gallery. get_block lists what it can become.',
			inputSchema: obj(
				{
					clientId: { type: 'string' },
					to: {
						type: 'string',
						description: 'A block type, like core/heading.',
					},
				},
				[ 'clientId', 'to' ]
			),
			run: ( { clientId, to } ) => transformBlock( clientId, to ),
		},
		{
			name: 'set_site_style',
			title: 'Change a site-wide style',
			group: 'Change',
			description:
				'Change a style for the whole site, on top of the theme, as the Styles panel does. path is where in the styles, like "color.background", "color.text", "typography.fontFamily", "elements.link.color.text", "elements.h1.typography.fontSize", "elements.button.color.background" or "blocks.core/quote.typography.fontStyle". value is CSS, or a preset as "color:accent-1", "font-size:large", "font-family:fira-code" or "spacing:50". An empty value goes back to the theme\'s.',
			inputSchema: obj(
				{ path: { type: 'string' }, value: { type: 'string' } },
				[ 'path', 'value' ]
			),
			run: ( { path, value } ) => {
				const { id, record } = getGlobalStyles();
				const parts = path.split( '.' ).filter( Boolean );
				if ( ! parts.length ) {
					throw new Error( 'Give a path, like "color.background".' );
				}
				const styles = setPath(
					record.styles,
					parts,
					value === '' ? undefined : styleValue( value )
				);
				dispatch( coreStore ).editEntityRecord(
					'root',
					'globalStyles',
					id,
					{ styles }
				);
				return {
					set: path,
					to: value === '' ? "the theme's" : styleValue( value ),
				};
			},
		},
		{
			name: 'set_palette_color',
			title: 'Change a palette colour',
			group: 'Change',
			description:
				"Change one of the theme's palette colours for the whole site. Everything that uses it changes too.",
			inputSchema: obj(
				{
					slug: {
						type: 'string',
						description: "The colour's slug, from get_site_styles.",
					},
					color: {
						type: 'string',
						description: 'A CSS colour, like #1f3a5f.',
					},
				},
				[ 'slug', 'color' ]
			),
			run: ( { slug, color } ) => {
				const { id, record } = getGlobalStyles();
				const features =
					be().getSettings().__experimentalFeatures || {};
				const current =
					record.settings?.color?.palette?.theme ||
					features.color?.palette?.theme ||
					[];
				if ( ! current.some( ( c ) => c.slug === slug ) ) {
					throw new Error(
						`The theme's palette has no ${ slug }. It has: ${ current.map( ( c ) => c.slug ).join( ', ' ) }.`
					);
				}
				const palette = current.map( ( c ) =>
					c.slug === slug ? { ...c, color } : c
				);
				const settings = setPath(
					record.settings,
					[ 'color', 'palette', 'theme' ],
					palette
				);
				dispatch( coreStore ).editEntityRecord(
					'root',
					'globalStyles',
					id,
					{ settings }
				);
				return { slug, color };
			},
		},
		{
			name: 'undo',
			title: 'Undo',
			group: 'Change',
			description: 'Undo the last change, whoever made it.',
			inputSchema: obj(),
			run: () => {
				if ( ! select( editorStore ).hasEditorUndo() ) {
					return 'Nothing to undo.';
				}
				dispatch( editorStore ).undo();
				return 'Undone.';
			},
		},
		{
			name: 'redo',
			title: 'Redo',
			group: 'Change',
			description: 'Redo the last change that was undone.',
			inputSchema: obj(),
			run: () => {
				if ( ! select( editorStore ).hasEditorRedo() ) {
					return 'Nothing to redo.';
				}
				dispatch( editorStore ).redo();
				return 'Redone.';
			},
		},
	];
}

export function transformBlock( clientId, to ) {
	const block = getBlockOrThrow( clientId );
	const opened = ensureEditable( clientId );
	const result = switchToBlockType( block, to );
	if ( ! result?.length ) {
		const store = be();
		const root = store.getBlockRootClientId( clientId ) || '';
		const can = (
			store.getBlockTransformItems?.( [ block ], root ) || []
		).map( ( t ) => t.name );
		throw new Error(
			`A ${ blockTitle( block.name ) } can't become ${ to }. It can become: ${ can.join( ', ' ) || 'nothing else' }.`
		);
	}
	dispatch( blockEditorStore ).replaceBlocks( clientId, result );
	const ids = result.map( ( b ) => b.clientId );
	showChange( ids, `Now ${ blockTitle( to ) }` );
	return withOpened( { now: ids.map( summary ) }, opened );
}

export { contentRoot };

/**
 * Says so when a tool opened a section for editing, so the agent can tell the
 * person why the section's outline changed.
 *
 * @param {Object}      result  The tool's result.
 * @param {string|null} section The section it opened.
 * @return {Object} The result.
 */
export function withOpened( result, section ) {
	return section
		? {
				...result,
				openedSection: {
					...summary( section ),
					note: 'Opened this section for editing first, as Edit section does.',
				},
			}
		: result;
}
