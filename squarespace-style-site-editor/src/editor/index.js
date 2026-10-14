import { registerPlugin } from '@wordpress/plugins';

import './store';
import './section-controls';
import Chrome from './chrome';
import EmptyCanvas from './empty-canvas';
import SectionPicker from './section-picker';
import SiteStyles from './site-styles';
import './style.scss';

registerPlugin( 'sse-editor', {
	render: () => (
		<>
			<Chrome />
			<SectionPicker />
			<EmptyCanvas />
			<SiteStyles />
		</>
	),
} );
