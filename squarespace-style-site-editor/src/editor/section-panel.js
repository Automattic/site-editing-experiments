/**
 * The floating panels a section opens, as in Squarespace:
 *
 * - Edit section: Design, Background and Colors tabs.
 * - View layouts: other layouts of the same section type, swapped in place.
 */
import clsx from 'clsx';
import { __ } from '@wordpress/i18n';
import { useDispatch, useRegistry, useSelect } from '@wordpress/data';
import { useMemo, useState } from '@wordpress/element';
import { getBlockSupport, parse } from '@wordpress/blocks';
import {
	BlockPreview,
	MediaUpload,
	MediaUploadCheck,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import {
	Button,
	RangeControl,
	TabPanel,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { Icon, close as closeIcon, plus } from '@wordpress/icons';
import { minus } from '../shared/icons';

import {
	PALETTE_ROLES,
	contrast,
	getDivider,
	getDividerShapes,
	getSectionThemes,
	getThemeFromClassName,
	useSitePalette,
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
import { STORE_NAME } from './store';
import { hasVideoBackground, withVideo, withoutVideo } from './video-section';

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

// Art backgrounds: gradients drawn from the section's colour theme and the
// site palette, so they follow both.
// A: the theme's button colour (the accent, on most themes); B: the
// section's background; T: its text colour. Mixing from these keeps every
// preset visible on every colour theme.
const A = 'var(--sse-btn-bg, var(--wp--preset--color--sse-accent))';
const B = 'var(--sse-bg, var(--wp--preset--color--sse-lightest))';
const T = 'var(--sse-text, var(--wp--preset--color--sse-darkest))';
const ART = [
	{
		key: 'glow',
		label: __( 'Glow', 'squarespace-style-site-editor' ),
		value: `radial-gradient(circle at 15% 20%, color-mix(in srgb, ${ A } 75%, transparent) 0, transparent 45%), radial-gradient(circle at 85% 85%, color-mix(in srgb, ${ T } 20%, transparent) 0, transparent 40%), ${ B }`,
	},
	{
		key: 'dusk',
		label: __( 'Dusk', 'squarespace-style-site-editor' ),
		value: `linear-gradient(160deg, ${ B } 30%, color-mix(in srgb, ${ A } 70%, ${ B }) 130%)`,
	},
	{
		key: 'horizon',
		label: __( 'Horizon', 'squarespace-style-site-editor' ),
		value: `linear-gradient(180deg, ${ B } 50%, color-mix(in srgb, ${ B } 75%, ${ T }) 100%)`,
	},
	{
		key: 'spotlight',
		label: __( 'Spotlight', 'squarespace-style-site-editor' ),
		value: `radial-gradient(ellipse at 50% 0%, color-mix(in srgb, ${ A } 70%, ${ B }) 0, ${ B } 65%)`,
	},
	{
		key: 'split',
		label: __( 'Split', 'squarespace-style-site-editor' ),
		value: `linear-gradient(100deg, ${ B } 0 58%, color-mix(in srgb, ${ B } 85%, ${ T }) 58% 100%)`,
	},
	{
		key: 'stripes',
		label: __( 'Stripes', 'squarespace-style-site-editor' ),
		value: `repeating-linear-gradient(135deg, ${ B } 0 22px, color-mix(in srgb, ${ B } 90%, ${ T }) 22px 44px)`,
	},
];

function ImageBackground( { clientId, name, attributes } ) {
	const { updateBlockAttributes } = useDispatch( blockEditorStore );
	const style = attributes.style || {};
	const image = style.background?.backgroundImage;

	if ( ! getBlockSupport( name, 'background.backgroundImage' ) ) {
		return (
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
				render={ ( { open } ) =>
					image?.url ? (
						<button
							type="button"
							className="sse-dropzone has-image"
							style={ { backgroundImage: `url(${ image.url })` } }
							onClick={ open }
						>
							<span>
								{ __(
									'Replace image',
									'squarespace-style-site-editor'
								) }
							</span>
						</button>
					) : (
						<button
							type="button"
							className="sse-dropzone"
							onClick={ open }
						>
							<span className="sse-dropzone__plus">
								<Icon icon={ plus } size={ 20 } />
							</span>
							<span className="sse-dropzone__label">
								{ __(
									'Add an image',
									'squarespace-style-site-editor'
								) }
							</span>
						</button>
					)
				}
			/>
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
		</MediaUploadCheck>
	);
}

function VideoBackground( { clientId, name, attributes } ) {
	const registry = useRegistry();
	const { replaceBlock, updateBlockAttributes } =
		useDispatch( blockEditorStore );
	const { openSectionPanel } = useDispatch( STORE_NAME );
	const palette = useSitePalette();
	const hasVideo = hasVideoBackground( { name, attributes } );

	if ( name !== 'core/group' && name !== 'core/cover' ) {
		return (
			<p className="sse-panel__help">
				{ __(
					'Background video is available on standard sections.',
					'squarespace-style-site-editor'
				) }
			</p>
		);
	}

	// The overlay is the section's own background colour, so the video
	// takes on its colour theme, as in Squarespace.
	const theme = getSectionThemes().find(
		( t ) => t.slug === getThemeFromClassName( attributes.className )
	);
	const overlay = theme ? palette[ theme.background ] : undefined;
	const isDark = overlay
		? contrast( overlay, '#ffffff' ) > contrast( overlay, '#000000' )
		: true;

	const setVideo = ( media ) => {
		const block = registry.select( blockEditorStore ).getBlock( clientId );
		const result = withVideo( block, media, { overlay, isDark } );
		if ( result.attributes ) {
			updateBlockAttributes( clientId, result.attributes );
			return;
		}
		replaceBlock( clientId, result.block );
		openSectionPanel( result.block.clientId, 'edit', 'background:video' );
	};

	const removeVideo = () => {
		const block = registry.select( blockEditorStore ).getBlock( clientId );
		const group = withoutVideo( block );
		replaceBlock( clientId, group );
		openSectionPanel( group.clientId, 'edit', 'background:video' );
	};

	return (
		<MediaUploadCheck
			fallback={
				<p className="sse-panel__help">
					{ __(
						'You need permission to upload media to add a background video.',
						'squarespace-style-site-editor'
					) }
				</p>
			}
		>
			<MediaUpload
				allowedTypes={ [ 'video' ] }
				value={ hasVideo ? attributes.id : undefined }
				onSelect={ setVideo }
				render={ ( { open } ) =>
					hasVideo ? (
						<button
							type="button"
							className="sse-dropzone has-image"
							onClick={ open }
						>
							<video
								className="sse-dropzone__video"
								src={ attributes.url }
								muted
								loop
								autoPlay
								playsInline
								aria-hidden="true"
							/>
							<span>
								{ __(
									'Replace video',
									'squarespace-style-site-editor'
								) }
							</span>
						</button>
					) : (
						<button
							type="button"
							className="sse-dropzone"
							onClick={ open }
						>
							<span className="sse-dropzone__plus">
								<Icon icon={ plus } size={ 20 } />
							</span>
							<span className="sse-dropzone__label">
								{ __(
									'Add a video',
									'squarespace-style-site-editor'
								) }
							</span>
						</button>
					)
				}
			/>
			{ hasVideo && (
				<>
					<RangeControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						label={ __(
							'Overlay',
							'squarespace-style-site-editor'
						) }
						help={ __(
							'How much of the section colour shows over the video.',
							'squarespace-style-site-editor'
						) }
						value={ attributes.dimRatio ?? 50 }
						min={ 0 }
						max={ 100 }
						step={ 10 }
						onChange={ ( dimRatio ) =>
							updateBlockAttributes( clientId, {
								dimRatio: dimRatio ?? 40,
							} )
						}
					/>
					<Button
						__next40pxDefaultSize
						variant="tertiary"
						isDestructive
						onClick={ removeVideo }
					>
						{ __(
							'Remove video',
							'squarespace-style-site-editor'
						) }
					</Button>
				</>
			) }
		</MediaUploadCheck>
	);
}

function ArtBackground( { clientId, name, attributes } ) {
	const { updateBlockAttributes } = useDispatch( blockEditorStore );
	const style = attributes.style || {};
	const current = style.color?.gradient;
	const palette = useSitePalette();

	if ( ! getBlockSupport( name, 'color.gradients' ) ) {
		return (
			<p className="sse-panel__help">
				{ __(
					'Art backgrounds are available on standard and freeform sections.',
					'squarespace-style-site-editor'
				) }
			</p>
		);
	}

	// The editor's own window doesn't have the site's colour variables, so
	// give the previews this section's.
	const theme = getSectionThemes().find(
		( t ) => t.slug === getThemeFromClassName( attributes.className )
	);
	const previewVars = {};
	PALETTE_ROLES.forEach( ( role ) => {
		previewVars[ `--wp--preset--color--sse-${ role }` ] = palette[ role ];
	} );
	if ( theme ) {
		previewVars[ '--sse-bg' ] = palette[ theme.background ];
		previewVars[ '--sse-text' ] = palette[ theme.text ];
		previewVars[ '--sse-btn-bg' ] = palette[ theme.buttonBg ];
	}

	const setArt = ( value ) =>
		updateBlockAttributes( clientId, {
			gradient: undefined,
			style: {
				...style,
				color: { ...( style.color || {} ), gradient: value },
			},
		} );

	return (
		<>
			<div
				className="sse-art-grid"
				role="radiogroup"
				style={ previewVars }
			>
				{ ART.map( ( art ) => (
					<button
						key={ art.key }
						type="button"
						role="radio"
						aria-checked={ current === art.value }
						aria-label={ art.label }
						title={ art.label }
						className={ clsx( 'sse-art-option', {
							'is-active': current === art.value,
						} ) }
						style={ { background: art.value } }
						onClick={ () => setArt( art.value ) }
					/>
				) ) }
			</div>
			<p className="sse-panel__help">
				{ __(
					'Art uses the section’s colour theme and the site palette, so it changes with them.',
					'squarespace-style-site-editor'
				) }
			</p>
			{ current && (
				<Button
					__next40pxDefaultSize
					variant="tertiary"
					isDestructive
					onClick={ () => setArt( undefined ) }
				>
					{ __( 'Remove art', 'squarespace-style-site-editor' ) }
				</Button>
			) }
		</>
	);
}

function BackgroundTab( { initialKind, ...props } ) {
	const hasArt = !! props.attributes.style?.color?.gradient;
	const hasVideo = hasVideoBackground( props );
	let initial = 'image';
	if ( initialKind ) {
		initial = initialKind;
	} else if ( hasVideo ) {
		initial = 'video';
	} else if ( hasArt ) {
		initial = 'art';
	}
	const [ kind, setKind ] = useState( initial );
	return (
		<div className="sse-panel__body">
			<div className="sse-segmented is-wide" role="tablist">
				{ [
					[ 'image', __( 'Image', 'squarespace-style-site-editor' ) ],
					[ 'video', __( 'Video', 'squarespace-style-site-editor' ) ],
					[ 'art', __( 'Art', 'squarespace-style-site-editor' ) ],
				].map( ( [ key, label ] ) => (
					<button
						key={ key }
						type="button"
						role="tab"
						aria-selected={ kind === key }
						className={ clsx( { 'is-active': kind === key } ) }
						onClick={ () => setKind( key ) }
					>
						{ label }
					</button>
				) ) }
			</div>
			{ kind === 'art' && <ArtBackground { ...props } /> }
			{ kind === 'video' && <VideoBackground { ...props } /> }
			{ kind === 'image' && <ImageBackground { ...props } /> }
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
	const startOn = useSelect(
		( select ) => select( STORE_NAME ).getSectionPanel()?.tab,
		[]
	);
	if ( ! block ) {
		return null;
	}
	// "background:video" opens on the Background tab, showing Video.
	const [ initialTab, initialKind ] = ( startOn || '' ).split( ':' );
	const props = {
		clientId,
		name: block.name,
		attributes: block.attributes,
	};
	return (
		<div className="sse-panel">
			<TabPanel
				className="sse-panel__tabs"
				initialTabName={ initialTab || 'design' }
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
						return (
							<BackgroundTab
								{ ...props }
								initialKind={ initialKind }
							/>
						);
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
