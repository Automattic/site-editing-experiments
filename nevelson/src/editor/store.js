/**
 * Nevelson's state: whether the panel is open (not saved: every visit starts
 * with it closed), and how many of the block toolbar's tools there are for
 * the Actions panel in the block's settings.
 */
import { createReduxStore, register } from '@wordpress/data';

export const store = createReduxStore( 'nevelson', {
	reducer( state = { open: false, actions: 0 }, action ) {
		switch ( action.type ) {
			case 'SET_OPEN':
				return { ...state, open: action.open };
			case 'SET_ACTIONS':
				return { ...state, actions: action.count };
		}
		return state;
	},
	actions: {
		setOpen: ( open ) => ( { type: 'SET_OPEN', open } ),
		setActions: ( count ) => ( { type: 'SET_ACTIONS', count } ),
	},
	selectors: {
		isOpen: ( state ) => state.open,
		getActions: ( state ) => state.actions,
	},
} );
register( store );
