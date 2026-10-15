import { registerPlugin } from '@wordpress/plugins';

import './store';
import './section-controls';
import './quiet-placeholders';
import Chrome from './chrome';
import EmptyCanvas from './empty-canvas';
import { PartEditingManager } from './part-editing';
import SectionPicker from './section-picker';
import SectionToolbarVisibility from './section-toolbar';
import SiteStyles from './site-styles';
import './style.scss';

registerPlugin( 'sse-editor', {
	render: () => (
		<>
			<Chrome />
			<PartEditingManager />
			<SectionPicker />
			<SectionToolbarVisibility />
			<EmptyCanvas />
			<SiteStyles />
		</>
	),
} );
