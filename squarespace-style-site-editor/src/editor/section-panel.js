/**
 * The floating panels a section opens, as in Squarespace:
 *
 * - Edit section: Design, Background and Colors tabs.
 * - View layouts: other layouts of the same section type, swapped in place.
 */
import clsx from 'clsx';
import { __ } from '@wordpress/i18n';
import { useDispatch, useSelect } from '@wordpress/data';
import { useMemo } from '@wordpress/element';
import { getBlockSupport, parse } from '@wordpress/blocks';
import {
	BlockPreview,
	MediaUpload,
	MediaUploadCheck,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import {
	Button,
	TabPanel,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { close as closeIcon, plus } from '@wordpress/icons';
import { minus } from '../shared/icons';

import {
	getDivider,
	getDividerShapes,
	getThemeFromClassName,
	withDivider,
	withTheme,
} from './settings';
import ThemeSwatches from './theme-swatches';
import {
	blocksForPattern,
	categoryForSection,
	useSectionPatterns,
} from './section-patterns';
import { MAX_ROWS, bottomRow, normalizeLayout } from '../shared/grid';

const FLUID = 'sse/fluid-section';

const SPACING = {
	small: 'clamp(2rem, 4vw, 3rem)',
	large: 'clamp(6rem, 12vw, 10rem)',
};

function PanelHeading( { children } ) {
	return <p className="sse-panel__heading">{ children }</p>;
}

function Stepper( { label, value, min = 1, max = MAX_ROWS, onChange } ) {
	return (
		<div className="sse-panel__row">
			<span>{ label }</span>
			<div className="sse-stepper">
				<Button
					size="small"
					icon={ minus }
					label={ __( 'Fewer', 'squarespace-style-site-editor' ) }
					disabled={ value <= min }
					onClick={ () => onChange( Math.max( min, value - 1 ) ) }
				/>
				<span className="sse-stepper__value">{ value }</span>
				<Button
					size="small"
					icon={ plus }
					label={ __( 'More', 'squarespace-style-site-editor' ) }
					disabled={ value >= max }
					onClick={ () => onChange( Math.min( max, value + 1 ) ) }
				/>
			</div>
		</div>
	);
}

function Segmented( { label, value, options, onChange } ) {
	return (
		<div className="sse-panel__row">
			<span>{ label }</span>
			<div
				className="sse-segmented"
				role="radiogroup"
				aria-label={ label }
			>
				{ options.map( ( [ key, short ] ) => (
					<button
						key={ key }
						type="button"
						role="radio"
						aria-checked={ value === key }
						className={ clsx( { 'is-active': value === key } ) }
						onClick={ () => onChange( key ) }
					>
						{ short }
					</button>
				) ) }
			</div>
		</div>
	);
}

function DividerPreview( { path, flip } ) {
	// A band of section with the shape as its bottom edge.
	return (
		<svg
			viewBox="0 0 100 150"
			preserveAspectRatio="none"
			aria-hidden="true"
		>
			<rect width="100" height="70" />
			<g
				transform={
					flip
						? 'translate(100 70) scale(-1 0.8)'
						: 'translate(0 70) scale(1 0.8)'
				}
			>
				<path d={ path } />
			</g>
		</svg>
	);
}

/**
 * Divider: a shaped bottom edge for the section, as in Squarespace.
 *
 * @param {Object}                                props
 * @param {string}                                props.className Section className.
 * @param {(className: string|undefined) => void} props.onChange  Called with the new className.
 */
function DividerControls( { className, onChange } ) {
	const shapes = getDividerShapes();
	const divider = getDivider( className );
	const update = ( next ) =>
		onChange( withDivider( className, { ...divider, ...next } ) );
	if ( ! shapes.length ) {
		return null;
	}
	return (
		<>
			<PanelHeading>
				{ __( 'Styling', 'squarespace-style-site-editor' ) }
			</PanelHeading>
			<ToggleControl
				__nextHasNoMarginBottom
				label={ __( 'Divider', 'squarespace-style-site-editor' ) }
				checked={ !! divider.shape }
				onChange={ ( on ) =>
					update( { shape: on ? shapes[ 0 ].slug : null } )
				}
			/>
			{ divider.shape && (
				<>
					<div
						className="sse-shape-picker"
						role="radiogroup"
						aria-label={ __(
							'Shape',
							'squarespace-style-site-editor'
						) }
					>
						{ shapes.map( ( shape ) => (
							<button
								key={ shape.slug }
								type="button"
								role="radio"
								aria-checked={ divider.shape === shape.slug }
								aria-label={ shape.label }
								title={ shape.label }
								className={ clsx( 'sse-shape-option', {
									'is-active': divider.shape === shape.slug,
								} ) }
								onClick={ () =>
									update( { shape: shape.slug } )
								}
							>
								<DividerPreview
									path={ shape.path }
									flip={ divider.flip }
								/>
							</button>
						) ) }
					</div>
					<Segmented
						label={ __(
							'Height',
							'squarespace-style-site-editor'
						) }
						value={ divider.size }
						options={ [
							[ 's', __( 'S', 'squarespace-style-site-editor' ) ],
							[ 'm', __( 'M', 'squarespace-style-site-editor' ) ],
							[ 'l', __( 'L', 'squarespace-style-site-editor' ) ],
						] }
						onChange={ ( size ) => update( { size } ) }
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Flip', 'squarespace-style-site-editor' ) }
						checked={ divider.flip }
						onChange={ ( flip ) => update( { flip } ) }
					/>
				</>
			) }
		</>
	);
}

function DesignTab( { clientId, name, attributes } ) {
	const { updateBlockAttributes } = useDispatch( blockEditorStore );
	const items = useSelect(
		( select ) =>
			name === FLUID
				? select( blockEditorStore ).getBlocks( clientId )
				: [],
		[ clientId, name ]
	);
	const set = ( next ) => updateBlockAttributes( clientId, next );
	const style = attributes.style || {};

	const isCover = name === 'core/cover';
	const fillScreen = isCover
		? attributes.minHeight === 100 && attributes.minHeightUnit === 'vh'
		: style.dimensions?.minHeight === '100vh';
	const setFillScreen = ( on ) => {
		if ( isCover ) {
			set( {
				minHeight: on ? 100 : undefined,
				minHeightUnit: on ? 'vh' : undefined,
			} );
			return;
		}
		set( {
			style: {
				...style,
				dimensions: {
					...( style.dimensions || {} ),
					minHeight: on ? '100vh' : undefined,
				},
			},
		} );
	};

	const canFillScreen =
		isCover || !! getBlockSupport( name, 'dimensions.minHeight' );
	const supportsAlign = getBlockSupport( name, 'align' );
	const canFullWidth =
		supportsAlign === true ||
		( Array.isArray( supportsAlign ) && supportsAlign.includes( 'full' ) );

	const padding = style.spacing?.padding || {};
	const spacingKey =
		Object.keys( SPACING ).find( ( k ) => padding.top === SPACING[ k ] ) ||
		'medium';
	const setSpacing = ( key ) =>
		set( {
			style: {
				...style,
				spacing: {
					...( style.spacing || {} ),
					padding: {
						...padding,
						top: SPACING[ key ],
						bottom: SPACING[ key ],
					},
				},
			},
		} );

	const supportsAnchor = getBlockSupport( name, 'anchor' );
	const minRows = Math.max(
		1,
		bottomRow(
			items.map( ( b ) => normalizeLayout( b.attributes.layout ) )
		)
	);

	return (
		<div className="sse-panel__body">
			{ name === FLUID && (
				<>
					<PanelHeading>
						{ __( 'Grid', 'squarespace-style-site-editor' ) }
					</PanelHeading>
					<Stepper
						label={ __(
							'Row count',
							'squarespace-style-site-editor'
						) }
						value={ attributes.rows }
						min={ minRows }
						onChange={ ( rows ) => set( { rows } ) }
					/>
				</>
			) }
			<PanelHeading>
				{ __( 'Section', 'squarespace-style-site-editor' ) }
			</PanelHeading>
			{ canFillScreen && (
				<ToggleControl
					__nextHasNoMarginBottom
					label={ __(
						'Fill screen',
						'squarespace-style-site-editor'
					) }
					checked={ fillScreen }
					onChange={ setFillScreen }
				/>
			) }
			{ canFullWidth && (
				<ToggleControl
					__nextHasNoMarginBottom
					label={ __(
						'Full width',
						'squarespace-style-site-editor'
					) }
					checked={ attributes.align === 'full' }
					onChange={ ( on ) =>
						set( { align: on ? 'full' : undefined } )
					}
				/>
			) }
			{ getBlockSupport( name, 'spacing.padding' ) && (
				<div className="sse-panel__row">
					<span>
						{ __(
							'Section height',
							'squarespace-style-site-editor'
						) }
					</span>
					<div className="sse-segmented" role="radiogroup">
						{ [
							[
								'small',
								__( 'S', 'squarespace-style-site-editor' ),
							],
							[
								'medium',
								__( 'M', 'squarespace-style-site-editor' ),
							],
							[
								'large',
								__( 'L', 'squarespace-style-site-editor' ),
							],
						].map( ( [ key, short ] ) => (
							<button
								key={ key }
								type="button"
								role="radio"
								aria-checked={ spacingKey === key }
								className={ clsx( {
									'is-active': spacingKey === key,
								} ) }
								onClick={ () =>
									key === 'medium'
										? set( {
												style: {
													...style,
													spacing: {
														...( style.spacing ||
															{} ),
														padding: {
															...padding,
															top: undefined,
															bottom: undefined,
														},
													},
												},
											} )
										: setSpacing( key )
								}
							>
								{ short }
							</button>
						) ) }
					</div>
				</div>
			) }
			<DividerControls
				className={ attributes.className }
				onChange={ ( className ) => set( { className } ) }
			/>
			{ supportsAnchor && (
				<>
					<PanelHeading>
						{ __( 'Anchor link', 'squarespace-style-site-editor' ) }
					</PanelHeading>
					<TextControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						hideLabelFromVision
						label={ __(
							'Anchor link',
							'squarespace-style-site-editor'
						) }
						placeholder={ __(
							'Add name',
							'squarespace-style-site-editor'
						) }
						prefix={ <span className="sse-panel__hash">#</span> }
						value={ attributes.anchor || '' }
						onChange={ ( value ) =>
							set( {
								anchor:
									value
										.trim()
										.replace( /\s+/g, '-' )
										.replace( /[^\w-]/g, '' ) || undefined,
							} )
						}
					/>
				</>
			) }
		</div>
	);
}

function BackgroundTab( { clientId, name, attributes } ) {
	const { updateBlockAttributes } = useDispatch( blockEditorStore );
	const supported = !! getBlockSupport( name, 'background.backgroundImage' );
	const style = attributes.style || {};
	const image = style.background?.backgroundImage;

	if ( ! supported ) {
		return (
			<div className="sse-panel__body">
				<p className="sse-panel__help">
					{ name === 'core/cover'
						? __(
								'This section is a cover: select its image in the canvas to replace it.',
								'squarespace-style-site-editor'
							)
						: __(
								'Background images are available on standard sections.',
								'squarespace-style-site-editor'
							) }
				</p>
			</div>
		);
	}

	const setImage = ( media ) =>
		updateBlockAttributes( clientId, {
			style: {
				...style,
				background: media
					? {
							...( style.background || {} ),
							backgroundImage: {
								url: media.url,
								id: media.id,
								source: 'file',
								title: media.title,
							},
							backgroundSize: 'cover',
							backgroundPosition: '50% 50%',
						}
					: undefined,
			},
		} );

	return (
		<div className="sse-panel__body">
			<PanelHeading>
				{ __( 'Image', 'squarespace-style-site-editor' ) }
			</PanelHeading>
			{ image?.url && (
				<div
					className="sse-panel__bg-preview"
					style={ { backgroundImage: `url(${ image.url })` } }
				/>
			) }
			<MediaUploadCheck
				fallback={
					<p className="sse-panel__help">
						{ __(
							'You need permission to upload media to add a background image.',
							'squarespace-style-site-editor'
						) }
					</p>
				}
			>
				<MediaUpload
					allowedTypes={ [ 'image' ] }
					value={ image?.id }
					onSelect={ setImage }
					render={ ( { open } ) => (
						<Button
							__next40pxDefaultSize
							variant="secondary"
							className="sse-panel__wide-button"
							onClick={ open }
						>
							{ image?.url
								? __(
										'Replace image',
										'squarespace-style-site-editor'
									)
								: __(
										'Add image',
										'squarespace-style-site-editor'
									) }
						</Button>
					) }
				/>
			</MediaUploadCheck>
			{ image?.url && (
				<Button
					__next40pxDefaultSize
					variant="tertiary"
					isDestructive
					onClick={ () => setImage( null ) }
				>
					{ __( 'Remove image', 'squarespace-style-site-editor' ) }
				</Button>
			) }
		</div>
	);
}

function ColorsTab( { clientId, attributes } ) {
	const { updateBlockAttributes } = useDispatch( blockEditorStore );
	const interfaceDispatch = useDispatch( 'core/interface' );
	return (
		<div className="sse-panel__body">
			<p className="sse-panel__help">
				{ __(
					'Select a colour theme for this section.',
					'squarespace-style-site-editor'
				) }{ ' ' }
				<button
					type="button"
					className="sse-panel__link"
					onClick={ () =>
						interfaceDispatch?.enableComplementaryArea?.(
							'core',
							'sse-editor/sse-site-styles'
						)
					}
				>
					{ __(
						'Change the colours in Site Styles',
						'squarespace-style-site-editor'
					) }
				</button>
			</p>
			<ThemeSwatches
				value={ getThemeFromClassName( attributes.className ) }
				onChange={ ( slug ) =>
					updateBlockAttributes( clientId, {
						className: withTheme( attributes.className, slug ),
					} )
				}
			/>
		</div>
	);
}

export function EditSectionPanel( { clientId, onClose } ) {
	const block = useSelect(
		( select ) => select( blockEditorStore ).getBlock( clientId ),
		[ clientId ]
	);
	if ( ! block ) {
		return null;
	}
	const props = {
		clientId,
		name: block.name,
		attributes: block.attributes,
	};
	return (
		<div className="sse-panel">
			<TabPanel
				className="sse-panel__tabs"
				tabs={ [
					{
						name: 'design',
						title: __( 'Design', 'squarespace-style-site-editor' ),
					},
					{
						name: 'background',
						title: __(
							'Background',
							'squarespace-style-site-editor'
						),
					},
					{
						name: 'colors',
						title: __( 'Colors', 'squarespace-style-site-editor' ),
					},
				] }
			>
				{ ( tab ) => {
					if ( tab.name === 'background' ) {
						return <BackgroundTab { ...props } />;
					}
					if ( tab.name === 'colors' ) {
						return <ColorsTab { ...props } />;
					}
					return <DesignTab { ...props } />;
				} }
			</TabPanel>
			<Button
				className="sse-panel__close"
				size="small"
				icon={ closeIcon }
				label={ __( 'Close', 'squarespace-style-site-editor' ) }
				onClick={ onClose }
			/>
		</div>
	);
}

function LayoutCard( { pattern, onChoose } ) {
	const blocks = useMemo(
		() => parse( pattern.content, { __unstableSkipMigrationLogs: true } ),
		[ pattern.content ]
	);
	return (
		<button
			type="button"
			className="sse-layouts__card"
			onClick={ () => onChoose( pattern ) }
		>
			<span className="sse-layouts__preview" aria-hidden="true">
				<BlockPreview blocks={ blocks } viewportWidth={ 1400 } />
			</span>
			<span className="sse-layouts__title">
				{ ( ( t ) => t.charAt( 0 ).toUpperCase() + t.slice( 1 ) )(
					pattern.title.replace( /^[^:]+:\s*/, '' )
				) }
			</span>
		</button>
	);
}

export function LayoutsPanel( { clientId, onClose } ) {
	const sectionPatterns = useSectionPatterns();
	const block = useSelect(
		( select ) => select( blockEditorStore ).getBlock( clientId ),
		[ clientId ]
	);
	const { replaceBlocks } = useDispatch( blockEditorStore );

	if ( ! block ) {
		return null;
	}
	const category = categoryForSection( block.attributes, sectionPatterns );
	const group = category ? sectionPatterns.categories[ category ] : null;
	const theme = getThemeFromClassName( block.attributes.className );

	const choose = ( pattern ) => {
		const blocks = blocksForPattern( pattern, group?.label );
		// Keep the section's colours, as Squarespace does.
		if ( theme && blocks.length === 1 ) {
			blocks[ 0 ].attributes.className = withTheme(
				blocks[ 0 ].attributes.className,
				theme
			);
		}
		replaceBlocks( clientId, blocks );
		onClose();
	};

	return (
		<div className="sse-panel sse-layouts">
			<div className="sse-layouts__header">
				<p className="sse-panel__title">
					{ __( 'Layouts', 'squarespace-style-site-editor' ) }
				</p>
				<Button
					size="small"
					icon={ closeIcon }
					label={ __( 'Close', 'squarespace-style-site-editor' ) }
					onClick={ onClose }
				/>
			</div>
			{ ! sectionPatterns && <p className="sse-panel__help">…</p> }
			{ sectionPatterns && ! group && (
				<p className="sse-panel__help">
					{ __(
						'Other layouts are offered for sections added with Add Section.',
						'squarespace-style-site-editor'
					) }
				</p>
			) }
			{ group && (
				<>
					<p className="sse-panel__help">
						{ __(
							'Pick a layout to swap it in. This replaces the section’s content; undo brings it back.',
							'squarespace-style-site-editor'
						) }
					</p>
					<div className="sse-layouts__grid">
						{ group.patterns.map( ( pattern ) => (
							<LayoutCard
								key={ pattern.name }
								pattern={ pattern }
								onChoose={ choose }
							/>
						) ) }
					</div>
				</>
			) }
		</div>
	);
}
