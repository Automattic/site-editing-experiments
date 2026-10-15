import clsx from 'clsx';
import { __, sprintf } from '@wordpress/i18n';
import {
	BlockControls,
	BlockVerticalAlignmentToolbar,
	InnerBlocks,
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
	store as blockEditorStore,
} from '@wordpress/block-editor';

import {
	PanelBody,
	ToolbarButton,
	ToolbarGroup,
	TextControl,
} from '@wordpress/components';
import { useDispatch, useRegistry, useSelect } from '@wordpress/data';
import { useEffect, useState } from '@wordpress/element';
import { arrowDown, arrowUp } from '@wordpress/icons';

import {
	DESKTOP_COLUMNS,
	MAX_ROWS,
	MOBILE_COLUMNS,
	applyGesture,
	bottomRow,
	itemStyle,
	normalizeLayout,
	measureStackedRows,
	readTracks,
	sameLayout,
	stackForMobile,
} from '../shared/grid';
import { useIsMobilePreview } from '../shared/use-device';

const RESIZE_HANDLES = [ 'n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw' ];

const ARROWS = {
	ArrowLeft: [ -1, 0 ],
	ArrowRight: [ 1, 0 ],
	ArrowUp: [ 0, -1 ],
	ArrowDown: [ 0, 1 ],
};

