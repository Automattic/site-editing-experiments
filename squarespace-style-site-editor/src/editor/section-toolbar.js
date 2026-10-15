import { store as blockEditorStore } from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';
import { useEffect } from '@wordpress/element';

import { useIsEditMode } from './chrome';

const SECTION_CONTAINERS = [ 'core/post-content' ];

/**
 * Squarespace shows no block toolbar for a section itself: the section menu
 * (Edit section, View layouts, move, remove) does that job, and a freeform
 * section has its own Add Block bar where core's toolbar would sit. So while
 * a whole section is selected, hide core's toolbar. It comes back as soon as
 * it gets keyboard focus (Alt+F10), so it's never out of reach.
 */
export default function SectionToolbarVisibility() {
	const isEditMode = useIsEditMode();
	const isSection = useSelect( ( select ) => {
		const be = select( blockEditorStore );
		const ids = be.getSelectedBlockClientIds();
		if ( ids.length !== 1 ) {
			return false;
		}
		const [ id ] = ids;
		const name = be.getBlockName( id );
		if ( name === 'sse/fluid-section' ) {
			return true;
		}
		if ( name === 'core/post-content' || name === 'core/template-part' ) {
			return false;
		}
		const root = be.getBlockRootClientId( id );
		return ! root || SECTION_CONTAINERS.includes( be.getBlockName( root ) );
	}, [] );

	const hide = isEditMode && isSection;
	useEffect( () => {
		document.body.classList.toggle( 'sse-hide-section-toolbar', hide );
		return () =>
			document.body.classList.remove( 'sse-hide-section-toolbar' );
	}, [ hide ] );

	return null;
}
