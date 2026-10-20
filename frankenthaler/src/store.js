/**
 * Which toolbar is showing: 'write' or 'design'. The choice belongs to one
 * selected block; selecting another block picks that block's usual toolbar
 * again (see defaultMode).
 */
import { createReduxStore, register } from '@wordpress/data';

const DEFAULT_STATE = { mode: null, clientId: null };

export const STORE = 'frankenthaler/mode';

export const store = createReduxStore( STORE, {
	reducer( state = DEFAULT_STATE, action ) {
		if ( action.type === 'SET_MODE' ) {
			return { mode: action.mode, clientId: action.clientId };
		}
		return state;
	},
	actions: {
		setMode: ( mode, clientId ) => ( { type: 'SET_MODE', mode, clientId } ),
	},
	selectors: {
		getChosenMode: ( state, clientId ) =>
			state.clientId === clientId ? state.mode : null,
	},
} );

register( store );

// Blocks that are mostly words open in the writing toolbar; everything else in the design one.
export const WRITE_FIRST = [
	'core/paragraph',
	'core/heading',
	'core/quote',
	'core/pullquote',
	'core/verse',
	'core/preformatted',
	'core/code',
	'core/list',
	'core/list-item',
];

// Blocks that have words to write in at all.
export const HAS_WORDS = [ ...WRITE_FIRST, 'core/button' ];

export function defaultMode( name ) {
	return WRITE_FIRST.includes( name ) ? 'write' : 'design';
}
