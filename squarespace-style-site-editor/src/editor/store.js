import { createReduxStore, register } from '@wordpress/data';

export const STORE_NAME = 'sse/editor';

const DEFAULT_STATE = {
	// Where the section picker will insert: { rootClientId, index }.
	sectionPicker: null,
};

const actions = {
	openSectionPicker( rootClientId, index ) {
		return { type: 'OPEN_SECTION_PICKER', rootClientId, index };
	},
	closeSectionPicker() {
		return { type: 'CLOSE_SECTION_PICKER' };
	},
};

function reducer( state = DEFAULT_STATE, action ) {
	switch ( action.type ) {
		case 'OPEN_SECTION_PICKER':
			return {
				...state,
				sectionPicker: {
					rootClientId: action.rootClientId || '',
					index: action.index,
				},
			};
		case 'CLOSE_SECTION_PICKER':
			return { ...state, sectionPicker: null };
	}
	return state;
}

const selectors = {
	getSectionPicker( state ) {
		return state.sectionPicker;
	},
};

export const store = createReduxStore( STORE_NAME, {
	reducer,
	actions,
	selectors,
} );

register( store );
