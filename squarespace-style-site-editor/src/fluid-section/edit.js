import clsx from 'clsx';
import { __ } from '@wordpress/i18n';
import {
	BlockControls,
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { createBlock } from '@wordpress/blocks';
import {
	Button,
	Dropdown,
	PanelBody,
	RangeControl,
	ToolbarDropdownMenu,
	ToolbarGroup,
} from '@wordpress/components';
import { useDispatch, useRegistry, useSelect } from '@wordpress/data';
import { plus } from '@wordpress/icons';

import {
	DESKTOP_COLUMNS,
	MOBILE_COLUMNS,
	bottomRow,
	normalizeLayout,
} from '../shared/grid';
import { findFreeSpot, getAddBlockItems } from '../shared/add-block-items';
import AddBlockPanel from '../shared/add-block-panel';
import { layers } from '../shared/icons';
import { useIsMobilePreview } from '../shared/use-device';
import { sectionStyle } from './save';

function GridOverlay( { columns, rows } ) {
	const cells = [];
	for ( let i = 0; i < columns * rows; i++ ) {
		cells.push( <span key={ i } /> );
	}
	return (
		<div className="wp-block-sse-fluid-section__overlay" aria-hidden="true">
			{ cells }
		</div>
	);
}

export default function Edit( {
	attributes,
	setAttributes,
	clientId,
	isSelected,
} ) {
	const { rows, mobileRows } = attributes;
	const isMobile = useIsMobilePreview();
	const registry = useRegistry();
	const { insertBlock, selectBlock, updateBlockAttributes } =
		useDispatch( blockEditorStore );
	const editorDispatch = useDispatch( 'core/editor' );

	const { hasChildSelected, items } = useSelect(
		( select ) => {
			const be = select( blockEditorStore );
			return {
				hasChildSelected: be.hasSelectedInnerBlock( clientId, true ),
				items: be.getBlocks( clientId ),
			};
		},
		[ clientId ]
	);

	const active = isSelected || hasChildSelected;
	const hasMobileLayout = mobileRows > 0;
	const columns = isMobile ? MOBILE_COLUMNS : DESKTOP_COLUMNS;
	const desktopBottom = bottomRow(
		items.map( ( b ) => normalizeLayout( b.attributes.layout ) )
	);
	const mobileBottom = bottomRow(
		items.map( ( b ) => b.attributes.mobileLayout )
	);

	const addItem = ( item ) => {
		const desktopLayouts = items.map( ( b ) =>
			normalizeLayout( b.attributes.layout )
		);
		const layout = findFreeSpot(
			desktopLayouts,
			item.w,
			item.h,
			DESKTOP_COLUMNS,
			rows
		);
		let mobileLayout;
		if ( hasMobileLayout ) {
			mobileLayout = findFreeSpot(
				items.map( ( b ) => b.attributes.mobileLayout ),
				MOBILE_COLUMNS,
				Math.min( item.h, 6 ),
				MOBILE_COLUMNS,
				mobileRows
			);
		}
		const inner = item.create();
		const block = createBlock( 'sse/fluid-item', { layout, mobileLayout }, [
			inner,
		] );
		registry.batch( () => {
			insertBlock( block, items.length, clientId, false );
			setAttributes( {
				rows: Math.max( rows, layout.r + layout.h - 1 ),
				...( mobileLayout
					? {
							mobileRows: Math.max(
								mobileRows,
								mobileLayout.r + mobileLayout.h - 1
							),
						}
					: {} ),
			} );
		} );
		// After the Add block popover has closed and handed focus back.
		setTimeout( () => selectBlock( inner.clientId, -1 ), 50 );
	};

	const resetMobile = () => {
		registry.batch( () => {
			items.forEach( ( b ) =>
				updateBlockAttributes( b.clientId, { mobileLayout: undefined } )
			);
			setAttributes( { mobileRows: 0 } );
		} );
	};

	const addBlockControls = getAddBlockItems().map( ( item ) => ( {
		title: item.label,
		icon: item.icon,
		onClick: () => addItem( item ),
	} ) );

	const blockProps = useBlockProps( {
		className: clsx( {
			'has-mobile-layout': hasMobileLayout,
			'is-sse-active': active,
		} ),
		style: sectionStyle( attributes ),
	} );

	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'wp-block-sse-fluid-section__grid' },
		{ renderAppender: false, templateLock: false }
	);

	let overlayRows = rows;
	if ( isMobile ) {
		overlayRows = hasMobileLayout ? mobileRows : 0;
	}

	return (
		<>
			<BlockControls group="other">
				<ToolbarGroup>
					<ToolbarDropdownMenu
						icon={ plus }
						label={ __(
							'Add block',
							'squarespace-style-site-editor'
						) }
						controls={ addBlockControls }
					/>
				</ToolbarGroup>
			</BlockControls>
			<InspectorControls>
				<PanelBody
					title={ __( 'Grid', 'squarespace-style-site-editor' ) }
				>
					<RangeControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						label={ __( 'Rows', 'squarespace-style-site-editor' ) }
						value={ rows }
						min={ Math.max( 1, desktopBottom ) }
						max={ 80 }
						onChange={ ( value ) =>
							setAttributes( { rows: value } )
						}
					/>
					{ hasMobileLayout ? (
						<>
							<RangeControl
								__nextHasNoMarginBottom
								__next40pxDefaultSize
								label={ __(
									'Rows on mobile',
									'squarespace-style-site-editor'
								) }
								value={ mobileRows }
								min={ Math.max( 1, mobileBottom ) }
								max={ 120 }
								onChange={ ( value ) =>
									setAttributes( { mobileRows: value } )
								}
							/>
							<Button
								__next40pxDefaultSize
								variant="secondary"
								onClick={ resetMobile }
							>
								{ __(
									'Reset mobile layout',
									'squarespace-style-site-editor'
								) }
							</Button>
						</>
					) : (
						<p className="components-base-control__help">
							{ __(
								'On mobile, blocks stack in reading order. Switch the preview to Mobile and move anything to arrange a separate mobile layout.',
								'squarespace-style-site-editor'
							) }
						</p>
					) }
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps }>
				<div className="wp-block-sse-fluid-section__stage">
					{ active && overlayRows > 0 && (
						<GridOverlay columns={ columns } rows={ overlayRows } />
					) }
					<div { ...innerBlocksProps } />
				</div>
				{
					<div
						className={ clsx( 'sse-fluid-bar', {
							'is-visible': active || items.length === 0,
						} ) }
					>
						<Button
							className="sse-fluid-bar__layers"
							icon={ layers }
							label={ __(
								'Blocks in this section',
								'squarespace-style-site-editor'
							) }
							onClick={ () => {
								selectBlock( clientId );
								editorDispatch?.setIsListViewOpened?.( true );
							} }
						/>
						<Dropdown
							popoverProps={ {
								placement: 'bottom-start',
								className: 'sse-add-block-popover',
							} }
							renderToggle={ ( { isOpen, onToggle } ) => (
								<Button
									className="sse-fluid-bar__add"
									icon={ plus }
									onClick={ onToggle }
									aria-expanded={ isOpen }
								>
									{ __(
										'Add block',
										'squarespace-style-site-editor'
									) }
								</Button>
							) }
							renderContent={ ( { onClose } ) => (
								<AddBlockPanel
									onAdd={ ( item ) => {
										addItem( item );
										onClose();
									} }
								/>
							) }
						/>
						{ isMobile && (
							<span className="sse-fluid-bar__note">
								{ hasMobileLayout
									? __(
											'Editing the mobile layout',
											'squarespace-style-site-editor'
										)
									: __(
											'Stacked on mobile',
											'squarespace-style-site-editor'
										) }
							</span>
						) }
					</div>
				}
			</div>
		</>
	);
}
