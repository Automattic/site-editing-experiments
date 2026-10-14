/**
 * Squarespace-style section chrome in the canvas.
 *
 * Every top-level block (or every block in Post Content when editing a page)
 * is treated as a section. Hovering one outlines it, shows its name in a tab,
 * puts "Add section" buttons on its top and bottom edges and a toolbar in its
 * top-right corner: Edit, Colours, move up, move down, duplicate, delete.
 */
import clsx from 'clsx';
import { __, sprintf } from '@wordpress/i18n';
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { useDispatch, useSelect } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { getBlockType } from '@wordpress/blocks';
import { store as coreStore } from '@wordpress/core-data';
import { store as noticesStore } from '@wordpress/notices';
import { Dropdown } from '@wordpress/components';
import {
	Icon,
	chevronDown,
	chevronUp,
	color,
	copy,
	pencil,
	plus,
	trash,
} from '@wordpress/icons';

import { STORE_NAME } from './store';
import { getThemeFromClassName, withTheme } from './settings';
import ThemeSwatches from './theme-swatches';

const SECTION_CONTAINERS = [ 'core/post-content' ];

function templatePartLabel( attributes ) {
	const area = attributes?.area || attributes?.slug || attributes?.tagName;
	if ( area === 'header' ) {
		return __(
			'Header · shown on every page',
			'squarespace-style-site-editor'
		);
	}
	if ( area === 'footer' ) {
		return __(
			'Footer · shown on every page',
			'squarespace-style-site-editor'
		);
	}
	return sprintf(
		/* translators: %s: template part name. */
		__( '%s · shared', 'squarespace-style-site-editor' ),
		attributes?.slug ||
			__( 'Template part', 'squarespace-style-site-editor' )
	);
}

function useSectionInfo( clientId, name ) {
	return useSelect(
		( select ) => {
			if ( name === 'core/post-content' ) {
				return null;
			}
			const be = select( blockEditorStore );
			const rootClientId = be.getBlockRootClientId( clientId ) || '';
			if (
				rootClientId &&
				! SECTION_CONTAINERS.includes( be.getBlockName( rootClientId ) )
			) {
				return null;
			}
			if ( be.getBlockEditingMode( clientId ) !== 'default' ) {
				return null;
			}

			const order = be.getBlockOrder( rootClientId );
			const index = order.indexOf( clientId );
			const attributes = be.getBlockAttributes( clientId ) || {};
			const isTemplatePart = name === 'core/template-part';
			const isShared = ( id ) =>
				id && be.getBlockName( id ) === 'core/template-part';
			const locked = !! be.getTemplateLock( rootClientId || undefined );

			return {
				rootClientId,
				index,
				isLast: index === order.length - 1,
				isTemplatePart,
				canMoveUp:
					! locked &&
					! isTemplatePart &&
					index > 0 &&
					! isShared( order[ index - 1 ] ),
				canMoveDown:
					! locked &&
					! isTemplatePart &&
					index < order.length - 1 &&
					! isShared( order[ index + 1 ] ),
				canEdit: ! locked && ! isTemplatePart,
				// No sections above the header or below the footer.
				canAddBefore: ! locked && ! ( isTemplatePart && index === 0 ),
				canAddAfter: ! locked && ! isTemplatePart,
				label: isTemplatePart
					? templatePartLabel( attributes )
					: attributes.metadata?.name ||
						getBlockType( name )?.title ||
						__( 'Section', 'squarespace-style-site-editor' ),
				theme: getThemeFromClassName( attributes.className ),
				className: attributes.className,
			};
		},
		[ clientId, name ]
	);
}

export function AddSectionButton( { rootClientId, index, position } ) {
	const { openSectionPicker } = useDispatch( STORE_NAME );
	return (
		<div className={ `sse-add-section is-${ position }` }>
			<button
				type="button"
				className="sse-add-section__button"
				onClick={ () => openSectionPicker( rootClientId, index ) }
			>
				<Icon icon={ plus } size={ 18 } />
				{ __( 'Add section', 'squarespace-style-site-editor' ) }
			</button>
		</div>
	);
}

function ToolbarIconButton( { icon, label, onClick, disabled, ...rest } ) {
	return (
		<button
			type="button"
			className="sse-section-toolbar__button"
			aria-label={ label }
			title={ label }
			onClick={ onClick }
			disabled={ disabled }
			{ ...rest }
		>
			<Icon icon={ icon } size={ 20 } />
		</button>
	);
}

