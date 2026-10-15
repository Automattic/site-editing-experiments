import { createReduxStore, register } from '@wordpress/data';

export const STORE_NAME = 'sse/editor';

const DEFAULT_STATE = {
	// Where the section picker will insert: { rootClientId, index }.
	sectionPicker: null,
	// The section panel that's open: { clientId, panel, tab } where panel is
	// 'edit' or 'layouts', and tab the Edit section tab to start on.
	sectionPanel: null,
	// Whether sections show their colour theme in the canvas (while Site
	// Styles → Colours is open).
	showThemeTags: false,
	// The header or footer being edited, as in Squarespace's "Edit site
	// header": everything else is dimmed.
	editingPart: null,
};

const actions = {
	openSectionPicker( rootClientId, index ) {
		return { type: 'OPEN_SECTION_PICKER', rootClientId, index };
	},
	closeSectionPicker() {
		return { type: 'CLOSE_SECTION_PICKER' };
	},
	openSectionPanel( clientId, panel = 'edit', tab = undefined ) {
		return { type: 'OPEN_SECTION_PANEL', clientId, panel, tab };
	},
	closeSectionPanel() {
		return { type: 'CLOSE_SECTION_PANEL' };
	},
	startEditingPart( clientId ) {
		return { type: 'START_EDITING_PART', clientId };
	},
	stopEditingPart() {
		return { type: 'STOP_EDITING_PART' };
	},
	setShowThemeTags( show ) {
		return { type: 'SET_SHOW_THEME_TAGS', show };
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
					tab: action.tab,
				},
			};
		case 'CLOSE_SECTION_PANEL':
			return { ...state, sectionPanel: null };
		case 'START_EDITING_PART':
			return {
				...state,
				editingPart: action.clientId,
				sectionPanel: null,
			};
		case 'STOP_EDITING_PART':
			return { ...state, editingPart: null };
		case 'SET_SHOW_THEME_TAGS':
			return { ...state, showThemeTags: !! action.show };
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
	getEditingPart( state ) {
		return state.editingPart;
	},
	getShowThemeTags( state ) {
		return state.showThemeTags;
	},
};

export const store = createReduxStore( STORE_NAME, {
	reducer,
	actions,
	selectors,
} );

register( store );
