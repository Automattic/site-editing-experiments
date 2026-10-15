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
import { useState } from '@wordpress/element';
import { useRefEffect } from '@wordpress/compose';
import { Icon, plus } from '@wordpress/icons';

import {
	DESKTOP_COLUMNS,
	MOBILE_COLUMNS,
	MAX_ROWS,
	bottomRow,
	normalizeLayout,
	readTracks,
} from '../shared/grid';
import { findFreeSpot, getAddBlockItems } from '../shared/add-block-items';
import AddBlockPanel from '../shared/add-block-panel';
import { layers, rowsHandle } from '../shared/icons';
import { useIsMobilePreview } from '../shared/use-device';
import { sectionStyle } from './save';

/**
 * Where a guide line goes on the grid: a 1-based line number, possibly
 * halfway between two (for centres).
 *
 * @param {number}  position Line position.
 * @param {number}  tracks   Number of tracks.
 * @param {boolean} vertical Whether it's a column line.
 * @return {Object} Style for the guide element.
 */
function guideStyle( position, tracks, vertical ) {
	// Absolutely positioned grid children are placed in their grid area
	// without taking part in auto-placement, so the cells stay put.
	let track = Math.floor( position );
	let inset = { start: 0 };
	if ( position !== track ) {
		inset = { start: '50%' };
	} else if ( track > tracks ) {
		track = tracks;
		inset = { end: 0 };
	}
	return vertical
		? {
				gridColumn: `${ track } / span 1`,
				gridRow: '1 / -1',
				left: inset.start ?? 'auto',
				right: inset.end ?? 'auto',
			}
		: {
				gridRow: `${ track } / span 1`,
				gridColumn: '1 / -1',
				top: inset.start ?? 'auto',
				bottom: inset.end ?? 'auto',
			};
}

/**
 * Lines the dragged block shares with another block's edges or centre, or
 * with the section's centre: Squarespace's pink alignment guides.
 *
 * @param {Object}   drag    { itemId, layout }.
 * @param {Object[]} others  Other blocks' layouts.
 * @param {number}   columns Grid columns.
 * @return {{ vertical: number[], horizontal: number[] }} Guide positions.
 */
function findGuides( drag, others, columns ) {
	const l = drag.layout;
	const xs = [ l.c, l.c + l.w, l.c + l.w / 2 ];
	const ys = [ l.r, l.r + l.h, l.r + l.h / 2 ];
	const vertical = new Set();
	const horizontal = new Set();
	const centre = columns / 2 + 1;
	if ( xs[ 2 ] === centre ) {
		vertical.add( centre );
	}
	others.forEach( ( o ) => {
		[ o.c, o.c + o.w, o.c + o.w / 2 ].forEach( ( x ) => {
			if ( xs.includes( x ) ) {
				vertical.add( x );
			}
		} );
		[ o.r, o.r + o.h, o.r + o.h / 2 ].forEach( ( y ) => {
			if ( ys.includes( y ) ) {
				horizontal.add( y );
			}
		} );
	} );
	return { vertical: [ ...vertical ], horizontal: [ ...horizontal ] };
}

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

