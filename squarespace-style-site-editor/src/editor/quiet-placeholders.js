/**
 * A page shown inside its template brings the template's own placeholders
 * with it: an empty featured image, a site logo that hasn't been set, a
 * tagline that says "Write site tagline…". None of them show on the site,
 * and Squarespace has nothing like them on the page, so while they're
 * locked (not being edited) they're hidden. Editing the header or footer
 * brings them back, so a logo can still be added there.
 */
import clsx from 'clsx';
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { useSelect } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { store as coreStore } from '@wordpress/core-data';
import { store as editorStore } from '@wordpress/editor';

const QUIET = [
	'core/post-featured-image',
	'core/site-logo',
	'core/site-tagline',
];

const withQuietPlaceholders = createHigherOrderComponent(
	( BlockListBlock ) =>
		function SSEQuietPlaceholder( props ) {
			const { clientId, name } = props;
			const isQuiet = QUIET.includes( name );
			const quiet = useSelect(
				( select ) => {
					if ( ! isQuiet ) {
						return false;
					}
					const be = select( blockEditorStore );
					// Browse mode previews the page, where nothing is
					// being edited.
					const locked =
						be.getSettings().isPreviewMode ||
						be.getBlockEditingMode( clientId ) !== 'default';
					if (
						select( editorStore ).getRenderingMode() !==
							'template-locked' ||
						! locked
					) {
						return false;
					}
					if ( name === 'core/site-tagline' ) {
						const site = select( coreStore ).getEditedEntityRecord(
							'root',
							'site'
						);
						return ! site?.description;
					}
					return true;
				},
				[ clientId, name, isQuiet ]
			);
			if ( ! quiet ) {
				return <BlockListBlock { ...props } />;
			}
			return (
				<BlockListBlock
					{ ...props }
					className={ clsx(
						props.className,
						name === 'core/site-tagline'
							? 'sse-quiet-empty'
							: 'sse-quiet-placeholder'
					) }
				/>
			);
		},
	'withQuietPlaceholders'
);

addFilter(
	'editor.BlockListBlock',
	'squarespace-style-site-editor/quiet-placeholders',
	withQuietPlaceholders
);
