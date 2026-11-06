/**
 * Tools for the selected block, made from its block type: whatever is
 * selected, the agent gets a tool whose schema is exactly that block's
 * attributes, another for its design from what it supports and the theme's
 * presets, and one for what it can turn into. Select another kind of block
 * and they're offered again, made for it (WebMCP's `toolchange`).
 */
import { dispatch, select } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { getBlockType, store as blocksStore } from '@wordpress/blocks';

import { mark } from '../highlight';
import {
	attributesSchema,
	designSchema,
	designToAttributes,
	getPresets,
} from '../schema';
import {
	be,
	blockTitle,
	changesMoreThanContent,
	ensureEditable,
	isTemplate,
	plainAttributes,
	summary,
} from './common';
import { transformBlock, withOpened } from './editor';

export const SELECTION_TOOLS = [
	'edit_selected_block',
	'style_selected_block',
	'transform_selected_block',
];

/**
 * What the selection tools depend on, so they're only offered again when it
 * changes: the block type, whether it can be edited, and what it can become.
 *
 * @return {Object|null} `{ key, clientId, name, mode, transforms }`.
 */
export function selectionState() {
	const store = be();
	const clientId = store.getSelectedBlockClientId();
	if ( ! clientId ) {
		return null;
	}
	const block = store.getBlock( clientId );
	if ( ! block ) {
		return null;
	}
	const mode = store.getBlockEditingMode?.( clientId ) || 'default';
	const root = store.getBlockRootClientId( clientId ) || '';
	const transforms = (
		store.getBlockTransformItems?.( [ block ], root ) || []
	).map( ( t ) => t.name );
	const template = isTemplate( clientId );
	return {
		key: [ block.name, template, transforms.join( ',' ) ].join( '|' ),
		clientId,
		name: block.name,
		mode,
		template,
		transforms,
	};
}

// The selected block, checked against the type the tool was made for.
function current( name ) {
	const state = selectionState();
	if ( ! state || state.name !== name ) {
		throw new Error(
			`This tool was for the selected ${ blockTitle( name ) }, and that's no longer selected. Call get_editor_context.`
		);
	}
	return state.clientId;
}

/**
 * The tools for what's selected now, or none.
 *
 * @param {Object|null} state From selectionState().
 * @return {Object[]} Tools.
 */
export function selectionTools( state ) {
	if ( ! state || state.template ) {
		return [];
	}
	const type = getBlockType( state.name );
	if ( ! type ) {
		return [];
	}
	const title = type.title;
	const tools = [];

	const attrs = attributesSchema( type );
	if ( Object.keys( attrs.properties ).length ) {
		const names = Object.keys( attrs.properties );
		tools.push( {
			name: 'edit_selected_block',
			title: `Edit the selected ${ title }`,
			group: 'Selected block',
			follows: state.name,
			description: `Change the selected block, a ${ title } (${ state.name }): ${ type.description || '' } Set only what should change. Its attributes: ${ names.join( ', ' ) }.`,
			inputSchema: attrs,
			run: ( input ) => {
				const clientId = current( state.name );
				const opened = ensureEditable( clientId, {
					full: changesMoreThanContent(
						state.name,
						Object.keys( input )
					),
				} );
				dispatch( blockEditorStore ).updateBlockAttributes(
					clientId,
					input
				);
				mark( [ clientId ], {
					label: 'Changed',
					kind: 'change',
					ms: 2500,
				} );
				return withOpened(
					{
						changed: Object.keys( input ),
						block: summary( clientId ),
					},
					opened
				);
			},
		} );
	}

	const presets = getPresets( be().getSettings() );
	const design = designSchema( type, presets );
	const variations = (
		select( blocksStore ).getBlockStyles( state.name ) || []
	).map( ( s ) => s.name );
	if ( design || variations.length > 1 ) {
		const schema = design || {
			type: 'object',
			properties: {},
			additionalProperties: false,
		};
		if ( variations.length > 1 ) {
			schema.properties.variation = {
				type: 'string',
				enum: variations,
				description: `One of the ${ title }'s style variations: ${ variations.join( ', ' ) }.`,
			};
		}
		tools.push( {
			name: 'style_selected_block',
			title: `Design the selected ${ title }`,
			group: 'Selected block',
			follows: state.name,
			description: `Change how the selected ${ title } looks, using the theme's presets, so it stays in keeping with the rest of the site. It supports: ${ Object.keys(
				schema.properties
			).join( ', ' ) }. "default" goes back to the theme's.`,
			inputSchema: schema,
			run: ( input ) => {
				const clientId = current( state.name );
				const opened = ensureEditable( clientId );
				const block = be().getBlock( clientId );
				const { variation, ...rest } = input;
				const next = designToAttributes( rest, block.attributes );
				if ( variation ) {
					const classes = ( block.attributes.className || '' )
						.split( /\s+/ )
						.filter( ( c ) => c && ! c.startsWith( 'is-style-' ) );
					if ( variation !== 'default' ) {
						classes.push( `is-style-${ variation }` );
					}
					next.className = classes.join( ' ' ) || undefined;
				}
				dispatch( blockEditorStore ).updateBlockAttributes(
					clientId,
					next
				);
				mark( [ clientId ], {
					label: 'Restyled',
					kind: 'change',
					ms: 2500,
				} );
				return withOpened(
					{
						set: plainAttributes(
							Object.fromEntries(
								Object.entries( next ).map( ( [ k, v ] ) => [
									k,
									v ?? '(theme default)',
								] )
							)
						),
					},
					opened
				);
			},
		} );
	}

	if ( state.transforms.length ) {
		tools.push( {
			name: 'transform_selected_block',
			title: `Turn the selected ${ title } into…`,
			group: 'Selected block',
			follows: state.name,
			description: `Turn the selected ${ title } into another kind of block, keeping its content. It can become: ${ state.transforms
				.map( ( n ) => `${ n } (${ blockTitle( n ) })` )
				.join( ', ' ) }.`,
			inputSchema: {
				type: 'object',
				properties: { to: { type: 'string', enum: state.transforms } },
				required: [ 'to' ],
				additionalProperties: false,
			},
			run: ( { to } ) => transformBlock( current( state.name ), to ),
		} );
	}
	return tools;
}