// Guides sit in a grid of their own above the blocks.
function GuideLayer( { columns, rows, guides } ) {
	if ( ! guides?.vertical.length && ! guides?.horizontal.length ) {
		return null;
	}
	return (
		<div className="wp-block-sse-fluid-section__guides" aria-hidden="true">
			{ guides.vertical.map( ( x ) => (
				<i
					key={ `v${ x }` }
					className="sse-guide is-vertical"
					style={ guideStyle( x, columns, true ) }
				/>
			) ) }
			{ guides.horizontal.map( ( y ) => (
				<i
					key={ `h${ y }` }
					className="sse-guide is-horizontal"
					style={ guideStyle( y, rows, false ) }
				/>
			) ) }
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

	// Alignment guides while a block in this section is dragged.
	const [ drag, setDrag ] = useState( null );
	const stageRef = useRefEffect( ( stage ) => {
		const onDrag = ( event ) =>
			setDrag( event.detail?.layout ? event.detail : null );
		stage.addEventListener( 'sse-fluid-drag', onDrag );
		return () => stage.removeEventListener( 'sse-fluid-drag', onDrag );
	}, [] );
	const guides = drag
		? findGuides(
				drag,
				items
					.filter( ( b ) => b.clientId !== drag.itemId )
					.map( ( b ) =>
						isMobile
							? b.attributes.mobileLayout
							: normalizeLayout( b.attributes.layout )
					)
					.filter( Boolean ),
				columns
			)
		: null;

	// Dragging the handle on the bottom edge adds or removes rows.
	const [ previewRows, setPreviewRows ] = useState( null );
	const rowsKey = isMobile ? 'mobileRows' : 'rows';
	const canResizeRows = ! isMobile || hasMobileLayout;
	const minRows = Math.max( 1, isMobile ? mobileBottom : desktopBottom );
	const startRowsDrag = ( event ) => {
		if ( event.button !== 0 ) {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		const handle = event.currentTarget;
		const grid = handle
			.closest( '.wp-block-sse-fluid-section__stage' )
			?.querySelector( '.wp-block-sse-fluid-section__grid' );
		if ( ! grid ) {
			return;
		}
		const { rowStep } = readTracks( grid );
		const start = attributes[ rowsKey ] || 1;
		const y0 = event.clientY;
		let latest = start;
		const onMove = ( e ) => {
			const next = Math.max(
				minRows,
				Math.min(
					MAX_ROWS,
					start + Math.round( ( e.clientY - y0 ) / rowStep )
				)
			);
			if ( next !== latest ) {
				latest = next;
				setPreviewRows( next );
			}
		};
		const onUp = () => {
			handle.removeEventListener( 'pointermove', onMove );
			handle.removeEventListener( 'pointerup', onUp );
			handle.removeEventListener( 'pointercancel', onUp );
			setPreviewRows( null );
			if ( latest !== start ) {
				setAttributes( { [ rowsKey ]: latest } );
			}
		};
		handle.setPointerCapture?.( event.pointerId );
		handle.addEventListener( 'pointermove', onMove );
		handle.addEventListener( 'pointerup', onUp );
		handle.addEventListener( 'pointercancel', onUp );
		setPreviewRows( start );
	};

	const shownAttributes =
		previewRows === null
			? attributes
			: { ...attributes, [ rowsKey ]: previewRows };

	const blockProps = useBlockProps( {
		className: clsx( {
			'has-mobile-layout': hasMobileLayout,
			'is-sse-active': active,
			// The editor follows the preview device, not the canvas width.
			'is-sse-desktop': ! isMobile,
			'is-sse-mobile': isMobile,
		} ),
		style: sectionStyle( shownAttributes ),
	} );

	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'wp-block-sse-fluid-section__grid' },
		{ renderAppender: false, templateLock: false }
	);

	let overlayRows = shownAttributes.rows;
	if ( isMobile ) {
		overlayRows = hasMobileLayout ? shownAttributes.mobileRows : 0;
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
						max={ MAX_ROWS }
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
								max={ MAX_ROWS }
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
				<div
					className="wp-block-sse-fluid-section__stage"
					ref={ stageRef }
				>
					{ active && overlayRows > 0 && (
						<GridOverlay columns={ columns } rows={ overlayRows } />
					) }
					{ overlayRows > 0 && (
						<GuideLayer
							columns={ columns }
							rows={ overlayRows }
							guides={ guides }
						/>
					) }
					<div { ...innerBlocksProps } />
					{ canResizeRows && (
						<button
							type="button"
							className={ clsx( 'sse-rows-handle', {
								'is-dragging': previewRows !== null,
							} ) }
							aria-label={ __(
								'Drag to add or remove rows',
								'squarespace-style-site-editor'
							) }
							title={ __(
								'Drag to add or remove rows',
								'squarespace-style-site-editor'
							) }
							onPointerDown={ startRowsDrag }
							onKeyDown={ ( event ) => {
								const delta = { ArrowUp: -1, ArrowDown: 1 }[
									event.key
								];
								if ( delta ) {
									event.preventDefault();
									setAttributes( {
										[ rowsKey ]: Math.min(
											MAX_ROWS,
											Math.max(
												minRows,
												( attributes[ rowsKey ] || 1 ) +
													delta
											)
										),
									} );
								}
							} }
						>
							<Icon icon={ rowsHandle } size={ 22 } />
						</button>
					) }
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
						{ ! isMobile && (
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
						) }
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
