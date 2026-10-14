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
import { useState } from '@wordpress/element';
import { Icon, arrowDown, arrowUp, dragHandle } from '@wordpress/icons';

import {
	DESKTOP_COLUMNS,
	MOBILE_COLUMNS,
	applyGesture,
	bottomRow,
	itemStyle,
	normalizeLayout,
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

export default function Edit( { attributes, setAttributes, clientId } ) {
	const { layout, mobileLayout, zIndex, verticalAlignment } = attributes;
	const isMobile = useIsMobilePreview();
	const registry = useRegistry();
	const { updateBlockAttributes, selectBlock } =
		useDispatch( blockEditorStore );
	const [ preview, setPreview ] = useState( null );
	const [ gesture, setGesture ] = useState( null );

	const { parentId, sectionHasMobileLayout, hasInnerBlocks } = useSelect(
		( select ) => {
			const be = select( blockEditorStore );
			const rootId = be.getBlockRootClientId( clientId );
			return {
				parentId: rootId,
				sectionHasMobileLayout:
					( be.getBlockAttributes( rootId )?.mobileRows ?? 0 ) > 0,
				hasInnerBlocks: be.getBlockCount( clientId ) > 0,
			};
		},
		[ clientId ]
	);

	const layoutKey = isMobile ? 'mobileLayout' : 'layout';
	const columns = isMobile ? MOBILE_COLUMNS : DESKTOP_COLUMNS;

	/**
	 * The layout being edited. The first time anything moves in the mobile
	 * preview, every item in the section gets a mobile layout that matches
	 * the stacked one on screen.
	 */
	const getStartLayout = () => {
		if ( ! isMobile ) {
			return normalizeLayout( layout, DESKTOP_COLUMNS );
		}
		const siblings = registry
			.select( blockEditorStore )
			.getBlocks( parentId );

		if ( ! sectionHasMobileLayout ) {
			const stacked = stackForMobile( siblings );
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
				updateBlockAttributes( parentId, { [ rowsKey ]: bottom } );
			}
		} );
	};

	const startGesture = ( mode ) => ( event ) => {
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

		const start = getStartLayout();
		const tracks = readTracks( grid );
		const rect = itemElement.getBoundingClientRect();
		const box = {
			left: rect.left - tracks.left,
			top: rect.top - tracks.top,
			right: rect.right - tracks.left,
			bottom: rect.bottom - tracks.top,
		};
		const x0 = event.clientX;
		const y0 = event.clientY;
		let latest = start;

		const onMove = ( e ) => {
			const next = applyGesture(
				start,
				mode,
				tracks,
				box,
				e.clientX - x0,
				e.clientY - y0
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
			setPreview( null );
			setGesture( null );
			if ( ! sameLayout( latest, start ) ) {
				commit( latest );
			}
		};

		handle.setPointerCapture?.( event.pointerId );
		handle.addEventListener( 'pointermove', onMove );
		handle.addEventListener( 'pointerup', onUp );
		handle.addEventListener( 'pointercancel', onUp );
		setGesture( mode );
		setPreview( start );
		selectBlock( clientId );
	};

	const onHandleKeyDown = ( event ) => {
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
						label={ __(
							'Bring forward',
							'squarespace-style-site-editor'
						) }
						onClick={ () =>
							setAttributes( { zIndex: ( zIndex || 0 ) + 1 } )
						}
					/>
					<ToolbarButton
						icon={ arrowDown }
						label={ __(
							'Send backward',
							'squarespace-style-site-editor'
						) }
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
							? __(
									'Position on mobile',
									'squarespace-style-site-editor'
								)
							: __( 'Position', 'squarespace-style-site-editor' )
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
							label={ __(
								'Column',
								'squarespace-style-site-editor'
							) }
							min={ 1 }
							max={ columns }
							value={ shown.c }
							onChange={ setNumber( 'c' ) }
						/>
						<TextControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							type="number"
							label={ __(
								'Row',
								'squarespace-style-site-editor'
							) }
							min={ 1 }
							value={ shown.r }
							onChange={ setNumber( 'r' ) }
						/>
						<TextControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							type="number"
							label={ __(
								'Width',
								'squarespace-style-site-editor'
							) }
							min={ 1 }
							max={ columns }
							value={ shown.w }
							onChange={ setNumber( 'w' ) }
						/>
						<TextControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							type="number"
							label={ __(
								'Height',
								'squarespace-style-site-editor'
							) }
							min={ 1 }
							value={ shown.h }
							onChange={ setNumber( 'h' ) }
						/>
					</div>
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps }>
				<div { ...innerBlocksProps } />
				<div className="sse-fe-controls">
					<button
						type="button"
						className="sse-fe-move"
						aria-label={ __(
							'Drag to move. Arrow keys move it, Shift and arrow keys resize it.',
							'squarespace-style-site-editor'
						) }
						onPointerDown={ startGesture( 'move' ) }
						onKeyDown={ onHandleKeyDown }
					>
						<Icon icon={ dragHandle } size={ 18 } />
					</button>
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
								__(
									'%1$d × %2$d',
									'squarespace-style-site-editor'
								),
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