export default function Edit( {
	attributes,
	setAttributes,
	clientId,
	isSelected,
} ) {
	const { layout, mobileLayout, zIndex, verticalAlignment } = attributes;
	const isMobile = useIsMobilePreview();
	const registry = useRegistry();
	const { updateBlockAttributes, selectBlock } =
		useDispatch( blockEditorStore );
	const [ preview, setPreview ] = useState( null );
	const [ gesture, setGesture ] = useState( null );

	const {
		parentId,
		sectionHasMobileLayout,
		hasInnerBlocks,
		firstInnerId,
		isEditing,
	} = useSelect(
		( select ) => {
			const be = select( blockEditorStore );
			const rootId = be.getBlockRootClientId( clientId );
			const order = be.getBlockOrder( clientId );
			return {
				parentId: rootId,
				sectionHasMobileLayout:
					( be.getBlockAttributes( rootId )?.mobileRows ?? 0 ) > 0,
				hasInnerBlocks: order.length > 0,
				firstInnerId: order[ 0 ],
				isEditing: be.hasSelectedInnerBlock( clientId, true ),
			};
		},
		[ clientId ]
	);

	const layoutKey = isMobile ? 'mobileLayout' : 'layout';

	const findGrid = () =>
		document
			.querySelector( 'iframe[name="editor-canvas"]' )
			?.contentDocument?.getElementById( `block-${ clientId }` )
			?.parentElement ?? null;
	const columns = isMobile ? MOBILE_COLUMNS : DESKTOP_COLUMNS;

	/**
	 * The layout being edited. The first time anything moves in the mobile
	 * preview, every item in the section gets a mobile layout that matches
	 * the stacked one on screen.
	 *
	 * @param {HTMLElement} [grid] The section's grid, to size stacked rows
	 *                             from what's shown. Found if not given.
	 * @return {Object} Layout.
	 */
	const getStartLayout = ( grid = findGrid() ) => {
		if ( ! isMobile ) {
			return normalizeLayout( layout, DESKTOP_COLUMNS );
		}
		const siblings = registry
			.select( blockEditorStore )
			.getBlocks( parentId );

		if ( ! sectionHasMobileLayout ) {
			const stacked = stackForMobile(
				siblings,
				grid ? measureStackedRows( grid ) : undefined
			);
			registry.batch( () => {
				siblings.forEach( ( block ) =>
					updateBlockAttributes( block.clientId, {
						mobileLayout: stacked.layouts[ block.clientId ],
					} )
				);
				updateBlockAttributes( parentId, { mobileRows: stacked.rows } );
			} );
			return stacked.layouts[ clientId ];
		}

		if ( mobileLayout ) {
			return normalizeLayout( mobileLayout, MOBILE_COLUMNS );
		}

		// Added on desktop after the mobile layout was made: put it last.
		const bottom = bottomRow(
			siblings.map( ( b ) => b.attributes.mobileLayout )
		);
		const d = normalizeLayout( layout );
		return {
			c: 1,
			r: bottom + 1,
			w: MOBILE_COLUMNS,
			h: Math.min( d.h, 8 ),
		};
	};

	const commit = ( next ) => {
		const rowsKey = isMobile ? 'mobileRows' : 'rows';
		const sectionAttributes =
			registry
				.select( blockEditorStore )
				.getBlockAttributes( parentId ) || {};
		const bottom = next.r + next.h - 1;
		registry.batch( () => {
			setAttributes( { [ layoutKey ]: next } );
			if ( bottom > ( sectionAttributes[ rowsKey ] || 0 ) ) {
				updateBlockAttributes( parentId, {
					[ rowsKey ]: Math.min( MAX_ROWS, bottom ),
				} );
			}
		} );
	};

	/**
	 * Starts a move or resize. With a threshold (moving by the block itself),
	 * nothing happens until the pointer has moved that far, and a press that
	 * doesn't move counts as a tap instead.
	 *
	 * @param {string}     mode              'move' or a resize direction.
	 * @param {Object}     options
	 * @param {number}     options.threshold Pixels before a drag starts.
	 * @param {() => void} options.onTap     Called for a press without a drag.
	 */
	const startGesture =
		( mode, { threshold = 0, onTap } = {} ) =>
		( event ) => {
			if ( event.button !== 0 ) {
				return;
			}
			event.preventDefault();
			event.stopPropagation();

			const handle = event.currentTarget;
			const itemElement = handle.closest( '.wp-block-sse-fluid-item' );
			const grid = itemElement?.parentElement;
			if ( ! grid ) {
				return;
			}

			const x0 = event.clientX;
			const y0 = event.clientY;
			let drag = null;
			let latest = null;

			let pending = false;
			const begin = () => {
				// The first move in the mobile preview writes the stacked
				// layout; read the grid only once that has rendered.
				const willStack = isMobile && ! sectionHasMobileLayout;
				const start = getStartLayout( grid );
				pending = true;
				latest = start;
				setGesture( mode );
				setPreview( start );
				selectBlock( clientId );
				const view = grid.ownerDocument.defaultView;
				const read = () => {
					pending = false;
					const tracks = readTracks( grid );
					// The canvas is showing a different grid from the one
					// being edited (say, a narrow canvas in the Desktop
					// preview): moving would save nonsense, so don't.
					if ( tracks.columns !== columns ) {
						setGesture( null );
						setPreview( null );
						return;
					}
					const rect = itemElement.getBoundingClientRect();
					drag = {
						start,
						tracks,
						box: {
							left: rect.left - tracks.left,
							top: rect.top - tracks.top,
							right: rect.right - tracks.left,
							bottom: rect.bottom - tracks.top,
						},
					};
				};
				if ( willStack ) {
					view.requestAnimationFrame( () =>
						view.requestAnimationFrame( read )
					);
				} else {
					read();
				}
			};

			const onMove = ( e ) => {
				const dx = e.clientX - x0;
				const dy = e.clientY - y0;
				if ( ! drag ) {
					if ( pending ) {
						return;
					}
					if ( latest === null ) {
						if ( Math.hypot( dx, dy ) < threshold ) {
							return;
						}
						begin();
					}
					if ( ! drag ) {
						return;
					}
				}
				const next = applyGesture(
					drag.start,
					mode,
					drag.tracks,
					drag.box,
					dx,
					dy
				);
				if ( ! sameLayout( next, latest ) ) {
					latest = next;
					setPreview( next );
				}
			};
			const onUp = () => {
				handle.removeEventListener( 'pointermove', onMove );
				handle.removeEventListener( 'pointerup', onUp );
				handle.removeEventListener( 'pointercancel', onUp );
				if ( ! drag ) {
					if ( latest === null ) {
						onTap?.();
					} else {
						setPreview( null );
						setGesture( null );
					}
					return;
				}
				setPreview( null );
				setGesture( null );
				if ( ! sameLayout( latest, drag.start ) ) {
					commit( latest );
				}
			};

			handle.setPointerCapture?.( event.pointerId );
			handle.addEventListener( 'pointermove', onMove );
			handle.addEventListener( 'pointerup', onUp );
			handle.addEventListener( 'pointercancel', onUp );
			if ( threshold === 0 ) {
				begin();
			}
		};

	// Added (say, from List View or the inserter) to a section that already
	// has a mobile layout: place it below everything on mobile too.
	useEffect( () => {
		if ( ! sectionHasMobileLayout || mobileLayout || ! parentId ) {
			return;
		}
		const be = registry.select( blockEditorStore );
		const siblings = be.getBlocks( parentId );
		const bottom = bottomRow(
			siblings.map( ( b ) => b.attributes.mobileLayout )
		);
		const d = normalizeLayout( layout );
		const next = {
			c: 1,
			r: Math.min( MAX_ROWS - 3, bottom + 1 ),
			w: MOBILE_COLUMNS,
			h: Math.max( 2, Math.min( d.h, 8 ) ),
		};
		registry.batch( () => {
			updateBlockAttributes( clientId, { mobileLayout: next } );
			const rows = be.getBlockAttributes( parentId )?.mobileRows || 0;
			const end = Math.min( MAX_ROWS, next.r + next.h - 1 );
			if ( end > rows ) {
				updateBlockAttributes( parentId, { mobileRows: end } );
			}
		} );
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ sectionHasMobileLayout, mobileLayout, parentId ] );

	// Tell the section where this block is while it moves, so it can draw
	// alignment guides.
	useEffect( () => {
		const grid = findGrid();
		if ( ! grid ) {
			return;
		}
		const send = ( at ) =>
			grid.dispatchEvent(
				new grid.ownerDocument.defaultView.CustomEvent(
					'sse-fluid-drag',
					{ bubbles: true, detail: { itemId: clientId, layout: at } }
				)
			);
		send( gesture && preview ? preview : null );
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ gesture, preview ] );

	// Hide the block toolbar while dragging or resizing, so it doesn't sit
	// over the grid and the guides.
	useEffect( () => {
		if ( ! gesture ) {
			return;
		}
		document.body.classList.add( 'sse-is-gesturing' );
		return () => document.body.classList.remove( 'sse-is-gesturing' );
	}, [ gesture ] );

	// Second click (or Enter, or a double-click) edits what's inside.
	const startEditing = () => {
		if ( firstInnerId ) {
			selectBlock( firstInnerId, -1 );
		}
	};

	const onHandleKeyDown = ( event ) => {
		if ( event.key === 'Enter' || event.key === ' ' ) {
			event.preventDefault();
			startEditing();
			return;
		}
		const delta = ARROWS[ event.key ];
		if ( ! delta ) {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		const start = getStartLayout();
		const next = event.shiftKey
			? normalizeLayout(
					{
						...start,
						w: start.w + delta[ 0 ],
						h: start.h + delta[ 1 ],
					},
					columns
				)
			: normalizeLayout(
					{
						...start,
						c: start.c + delta[ 0 ],
						r: start.r + delta[ 1 ],
					},
					columns
				);
		if ( ! sameLayout( next, start ) ) {
			commit( next );
		}
	};

	const shownAttributes = preview
		? { ...attributes, [ layoutKey ]: preview }
		: attributes;
	const shown = normalizeLayout(
		( isMobile ? shownAttributes.mobileLayout : shownAttributes.layout ) ||
			{},
		columns
	);

	const blockProps = useBlockProps( {
		className: clsx( {
			[ `is-vertically-aligned-${ verticalAlignment }` ]:
				verticalAlignment,
			'is-sse-gesture': !! gesture,
			'is-sse-editing': isEditing,
		} ),
		style: itemStyle( shownAttributes ),
	} );

	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'wp-block-sse-fluid-item__content' },
		{
			templateLock: false,
			renderAppender: hasInnerBlocks
				? false
				: InnerBlocks.ButtonBlockAppender,
		}
	);

	const setNumber = ( key ) => ( value ) => {
		const current = isMobile
			? normalizeLayout( mobileLayout || getStartLayout(), columns )
			: normalizeLayout( layout, columns );
		const next = normalizeLayout(
			{ ...current, [ key ]: parseInt( value, 10 ) || 1 },
			columns
		);
		if ( ! sameLayout( next, current ) ) {
			commit( next );
		}
	};

	return (
		<>
			<BlockControls group="block">
				<BlockVerticalAlignmentToolbar
					value={ verticalAlignment }
					onChange={ ( value ) =>
						setAttributes( { verticalAlignment: value } )
					}
				/>
			</BlockControls>
			<BlockControls group="other">
				<ToolbarGroup>
					<ToolbarButton
						icon={ arrowUp }
						label={ __( 'Bring forward', 'section-site-editor' ) }
						onClick={ () =>
							setAttributes( { zIndex: ( zIndex || 0 ) + 1 } )
						}
					/>
					<ToolbarButton
						icon={ arrowDown }
						label={ __( 'Send backward', 'section-site-editor' ) }
						disabled={ ! zIndex }
						onClick={ () =>
							setAttributes( {
								zIndex: Math.max( 0, ( zIndex || 0 ) - 1 ),
							} )
						}
					/>
				</ToolbarGroup>
			</BlockControls>
			<InspectorControls>
				<PanelBody
					title={
						isMobile
							? __( 'Position on mobile', 'section-site-editor' )
							: __( 'Position', 'section-site-editor' )
					}
				>
					<div
						style={ {
							display: 'grid',
							gridTemplateColumns: '1fr 1fr',
							gap: 12,
						} }
					>
						<TextControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							type="number"
							label={ __( 'Column', 'section-site-editor' ) }
							min={ 1 }
							max={ columns }
							value={ shown.c }
							onChange={ setNumber( 'c' ) }
						/>
						<TextControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							type="number"
							label={ __( 'Row', 'section-site-editor' ) }
							min={ 1 }
							value={ shown.r }
							onChange={ setNumber( 'r' ) }
						/>
						<TextControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							type="number"
							label={ __( 'Width', 'section-site-editor' ) }
							min={ 1 }
							max={ columns }
							value={ shown.w }
							onChange={ setNumber( 'w' ) }
						/>
						<TextControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							type="number"
							label={ __( 'Height', 'section-site-editor' ) }
							min={ 1 }
							value={ shown.h }
							onChange={ setNumber( 'h' ) }
						/>
					</div>
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps }>
				<div { ...innerBlocksProps } />
				{ hasInnerBlocks && ! isEditing && (
					<div
						className="sse-fe-surface"
						role="button"
						tabIndex={ 0 }
						aria-label={ __(
							'Freeform block. Drag to move it. Press Enter to edit it, arrow keys to move it, and Shift with arrow keys to resize it.',
							'section-site-editor'
						) }
						onPointerDown={ startGesture( 'move', {
							threshold: 4,
							onTap: () =>
								isSelected
									? startEditing()
									: selectBlock( clientId ),
						} ) }
						onDoubleClick={ startEditing }
						onKeyDown={ onHandleKeyDown }
					/>
				) }
				<div className="sse-fe-controls">
					{ RESIZE_HANDLES.map( ( dir ) => (
						<span
							key={ dir }
							className={ `sse-fe-resize is-${ dir }` }
							onPointerDown={ startGesture( dir ) }
							aria-hidden="true"
						/>
					) ) }
					{ gesture && (
						<span className="sse-fe-size">
							{ sprintf(
								/* translators: 1: width in columns, 2: height in rows. */
								__( '%1$d × %2$d', 'section-site-editor' ),
								shown.w,
								shown.h
							) }
						</span>
					) }
				</div>
			</div>
		</>
	);
}