function SectionToolbar( { clientId, info } ) {
	const {
		selectBlock,
		moveBlocksUp,
		moveBlocksDown,
		duplicateBlocks,
		removeBlock,
		updateBlockAttributes,
	} = useDispatch( blockEditorStore );
	const { undo } = useDispatch( coreStore );
	const { createSuccessNotice } = useDispatch( noticesStore );
	const interfaceDispatch = useDispatch( 'core/interface' );

	const openSettings = () => {
		selectBlock( clientId );
		try {
			interfaceDispatch?.enableComplementaryArea?.(
				'core',
				'edit-post/block'
			);
		} catch {
			// Older versions use a different sidebar id; selecting is enough.
		}
	};

	const remove = () => {
		removeBlock( clientId, false );
		createSuccessNotice(
			__( 'Section deleted.', 'squarespace-style-site-editor' ),
			{
				type: 'snackbar',
				actions: [
					{
						label: __( 'Undo', 'squarespace-style-site-editor' ),
						onClick: () => undo(),
					},
				],
			}
		);
	};

	return (
		<div
			className="sse-section-toolbar"
			role="toolbar"
			aria-label={ __( 'Section', 'squarespace-style-site-editor' ) }
		>
			<button
				type="button"
				className="sse-section-toolbar__edit"
				onClick={ openSettings }
			>
				<Icon icon={ pencil } size={ 18 } />
				{ info.isTemplatePart
					? __( 'Edit', 'squarespace-style-site-editor' )
					: __( 'Edit section', 'squarespace-style-site-editor' ) }
			</button>
			{ info.canEdit && (
				<Dropdown
					popoverProps={ {
						placement: 'bottom-end',
						className: 'sse-popover',
					} }
					renderToggle={ ( { isOpen, onToggle } ) => (
						<ToolbarIconButton
							icon={ color }
							label={ __(
								'Section colours',
								'squarespace-style-site-editor'
							) }
							onClick={ onToggle }
							aria-expanded={ isOpen }
						/>
					) }
					renderContent={ () => (
						<div className="sse-popover__body">
							<p className="sse-popover__title">
								{ __(
									'Section colours',
									'squarespace-style-site-editor'
								) }
							</p>
							<ThemeSwatches
								value={ info.theme }
								onChange={ ( slug ) =>
									updateBlockAttributes( clientId, {
										className: withTheme(
											info.className,
											slug
										),
									} )
								}
							/>
						</div>
					) }
				/>
			) }
			{ ( info.canMoveUp || info.canMoveDown ) && (
				<>
					<ToolbarIconButton
						icon={ chevronUp }
						label={ __(
							'Move section up',
							'squarespace-style-site-editor'
						) }
						disabled={ ! info.canMoveUp }
						onClick={ () =>
							moveBlocksUp( [ clientId ], info.rootClientId )
						}
					/>
					<ToolbarIconButton
						icon={ chevronDown }
						label={ __(
							'Move section down',
							'squarespace-style-site-editor'
						) }
						disabled={ ! info.canMoveDown }
						onClick={ () =>
							moveBlocksDown( [ clientId ], info.rootClientId )
						}
					/>
				</>
			) }
			{ info.canEdit && (
				<>
					<ToolbarIconButton
						icon={ copy }
						label={ __(
							'Duplicate section',
							'squarespace-style-site-editor'
						) }
						onClick={ () => duplicateBlocks( [ clientId ] ) }
					/>
					<ToolbarIconButton
						icon={ trash }
						label={ __(
							'Delete section',
							'squarespace-style-site-editor'
						) }
						onClick={ remove }
					/>
				</>
			) }
		</div>
	);
}

function SectionAnchor( { clientId, info } ) {
	return (
		<div className="sse-section-anchor" data-sse-section-chrome="">
			{ info.canAddBefore && (
				<AddSectionButton
					rootClientId={ info.rootClientId }
					index={ info.index }
					position="top"
				/>
			) }
			<div
				className={ clsx( 'sse-section-tab', {
					'is-shared': info.isTemplatePart,
				} ) }
			>
				{ info.label }
			</div>
			<SectionToolbar clientId={ clientId } info={ info } />
		</div>
	);
}

/**
 * When Post Content is empty there are no sections to hover, so offer the
 * first one directly.
 *
 * @param {Object} props
 * @param {string} props.clientId Post Content block.
 */
function EmptyPostContent( { clientId } ) {
	const isEmpty = useSelect(
		( select ) => {
			const be = select( blockEditorStore );
			return (
				be.getBlockCount( clientId ) === 0 &&
				be.getBlockEditingMode( clientId ) !== 'disabled'
			);
		},
		[ clientId ]
	);
	if ( ! isEmpty ) {
		return null;
	}
	return (
		<div
			className="sse-section-anchor is-empty-page"
			data-sse-section-chrome=""
		>
			<AddSectionButton
				rootClientId={ clientId }
				index={ 0 }
				position="first"
			/>
		</div>
	);
}

const withSectionControls = createHigherOrderComponent(
	( BlockListBlock ) =>
		function SSESectionBlock( props ) {
			const { clientId, name } = props;
			const info = useSectionInfo( clientId, name );

			if ( name === 'core/post-content' ) {
				return (
					<>
						<BlockListBlock { ...props } />
						<EmptyPostContent clientId={ clientId } />
					</>
				);
			}

			if ( ! info ) {
				return <BlockListBlock { ...props } />;
			}

			return (
				<>
					<SectionAnchor clientId={ clientId } info={ info } />
					<BlockListBlock
						{ ...props }
						className={ clsx( props.className, 'sse-section', {
							'sse-section--shared': info.isTemplatePart,
						} ) }
					/>
					{ info.isLast && info.canAddAfter && (
						<div
							className="sse-section-anchor is-end"
							data-sse-section-chrome=""
						>
							<AddSectionButton
								rootClientId={ info.rootClientId }
								index={ info.index + 1 }
								position="bottom"
							/>
						</div>
					) }
				</>
			);
		},
	'withSectionControls'
);

addFilter(
	'editor.BlockListBlock',
	'sse/section-controls',
	withSectionControls
);
