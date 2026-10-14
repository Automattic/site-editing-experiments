import { createReduxStore, register } from '@wordpress/data';

export const STORE_NAME = 'sse/editor';

const DEFAULT_STATE = {
	// Where the section picker will insert: { rootClientId, index }.
	sectionPicker: null,
	// The section panel that's open: { clientId, panel } where panel is
	// 'edit' or 'layouts'.
	sectionPanel: null,
};

const actions = {
	openSectionPicker( rootClientId, index ) {
		return { type: 'OPEN_SECTION_PICKER', rootClientId, index };
	},
	closeSectionPicker() {
		return { type: 'CLOSE_SECTION_PICKER' };
	},
	openSectionPanel( clientId, panel = 'edit' ) {
		return { type: 'OPEN_SECTION_PANEL', clientId, panel };
	},
	closeSectionPanel() {
		return { type: 'CLOSE_SECTION_PANEL' };
	},
};

function reducer( state = DEFAULT_STATE, action ) {
	switch ( action.type ) {
		case 'OPEN_SECTION_PICKER':
			return {
				...state,
				sectionPanel: null,
				sectionPicker: {
					rootClientId: action.rootClientId || '',
					index: action.index,
				},
			};
		case 'CLOSE_SECTION_PICKER':
			return { ...state, sectionPicker: null };
		case 'OPEN_SECTION_PANEL':
			return {
				...state,
				sectionPanel: {
					clientId: action.clientId,
					panel: action.panel,
				},
			};
		case 'CLOSE_SECTION_PANEL':
			return { ...state, sectionPanel: null };
	}
	return state;
}

const selectors = {
	getSectionPicker( state ) {
		return state.sectionPicker;
	},
	getSectionPanel( state ) {
		return state.sectionPanel;
	},
};

export const store = createReduxStore( STORE_NAME, {
	reducer,
	actions,
	selectors,
} );

register( store );
