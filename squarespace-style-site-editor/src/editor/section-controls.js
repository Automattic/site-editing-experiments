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
import { createHigherOrderComponent, useRefEffect } from '@wordpress/compose';
import { useDispatch, useRegistry, useSelect } from '@wordpress/data';
import { useState } from '@wordpress/element';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { getBlockType, serialize } from '@wordpress/blocks';
import { store as coreStore } from '@wordpress/core-data';
import { store as noticesStore } from '@wordpress/notices';
import { Popover } from '@wordpress/components';
import {
	Icon,
	arrowDown,
	arrowUp,
	copy,
	layout,
	pencil,
	trash,
} from '@wordpress/icons';

import { STORE_NAME } from './store';
import { heart } from '../shared/icons';
import { useIsMobilePreview } from '../shared/use-device';
import {
	getSectionThemes,
	getThemeFromClassName,
	useSitePalette,
} from './settings';
import { EditSectionPanel, LayoutsPanel } from './section-panel';
import { categoryForSection, useSectionPatterns } from './section-patterns';

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
				attributes,
				area: attributes.area || attributes.slug,
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
				{ __( 'Add section', 'squarespace-style-site-editor' ) }
			</button>
		</div>
	);
}

function IconButton( { icon, label, onClick, disabled, ...rest } ) {
	return (
		<button
			type="button"
			className="sse-section-menu__icon"
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

function MenuItem( { icon, children, onClick, isDestructive, ...rest } ) {
	return (
		<button
			type="button"
			className={ clsx( 'sse-section-menu__item', {
				'is-destructive': isDestructive,
			} ) }
			onClick={ onClick }
			{ ...rest }
		>
			<Icon icon={ icon } size={ 20 } />
			<span>{ children }</span>
		</button>
	);
}

/**
 * The stacked menu in a section's top-right corner: Edit section, View
 * layouts, an icon row (duplicate, save, move up, move down) and Remove.
 *
 * @param {Object} props
 * @param {string} props.clientId Section block.
 * @param {Object} props.info     From useSectionInfo().
 */
function SectionMenu( { clientId, info } ) {
	const registry = useRegistry();
	const [ menuElement, setMenuElement ] = useState( null );
	const {
		selectBlock,
		moveBlocksUp,
		moveBlocksDown,
		duplicateBlocks,
		removeBlock,
	} = useDispatch( blockEditorStore );
	const { undo, saveEntityRecord } = useDispatch( coreStore );
	const { createSuccessNotice, createErrorNotice } =
		useDispatch( noticesStore );
	const { openSectionPanel, closeSectionPanel } = useDispatch( STORE_NAME );
	const openPanel = useSelect(
		( select ) => {
			const panel = select( STORE_NAME ).getSectionPanel();
			return panel?.clientId === clientId ? panel.panel : null;
		},
		[ clientId ]
	);
	const sectionPatterns = useSectionPatterns();
	const category = categoryForSection( info.attributes, sectionPatterns );
	const isMobile = useIsMobilePreview();
	// Layouts are a desktop decision; on mobile you arrange, not redesign.
	const hasLayouts =
		! isMobile &&
		info.canEdit &&
		category &&
		sectionPatterns.categories[ category ]?.patterns.length > 1;

	const remove = () => {
		closeSectionPanel();
		removeBlock( clientId, false );
		createSuccessNotice(
			__( 'Section removed.', 'squarespace-style-site-editor' ),
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

	const save = async () => {
		const block = registry.select( blockEditorStore ).getBlock( clientId );
		try {
			await saveEntityRecord(
				'postType',
				'wp_block',
				{
					title: info.label,
					content: serialize( [ block ] ),
					status: 'publish',
					meta: { wp_pattern_sync_status: 'unsynced' },
				},
				{ throwOnError: true }
			);
			// So "Saved" in the picker picks it up straight away.
			registry
				.dispatch( coreStore )
				.invalidateResolutionForStoreSelector( 'getEntityRecords' );
			createSuccessNotice(
				__(
					'Section saved. Find it under Saved when you add a section.',
					'squarespace-style-site-editor'
				),
				{ type: 'snackbar' }
			);
		} catch ( error ) {
			createErrorNotice(
				error?.message ||
					__(
						'The section couldn’t be saved.',
						'squarespace-style-site-editor'
					),
				{ type: 'snackbar' }
			);
		}
	};

	let panel = null;
	if ( openPanel === 'edit' ) {
		panel = (
			<EditSectionPanel
				clientId={ clientId }
				onClose={ closeSectionPanel }
			/>
		);
	} else if ( openPanel === 'layouts' ) {
		panel = (
			<LayoutsPanel clientId={ clientId } onClose={ closeSectionPanel } />
		);
	}

	return (
		<>
			<div
				className="sse-section-menu"
				ref={ setMenuElement }
				role="toolbar"
				aria-label={ __( 'Section', 'squarespace-style-site-editor' ) }
			>
				{ info.isTemplatePart ? (
					<MenuItem
						icon={ pencil }
						onClick={ () => selectBlock( clientId ) }
					>
						{ info.area === 'footer'
							? __(
									'Edit footer',
									'squarespace-style-site-editor'
								)
							: __(
									'Edit header',
									'squarespace-style-site-editor'
								) }
					</MenuItem>
				) : (
					<MenuItem
						icon={ pencil }
						aria-expanded={ openPanel === 'edit' }
						onClick={ () =>
							openPanel === 'edit'
								? closeSectionPanel()
								: openSectionPanel( clientId, 'edit' )
						}
					>
						{ __(
							'Edit section',
							'squarespace-style-site-editor'
						) }
					</MenuItem>
				) }
				{ hasLayouts && (
					<MenuItem
						icon={ layout }
						aria-expanded={ openPanel === 'layouts' }
						onClick={ () =>
							openPanel === 'layouts'
								? closeSectionPanel()
								: openSectionPanel( clientId, 'layouts' )
						}
					>
						{ __(
							'View layouts',
							'squarespace-style-site-editor'
						) }
					</MenuItem>
				) }
				{ info.canEdit && (
					<div className="sse-section-menu__icons">
						<IconButton
							icon={ copy }
							label={ __(
								'Duplicate section',
								'squarespace-style-site-editor'
							) }
							onClick={ () => duplicateBlocks( [ clientId ] ) }
						/>
						<IconButton
							icon={ heart }
							label={ __(
								'Save section',
								'squarespace-style-site-editor'
							) }
							onClick={ save }
						/>
						<IconButton
							icon={ arrowUp }
							label={ __(
								'Move section up',
								'squarespace-style-site-editor'
							) }
							disabled={ ! info.canMoveUp }
							onClick={ () =>
								moveBlocksUp( [ clientId ], info.rootClientId )
							}
						/>
						<IconButton
							icon={ arrowDown }
							label={ __(
								'Move section down',
								'squarespace-style-site-editor'
							) }
							disabled={ ! info.canMoveDown }
							onClick={ () =>
								moveBlocksDown(
									[ clientId ],
									info.rootClientId
								)
							}
						/>
					</div>
				) }
				{ info.canEdit && (
					<MenuItem icon={ trash } isDestructive onClick={ remove }>
						{ __( 'Remove', 'squarespace-style-site-editor' ) }
					</MenuItem>
				) }
			</div>
			{ panel && menuElement && (
				<Popover
					anchor={ menuElement }
					placement="left-start"
					offset={ 12 }
					className="sse-panel-popover"
					onClose={ closeSectionPanel }
					focusOnMount="firstElement"
				>
					{ panel }
				</Popover>
			) }
		</>
	);
}

/**
 * Keeps a tall section's menu in view while you scroll through it, by
 * setting --sse-stick on the anchor (how far the menu should drop).
 *
 * @return {Function} Ref callback for the anchor element.
 */
function useStickyMenu() {
	return useRefEffect( ( anchor ) => {
		const view = anchor.ownerDocument.defaultView;
		let frame;
		const update = () => {
			frame = null;
			const section = anchor.nextElementSibling;
			if ( ! section ) {
				return;
			}
			const top = anchor.getBoundingClientRect().top;
			const height = section.getBoundingClientRect().height;
			const offset = Math.max( 0, Math.min( -top + 12, height - 320 ) );
			anchor.style.setProperty( '--sse-stick', `${ offset }px` );
		};
		const onScroll = () => {
			if ( ! frame ) {
				frame = view.requestAnimationFrame( update );
			}
		};
		update();
		view.addEventListener( 'scroll', onScroll, { passive: true } );
		view.addEventListener( 'resize', onScroll );
		return () => {
			view.removeEventListener( 'scroll', onScroll );
			view.removeEventListener( 'resize', onScroll );
			if ( frame ) {
				view.cancelAnimationFrame( frame );
			}
		};
	}, [] );
}

function ThemeTag( { slug } ) {
	const palette = useSitePalette();
	const theme = getSectionThemes().find( ( t ) => t.slug === slug );
	if ( ! theme ) {
		return null;
	}
	return (
		<div
			className="sse-theme-tag"
			style={ {
				background: palette[ theme.background ],
				color: palette[ theme.text ],
			} }
		>
			<span style={ { color: palette[ theme.heading ] } }>Aa</span>
			{ theme.label }
		</div>
	);
}

function SectionAnchor( { clientId, info } ) {
	const { isPanelOpen, showThemeTag } = useSelect(
		( select ) => ( {
			isPanelOpen:
				select( STORE_NAME ).getSectionPanel()?.clientId === clientId,
			showThemeTag: select( STORE_NAME ).getShowThemeTags(),
		} ),
		[ clientId ]
	);
	const stickyRef = useStickyMenu();
	return (
		<div
			ref={ stickyRef }
			className={ clsx( 'sse-section-anchor', {
				'is-panel-open': isPanelOpen,
			} ) }
			data-sse-section-chrome=""
		>
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
			<SectionMenu clientId={ clientId } info={ info } />
			{ showThemeTag && info.theme && <ThemeTag slug={ info.theme } /> }
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
