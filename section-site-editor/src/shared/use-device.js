import { useSelect } from '@wordpress/data';

/**
 * Whether the editor is previewing the mobile layout. Freeform sections keep a
 * separate layout for mobile, edited while this preview is on.
 *
 * @return {boolean} True in the Mobile preview.
 */
export function useIsMobilePreview() {
	return useSelect( ( select ) => {
		const editor = select( 'core/editor' );
		const editSite = select( 'core/edit-site' );
		const type =
			editor?.getDeviceType?.() ??
			editSite?.__experimentalGetPreviewDeviceType?.();
		return type === 'Mobile';
	}, [] );
}
