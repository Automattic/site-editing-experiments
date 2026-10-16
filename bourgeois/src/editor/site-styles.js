/**
 * Site Styles: a column of preview cards
 * (Themes, Fonts, Colours, Buttons) and a couple of rows, each opening a
 * screen of its own. Every control writes to the user's global styles, so
 * changes show in the canvas straight away and save with the Save button.
 */
import clsx from 'clsx';
import { __, sprintf } from '@wordpress/i18n';
import { useEffect, useMemo, useState } from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import {
	Button,
	ColorPicker,
	Dropdown,
	SelectControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalConfirmDialog as ConfirmDialog,
	// ToggleGroupControl is what core's own Styles panel uses for these choices.
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControl as ToggleGroupControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import { PluginSidebar, PluginSidebarMoreMenuItem } from '@wordpress/editor';
import { brush, chevronLeft, chevronRight, Icon, plus } from '@wordpress/icons';

import {
	presetList,
	presetRef,
	presetSlug,
	setPath,
	useGlobalStyles,
} from './global-styles';
import {
	PALETTE_ROLES,
	getPalettePresets,
	getSectionThemes,
	getThemeFromClassName,
	useSitePalette,
	getAnimations,
} from './settings';
import { previewAnimation } from './animation-preview';
import { STORE_NAME } from './store';
import ThemeSwatches from './theme-swatches';
import { minus } from '../shared/icons';

const SIDEBAR = 'sse-site-styles';

const ROLE_LABELS = {
	lightest: __( 'Lightest', 'section-site-editor' ),
	light: __( 'Light', 'section-site-editor' ),
	accent: __( 'Accent', 'section-site-editor' ),
	dark: __( 'Dark', 'section-site-editor' ),
	darkest: __( 'Darkest', 'section-site-editor' ),
};

const SECTION_PADDING = {
	small: 'clamp(2rem, 5vw, 4rem)',
	medium: 'clamp(3rem, 8vw, 7rem)',
	large: 'clamp(4rem, 11vw, 10rem)',
};

const BUTTON_RADIUS = { square: '0px', rounded: '6px', pill: '999px' };

const BUTTON_PADDING = {
	small: { top: '0.55em', right: '1.1em', bottom: '0.55em', left: '1.1em' },
	medium: { top: '0.85em', right: '1.7em', bottom: '0.85em', left: '1.7em' },
	large: { top: '1.1em', right: '2.4em', bottom: '1.1em', left: '2.4em' },
};

// Site themes: a palette, a button shape and a heading weight together.
const SITE_THEMES = [
	{
		name: __( 'Paper', 'section-site-editor' ),
		palette: 0,
		button: 'pill',
		weight: '500',
	},
	{
		name: __( 'Studio', 'section-site-editor' ),
		palette: 1,
		button: 'rounded',
		weight: '400',
	},
	{
		name: __( 'Garden', 'section-site-editor' ),
		palette: 2,
		button: 'square',
		weight: '600',
	},
	{
		name: __( 'Coast', 'section-site-editor' ),
		palette: 3,
		button: 'pill',
		weight: '500',
	},
	{
		name: __( 'Kiln', 'section-site-editor' ),
		palette: 4,
		button: 'square',
		weight: '700',
	},
	{
		name: __( 'Harvest', 'section-site-editor' ),
		palette: 5,
		button: 'pill',
		weight: '800',
	},
	{
		name: __( 'Mono', 'section-site-editor' ),
		palette: 6,
		button: 'square',
		weight: '700',
	},
	{
		name: __( 'Night', 'section-site-editor' ),
		palette: 7,
		button: 'rounded',
		weight: '600',
	},
];

const keyFor = ( map, value ) =>
	Object.keys( map ).find(
		( key ) => JSON.stringify( map[ key ] ) === JSON.stringify( value )
	);

/* ------------------------------------------------------------- Helpers */

function useFonts( gs ) {
	const families = [
		...presetList( gs.base?.settings?.typography?.fontFamilies, [
			'theme',
			'default',
		] ),
		...presetList( gs.user?.settings?.typography?.fontFamilies, [
			'custom',
		] ),
	].filter(
		( family, i, all ) =>
			all.findIndex( ( f ) => f.slug === family.slug ) === i
	);
	const bySlug = Object.fromEntries( families.map( ( f ) => [ f.slug, f ] ) );
	const body = presetSlug(
		gs.get( 'styles.typography.fontFamily' ),
		'font-family'
	);
	const headings =
		presetSlug(
			gs.get( 'styles.elements.heading.typography.fontFamily' ),
			'font-family'
		) || body;
	const weight =
		gs.get( 'styles.elements.heading.typography.fontWeight' ) || '';
	return { families, bySlug, body, headings, weight };
}

/**
 * Writes the five site colours to the user's custom palette, leaving every
 * other colour (the theme's, and any the user added) alone. Custom colours
 * come after theme colours, so these win over the defaults the plugin adds
 * to the theme palette.
 *
 * @param {Object}   settings Global styles settings to change.
 * @param {Object}   gs       From useGlobalStyles().
 * @param {string[]} colors   Lightest to darkest.
 */
function writePalette( settings, gs, colors ) {
	const current = gs.user?.settings?.color?.palette?.custom;
	const others = ( Array.isArray( current ) ? current : [] ).filter(
		( entry ) => ! entry.slug?.startsWith( 'sse-' )
	);
	const ours = PALETTE_ROLES.map( ( role, i ) => ( {
		slug: `sse-${ role }`,
		name: sprintf(
			/* translators: %s: palette role. */
			__( 'Site %s', 'section-site-editor' ),
			ROLE_LABELS[ role ]
		),
		color: colors[ i ],
	} ) );
	setPath( settings, 'color.palette.custom', [ ...others, ...ours ] );
}

/**
 * Removes the plugin's colours from the user's palette.
 *
 * @param {Object} settings Global styles settings to change.
 * @param {Object} gs       From useGlobalStyles().
 */
function clearPalette( settings, gs ) {
	const current = gs.user?.settings?.color?.palette?.custom;
	if ( ! Array.isArray( current ) ) {
		return;
	}
	const others = current.filter(
		( entry ) => ! entry.slug?.startsWith( 'sse-' )
	);
	setPath(
		settings,
		'color.palette.custom',
		others.length ? others : undefined
	);
}

const SITE_THEME_PATHS = {
	'color.background': 'background',
	'color.text': 'text',
	'elements.heading.color.text': 'heading',
	'elements.link.color.text': 'link',
	'elements.button.color.background': 'buttonBg',
	'elements.button.color.text': 'buttonText',
};

function applySiteTheme( gs, slug ) {
	const theme = getSectionThemes().find( ( t ) => t.slug === slug );
	gs.edit( ( { settings, styles } ) => {
		Object.entries( SITE_THEME_PATHS ).forEach( ( [ path, key ] ) =>
			setPath(
				styles,
				path,
				theme
					? presetRef( 'color', `sse-${ theme[ key ] }` )
					: undefined
			)
		);
		setPath( settings, 'custom.sse.siteTheme', slug || undefined );
	} );
}

/**
 * Section colour themes used by blocks in the canvas, in page order, with the
 * first block using each.
 *
 * @return {{ used: string[], byTheme: Object }} Themes and blocks.
 */
function useThemesOnPage() {
	const pairs = useSelect( ( select ) => {
		const be = select( blockEditorStore );
		const seen = new Set();
		const out = [];
		be.getClientIdsWithDescendants().forEach( ( id ) => {
			const slug = getThemeFromClassName(
				be.getBlockAttributes( id )?.className
			);
			if ( slug && ! seen.has( slug ) ) {
				seen.add( slug );
				out.push( `${ slug }=${ id }` );
			}
		} );
		return out.join( ' ' );
	}, [] );
	return useMemo( () => {
		const byTheme = {};
		const used = [];
		pairs
			.split( ' ' )
			.filter( Boolean )
			.forEach( ( pair ) => {
				const [ slug, id ] = pair.split( '=' );
				used.push( slug );
				byTheme[ slug ] = id;
			} );
		return { used, byTheme };
	}, [ pairs ] );
}

/* --------------------------------------------------------- Pieces of UI */

function PaletteStrip( { colors, large } ) {
	return (
		<span className={ clsx( 'sse-strip', { 'is-large': large } ) }>
			{ colors.map( ( c, i ) => (
				<span key={ i } style={ { background: c } } />
			) ) }
		</span>
	);
}

function Card( { title, onOpen, children } ) {
	return (
		<div className="sse-card">
			<button type="button" className="sse-card__main" onClick={ onOpen }>
				<span className="sse-card__title">{ title }</span>
				<span className="sse-card__preview">{ children }</span>
			</button>
			<button
				type="button"
				className="sse-card__chevron"
				onClick={ onOpen }
				aria-label={ title }
			>
				<Icon icon={ chevronRight } />
			</button>
		</div>
	);
}

function Row( { label, value, onClick, children } ) {
	if ( onClick ) {
		return (
			<button
				type="button"
				className="sse-row is-link"
				onClick={ onClick }
			>
				<span>{ label }</span>
				<span className="sse-row__value">
					{ value }
					<Icon icon={ chevronRight } size={ 20 } />
				</span>
			</button>
		);
	}
	return (
		<div className="sse-row">
			<span>{ label }</span>
			<span className="sse-row__value">{ children }</span>
		</div>
	);
}

function ButtonSample( { gs, small } ) {
	const radius = gs.get( 'styles.elements.button.border.radius' );
	const padding = gs.user?.styles?.elements?.button?.spacing?.padding;
	const palette = useSitePalette();
	return (
		<span
			className={ clsx( 'sse-button-sample', { 'is-small': small } ) }
			style={ {
				borderRadius: radius || undefined,
				padding:
					padding && ! small
						? `${ padding.top } ${ padding.right }`
						: undefined,
				background: palette.darkest,
				color: palette.lightest,
			} }
		>
			{ __( 'Button', 'section-site-editor' ) }
		</span>
	);
}

/* ------------------------------------------------------------- Screens */

function MainScreen( { gs, go } ) {
	const palette = useSitePalette();
	const colors = PALETTE_ROLES.map( ( role ) => palette[ role ] );
	const { bySlug, body, headings, weight } = useFonts( gs );

	return (
		<div className="sse-styles__cards">
			<Card
				title={ __( 'Themes', 'section-site-editor' ) }
				onOpen={ () => go( 'themes' ) }
			>
				<span className="sse-theme-preview">
					<span
						className="sse-theme-preview__aa"
						style={ { fontFamily: bySlug[ headings ]?.fontFamily } }
					>
						Aa
					</span>
					<PaletteStrip colors={ colors } />
					<ButtonSample gs={ gs } small />
				</span>
			</Card>
			<Card
				title={ __( 'Fonts', 'section-site-editor' ) }
				onOpen={ () => go( 'fonts' ) }
			>
				<span className="sse-font-sample">
					<span
						className="sse-font-sample__heading"
						style={ {
							fontFamily: bySlug[ headings ]?.fontFamily,
							fontWeight: weight || undefined,
						} }
					>
						{ __( 'Heading', 'section-site-editor' ) }
					</span>
					<span
						className="sse-font-sample__body"
						style={ { fontFamily: bySlug[ body ]?.fontFamily } }
					>
						{ __(
							'This is your paragraph.',
							'section-site-editor'
						) }
					</span>
				</span>
			</Card>
			<Card
				title={ __( 'Colours', 'section-site-editor' ) }
				onOpen={ () => go( 'colours' ) }
			>
				<PaletteStrip colors={ colors } large />
			</Card>
			<Card
				title={ __( 'Buttons', 'section-site-editor' ) }
				onOpen={ () => go( 'buttons' ) }
			>
				<span className="sse-card__center">
					<ButtonSample gs={ gs } />
				</span>
			</Card>
			<Row
				label={ __( 'Spacing', 'section-site-editor' ) }
				onClick={ () => go( 'spacing' ) }
			/>
			<Row
				label={ __( 'Animations', 'section-site-editor' ) }
				value={
					getAnimations()[
						gs.get( 'settings.custom.sse.animation' )
					] || __( 'None', 'section-site-editor' )
				}
				onClick={ () => go( 'animations' ) }
			/>
		</div>
	);
}

function ThemesScreen( { gs } ) {
	const presets = getPalettePresets();
	const palette = useSitePalette();
	const radius = gs.get( 'styles.elements.button.border.radius' );
	const current = SITE_THEMES.find(
		( t ) =>
			presets[ t.palette ]?.colors.every(
				( c, i ) =>
					c.toLowerCase() ===
					( palette[ PALETTE_ROLES[ i ] ] || '' ).toLowerCase()
			) && BUTTON_RADIUS[ t.button ] === radius
	);

	const apply = ( theme ) =>
		gs.edit( ( { settings, styles } ) => {
			writePalette( settings, gs, presets[ theme.palette ].colors );
			setPath(
				styles,
				'elements.button.border.radius',
				BUTTON_RADIUS[ theme.button ]
			);
			setPath(
				styles,
				'elements.heading.typography.fontWeight',
				theme.weight
			);
		} );

	return (
		<div className="sse-styles__screen">
			<p className="sse-styles__help">
				{ __(
					'A theme sets the palette, button shape and heading weight together. Fine-tune each afterwards.',
					'section-site-editor'
				) }
			</p>
			<div className="sse-site-themes">
				{ SITE_THEMES.map( ( theme ) => {
					const colors = presets[ theme.palette ]?.colors || [];
					return (
						<button
							key={ theme.name }
							type="button"
							className={ clsx( 'sse-site-theme', {
								'is-selected': current === theme,
							} ) }
							onClick={ () => apply( theme ) }
						>
							<span
								className="sse-site-theme__preview"
								style={ { background: colors[ 0 ] } }
							>
								<span
									className="sse-site-theme__aa"
									style={ {
										color: colors[ 4 ],
										fontWeight: theme.weight,
									} }
								>
									Aa
								</span>
								<PaletteStrip colors={ colors } />
								<span
									className="sse-button-sample is-small"
									style={ {
										borderRadius:
											BUTTON_RADIUS[ theme.button ],
										background: colors[ 2 ],
										color: colors[ 0 ],
									} }
								>
									{ __( 'Button', 'section-site-editor' ) }
								</span>
							</span>
							<span className="sse-site-theme__name">
								{ theme.name }
							</span>
						</button>
					);
				} ) }
			</div>
		</div>
	);
}

function FontsScreen( { gs, go } ) {
	const { families, bySlug, body, headings, weight } = useFonts( gs );
	const options = [
		{
			value: '',
			label: __( 'Theme default', 'section-site-editor' ),
		},
		...families.map( ( f ) => ( {
			value: f.slug,
			label: f.name || f.slug,
		} ) ),
	];
	const setFont = ( path ) => ( slug ) =>
		gs.edit( ( { styles } ) =>
			setPath(
				styles,
				path,
				slug ? presetRef( 'font-family', slug ) : undefined
			)
		);
	const sizeValue = gs.get( 'styles.typography.fontSize' ) || '';
	const isPx = /px$/.test( sizeValue );
	const size = isPx ? parseFloat( sizeValue ) : null;
	const setSize = ( value ) =>
		gs.edit( ( { styles } ) =>
			setPath(
				styles,
				'typography.fontSize',
				value ? `${ value }px` : undefined
			)
		);
	const names = [ bySlug[ headings ]?.name, bySlug[ body ]?.name ]
		.filter( Boolean )
		.filter( ( n, i, all ) => all.indexOf( n ) === i )
		.join( ' · ' );

	return (
		<div className="sse-styles__screen">
			<div className="sse-font-preview">
				<span
					className="sse-font-preview__heading"
					style={ {
						fontFamily: bySlug[ headings ]?.fontFamily,
						fontWeight: weight || undefined,
					} }
				>
					{ __( 'Heading', 'section-site-editor' ) }
				</span>
				<span
					className="sse-font-preview__body"
					style={ { fontFamily: bySlug[ body ]?.fontFamily } }
				>
					{ __( 'This is your paragraph.', 'section-site-editor' ) }
				</span>
				<span className="sse-font-preview__names">
					{ names || __( 'Theme fonts', 'section-site-editor' ) }
				</span>
			</div>
			{ families.length > 1 && (
				<Row
					label={ __( 'All font packs', 'section-site-editor' ) }
					onClick={ () => go( 'font-packs' ) }
				/>
			) }
			<Row label={ __( 'Base size', 'section-site-editor' ) }>
				<span className="sse-stepper">
					<Button
						size="small"
						icon={ minus }
						label={ __( 'Smaller', 'section-site-editor' ) }
						onClick={ () =>
							setSize( Math.max( 12, ( size || 16 ) - 1 ) )
						}
					/>
					<span className="sse-stepper__value">
						{ size
							? sprintf(
									/* translators: %d: font size in pixels. */
									__( '%d px', 'section-site-editor' ),
									size
								)
							: __( 'Theme', 'section-site-editor' ) }
					</span>
					<Button
						size="small"
						icon={ plus }
						label={ __( 'Larger', 'section-site-editor' ) }
						onClick={ () =>
							setSize( Math.min( 26, ( size || 16 ) + 1 ) )
						}
					/>
				</span>
			</Row>
			<SelectControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label={ __( 'Headings', 'section-site-editor' ) }
				value={ headings || '' }
				options={ options }
				onChange={ setFont( 'elements.heading.typography.fontFamily' ) }
			/>
			<SelectControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label={ __( 'Paragraphs', 'section-site-editor' ) }
				value={ body || '' }
				options={ options }
				onChange={ setFont( 'typography.fontFamily' ) }
			/>
			<SelectControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label={ __( 'Heading weight', 'section-site-editor' ) }
				value={ String( weight ) }
				options={ [
					[ '', __( 'Theme default', 'section-site-editor' ) ],
					[ '300', __( 'Light', 'section-site-editor' ) ],
					[ '400', __( 'Regular', 'section-site-editor' ) ],
					[ '500', __( 'Medium', 'section-site-editor' ) ],
					[ '600', __( 'Semibold', 'section-site-editor' ) ],
					[ '700', __( 'Bold', 'section-site-editor' ) ],
					[ '800', __( 'Extra bold', 'section-site-editor' ) ],
				].map( ( [ value, label ] ) => ( { value, label } ) ) }
				onChange={ ( value ) =>
					gs.edit( ( { styles } ) =>
						setPath(
							styles,
							'elements.heading.typography.fontWeight',
							value || undefined
						)
					)
				}
			/>
		</div>
	);
}

function FontPacksScreen( { gs } ) {
	const { families, headings, body } = useFonts( gs );
	// Every heading/paragraph pairing from the fonts available, starting
	// with each font on its own.
	const packs = useMemo( () => {
		const list = families.slice( 0, 6 );
		const out = [];
		list.forEach( ( h ) => out.push( [ h, h ] ) );
		list.forEach( ( h ) =>
			list.forEach( ( b ) => {
				if ( h !== b ) {
					out.push( [ h, b ] );
				}
			} )
		);
		return out.slice( 0, 16 );
	}, [ families ] );

	return (
		<div className="sse-styles__screen">
			<div className="sse-font-packs">
				{ packs.map( ( [ h, b ] ) => (
					<button
						key={ `${ h.slug }/${ b.slug }` }
						type="button"
						className={ clsx( 'sse-font-pack', {
							'is-selected':
								headings === h.slug && body === b.slug,
						} ) }
						onClick={ () =>
							gs.edit( ( { styles } ) => {
								setPath(
									styles,
									'elements.heading.typography.fontFamily',
									presetRef( 'font-family', h.slug )
								);
								setPath(
									styles,
									'typography.fontFamily',
									presetRef( 'font-family', b.slug )
								);
							} )
						}
					>
						<span
							className="sse-font-pack__heading"
							style={ { fontFamily: h.fontFamily } }
						>
							{ h.name }
						</span>
						<span
							className="sse-font-pack__body"
							style={ { fontFamily: b.fontFamily } }
						>
							{ h === b
								? __(
										'Headings and paragraphs',
										'section-site-editor'
									)
								: b.name }
						</span>
					</button>
				) ) }
			</div>
		</div>
	);
}

function ColoursScreen( { gs } ) {
	const palette = useSitePalette();
	const colors = PALETTE_ROLES.map( ( role ) => palette[ role ] );
	const [ editing, setEditing ] = useState( false );
	const siteTheme = gs.user?.settings?.custom?.sse?.siteTheme || null;
	const { used, byTheme } = useThemesOnPage();
	const others = getSectionThemes()
		.map( ( t ) => t.slug )
		.filter( ( slug ) => ! used.includes( slug ) );
	const { selectBlock } = useDispatch( blockEditorStore );
	const { setShowThemeTags } = useDispatch( STORE_NAME );

	// Tag each section in the canvas with its theme while this is open.
	useEffect( () => {
		setShowThemeTags( true );
		return () => setShowThemeTags( false );
	}, [ setShowThemeTags ] );

	const isCurrent = ( preset ) =>
		preset.colors.every(
			( c, i ) => c.toLowerCase() === ( colors[ i ] || '' ).toLowerCase()
		);

	return (
		<div className="sse-styles__screen">
			<div className="sse-card is-static">
				<span className="sse-card__preview">
					<PaletteStrip colors={ colors } large />
				</span>
			</div>
			<Row
				label={ __( 'Edit palette', 'section-site-editor' ) }
				onClick={ () => setEditing( ! editing ) }
			/>
			{ editing && (
				<div className="sse-palette-editor">
					{ PALETTE_ROLES.map( ( role, i ) => (
						<Dropdown
							key={ role }
							popoverProps={ {
								placement: 'left-start',
								className: 'sse-popover',
							} }
							renderToggle={ ( { isOpen, onToggle } ) => (
								<button
									type="button"
									className="sse-palette-editor__swatch"
									onClick={ onToggle }
									aria-expanded={ isOpen }
								>
									<span
										style={ { background: colors[ i ] } }
									/>
									{ ROLE_LABELS[ role ] }
								</button>
							) }
							renderContent={ () => (
								<ColorPicker
									color={ colors[ i ] }
									enableAlpha={ false }
									onChange={ ( value ) => {
										const next = [ ...colors ];
										next[ i ] = value;
										gs.edit( ( { settings } ) =>
											writePalette( settings, gs, next )
										);
									} }
								/>
							) }
						/>
					) ) }
				</div>
			) }
			<h3 className="sse-styles__subhead">
				{ __( 'Recommended palettes', 'section-site-editor' ) }
			</h3>
			<div className="sse-palette-presets">
				{ getPalettePresets().map( ( preset ) => (
					<button
						key={ preset.name }
						type="button"
						title={ preset.name }
						aria-label={ preset.name }
						className={ clsx( 'sse-palette-preset', {
							'is-selected': isCurrent( preset ),
						} ) }
						onClick={ () =>
							gs.edit( ( { settings } ) =>
								writePalette( settings, gs, preset.colors )
							)
						}
					>
						<PaletteStrip colors={ preset.colors } />
					</button>
				) ) }
			</div>
			<h3 className="sse-styles__subhead">
				{ __( 'Section colour themes', 'section-site-editor' ) }
			</h3>
			<p className="sse-styles__help">
				{ __(
					'Each section uses one of these, coloured from the palette. Pick a section’s theme from Edit section → Colors.',
					'section-site-editor'
				) }
			</p>
			{ used.length > 0 && (
				<>
					<p className="sse-styles__label">
						{ __(
							'Colour themes on this page',
							'section-site-editor'
						) }
					</p>
					<ThemeSwatches
						allowNone={ false }
						only={ used }
						value={ null }
						label={ __(
							'Colour themes on this page',
							'section-site-editor'
						) }
						onChange={ ( slug ) => selectBlock( byTheme[ slug ] ) }
					/>
				</>
			) }
			{ others.length > 0 && (
				<>
					<p className="sse-styles__label">
						{ __( 'Other colour themes', 'section-site-editor' ) }
					</p>
					<div className="sse-theme-list is-static">
						<ThemeSwatches
							allowNone={ false }
							only={ others }
							value={ null }
							onChange={ () => {} }
						/>
					</div>
				</>
			) }
			<SelectControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label={ __( 'Site background', 'section-site-editor' ) }
				help={ __(
					'The colour theme for anything that isn’t in a coloured section.',
					'section-site-editor'
				) }
				value={ siteTheme || '' }
				options={ [
					{
						value: '',
						label: __( 'Theme default', 'section-site-editor' ),
					},
					...getSectionThemes().map( ( t ) => ( {
						value: t.slug,
						label: t.label,
					} ) ),
				] }
				onChange={ ( slug ) => applySiteTheme( gs, slug || null ) }
			/>
		</div>
	);
}

function ButtonsScreen( { gs } ) {
	const radius = gs.get( 'styles.elements.button.border.radius' );
	const padding = gs.user?.styles?.elements?.button?.spacing?.padding;
	const shape = keyFor( BUTTON_RADIUS, radius ) || '';
	const size = keyFor( BUTTON_PADDING, padding ) || '';

	return (
		<div className="sse-styles__screen">
			<div className="sse-card is-static">
				<span className="sse-card__preview sse-card__center">
					<ButtonSample gs={ gs } />
				</span>
			</div>
			<ToggleGroupControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				isBlock
				label={ __( 'Shape', 'section-site-editor' ) }
				value={ shape }
				onChange={ ( value ) =>
					gs.edit( ( { styles } ) =>
						setPath(
							styles,
							'elements.button.border.radius',
							BUTTON_RADIUS[ value ]
						)
					)
				}
			>
				<ToggleGroupControlOption
					value="square"
					label={ __( 'Square', 'section-site-editor' ) }
				/>
				<ToggleGroupControlOption
					value="rounded"
					label={ __( 'Rounded', 'section-site-editor' ) }
				/>
				<ToggleGroupControlOption
					value="pill"
					label={ __( 'Pill', 'section-site-editor' ) }
				/>
			</ToggleGroupControl>
			<ToggleGroupControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				isBlock
				label={ __( 'Size', 'section-site-editor' ) }
				value={ size }
				onChange={ ( value ) =>
					gs.edit( ( { styles } ) =>
						setPath(
							styles,
							'elements.button.spacing.padding',
							BUTTON_PADDING[ value ]
						)
					)
				}
			>
				<ToggleGroupControlOption
					value="small"
					label={ __( 'Small', 'section-site-editor' ) }
				/>
				<ToggleGroupControlOption
					value="medium"
					label={ __( 'Medium', 'section-site-editor' ) }
				/>
				<ToggleGroupControlOption
					value="large"
					label={ __( 'Large', 'section-site-editor' ) }
				/>
			</ToggleGroupControl>
		</div>
	);
}

function SpacingScreen( { gs } ) {
	const padding = gs.get( 'settings.custom.sse.sectionPadding' );
	const paddingKey = keyFor( SECTION_PADDING, padding ) || '';
	const contentSize = parseInt( gs.get( 'settings.layout.contentSize' ), 10 );
	const wideSize = parseInt( gs.get( 'settings.layout.wideSize' ), 10 );

	const stepper = ( value, min, max, step, onChange ) => (
		<span className="sse-stepper">
			<Button
				size="small"
				icon={ minus }
				label={ __( 'Less', 'section-site-editor' ) }
				onClick={ () => onChange( Math.max( min, value - step ) ) }
			/>
			<span className="sse-stepper__value">
				{ sprintf(
					/* translators: %d: width in pixels. */
					__( '%d px', 'section-site-editor' ),
					value
				) }
			</span>
			<Button
				size="small"
				icon={ plus }
				label={ __( 'More', 'section-site-editor' ) }
				onClick={ () => onChange( Math.min( max, value + step ) ) }
			/>
		</span>
	);

	return (
		<div className="sse-styles__screen">
			<ToggleGroupControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				isBlock
				label={ __( 'Section padding', 'section-site-editor' ) }
				help={ __(
					'Space above and below the content of coloured sections.',
					'section-site-editor'
				) }
				value={ paddingKey }
				onChange={ ( value ) =>
					gs.edit( ( { settings } ) =>
						setPath(
							settings,
							'custom.sse.sectionPadding',
							SECTION_PADDING[ value ]
						)
					)
				}
			>
				<ToggleGroupControlOption
					value="small"
					label={ __( 'Small', 'section-site-editor' ) }
				/>
				<ToggleGroupControlOption
					value="medium"
					label={ __( 'Medium', 'section-site-editor' ) }
				/>
				<ToggleGroupControlOption
					value="large"
					label={ __( 'Large', 'section-site-editor' ) }
				/>
			</ToggleGroupControl>
			<Row label={ __( 'Content width', 'section-site-editor' ) }>
				{ stepper(
					Number.isFinite( contentSize ) ? contentSize : 640,
					480,
					1200,
					20,
					( value ) =>
						gs.edit( ( { settings } ) =>
							setPath(
								settings,
								'layout.contentSize',
								`${ value }px`
							)
						)
				) }
			</Row>
			<Row label={ __( 'Wide width', 'section-site-editor' ) }>
				{ stepper(
					Number.isFinite( wideSize ) ? wideSize : 1200,
					800,
					1800,
					20,
					( value ) =>
						gs.edit( ( { settings } ) =>
							setPath(
								settings,
								'layout.wideSize',
								`${ value }px`
							)
						)
				) }
			</Row>
			<p className="sse-styles__help">
				{ __(
					'Wide width is also the width of freeform sections.',
					'section-site-editor'
				) }
			</p>
		</div>
	);
}

function AnimationsScreen( { gs } ) {
	const current = gs.get( 'settings.custom.sse.animation' ) || '';
	const options = [
		[ '', __( 'None', 'section-site-editor' ) ],
		...Object.entries( getAnimations() ),
	];
	const choose = ( slug ) => {
		gs.edit( ( { settings } ) =>
			setPath( settings, 'custom.sse.animation', slug || undefined )
		);
		previewAnimation( slug );
	};
	return (
		<div className="sse-styles__screen">
			<p className="sse-styles__help">
				{ __(
					'How section content appears as visitors scroll to it. Pick one to see it on the page.',
					'section-site-editor'
				) }
			</p>
			<div
				className="sse-anim-list"
				role="radiogroup"
				aria-label={ __( 'Animations', 'section-site-editor' ) }
			>
				{ options.map( ( [ slug, label ] ) => (
					<button
						key={ slug || 'none' }
						type="button"
						role="radio"
						aria-checked={ current === slug }
						className={ clsx( 'sse-anim-option', {
							'is-selected': current === slug,
						} ) }
						onClick={ () => choose( slug ) }
					>
						<span
							className={ `sse-anim-option__demo is-${
								slug || 'none'
							}` }
							aria-hidden="true"
						>
							<span />
							<span />
						</span>
						{ label }
					</button>
				) ) }
			</div>
			{ current && (
				<Button
					__next40pxDefaultSize
					variant="secondary"
					onClick={ () => previewAnimation( current ) }
				>
					{ __( 'Play again', 'section-site-editor' ) }
				</Button>
			) }
		</div>
	);
}

/* ---------------------------------------------------------------- Shell */

const SCREENS = {
	themes: {
		title: __( 'Themes', 'section-site-editor' ),
		Component: ThemesScreen,
	},
	fonts: {
		title: __( 'Fonts', 'section-site-editor' ),
		Component: FontsScreen,
	},
	'font-packs': {
		title: __( 'Font packs', 'section-site-editor' ),
		Component: FontPacksScreen,
		parent: 'fonts',
	},
	colours: {
		title: __( 'Colours', 'section-site-editor' ),
		Component: ColoursScreen,
	},
	buttons: {
		title: __( 'Buttons', 'section-site-editor' ),
		Component: ButtonsScreen,
	},
	spacing: {
		title: __( 'Spacing', 'section-site-editor' ),
		Component: SpacingScreen,
	},
	animations: {
		title: __( 'Animations', 'section-site-editor' ),
		Component: AnimationsScreen,
	},
};

/**
 * Clears what this panel sets: the site colours, fonts, button and spacing
 * values. A value is only cleared if it's one this panel would set, so
 * changes made in core's Styles panel survive.
 *
 * @param {Object} gs From useGlobalStyles().
 */
function resetAll( gs ) {
	const fontRef = ( value ) =>
		typeof value === 'string' &&
		value.startsWith( 'var:preset|font-family|' );
	const px = ( value ) =>
		typeof value === 'string' && /^\d+px$/.test( value );
	gs.edit( ( { settings, styles } ) => {
		clearPalette( settings, gs );
		const clearIf = ( object, path, test ) => {
			const value = path
				.split( '.' )
				.reduce( ( v, k ) => ( v ? v[ k ] : undefined ), object );
			if ( value !== undefined && test( value ) ) {
				setPath( object, path, undefined );
			}
		};
		clearIf( styles, 'typography.fontFamily', fontRef );
		clearIf( styles, 'elements.heading.typography.fontFamily', fontRef );
		clearIf( styles, 'typography.fontSize', px );
		clearIf( styles, 'elements.heading.typography.fontWeight', ( v ) =>
			[ '300', '400', '500', '600', '700', '800' ].includes( String( v ) )
		);
		clearIf( styles, 'elements.button.border.radius', ( v ) =>
			Object.values( BUTTON_RADIUS ).includes( v )
		);
		clearIf( styles, 'elements.button.spacing.padding', ( v ) =>
			Object.values( BUTTON_PADDING ).some(
				( p ) => JSON.stringify( p ) === JSON.stringify( v )
			)
		);
		Object.keys( SITE_THEME_PATHS ).forEach( ( path ) =>
			clearIf(
				styles,
				path,
				( v ) =>
					typeof v === 'string' &&
					v.startsWith( 'var:preset|color|sse-' )
			)
		);
		setPath( settings, 'custom.sse', undefined );
		clearIf( settings, 'layout.contentSize', px );
		clearIf( settings, 'layout.wideSize', px );
	} );
}

function ResetButton( { gs } ) {
	const [ confirming, setConfirming ] = useState( false );
	return (
		<>
			<Button
				__next40pxDefaultSize
				variant="tertiary"
				isDestructive
				onClick={ () => setConfirming( true ) }
			>
				{ __( 'Reset site styles', 'section-site-editor' ) }
			</Button>
			<ConfirmDialog
				isOpen={ confirming }
				confirmButtonText={ __( 'Reset', 'section-site-editor' ) }
				onConfirm={ () => {
					resetAll( gs );
					setConfirming( false );
				} }
				onCancel={ () => setConfirming( false ) }
			>
				{ __(
					'Reset the colours, fonts, buttons, spacing and animations set in Site Styles to the theme’s? You can undo this.',
					'section-site-editor'
				) }
			</ConfirmDialog>
		</>
	);
}

function SiteStylesPanel() {
	const gs = useGlobalStyles();
	const [ screen, setScreen ] = useState( null );

	if ( ! gs.ready ) {
		return null;
	}

	const current = screen ? SCREENS[ screen ] : null;
	if ( current ) {
		const { Component } = current;
		const parent = current.parent ? SCREENS[ current.parent ] : null;
		return (
			<div className="sse-styles">
				<button
					type="button"
					className="sse-styles__back"
					onClick={ () => setScreen( current.parent || null ) }
				>
					<Icon icon={ chevronLeft } size={ 20 } />
					{ parent
						? parent.title
						: __( 'Site Styles', 'section-site-editor' ) }
				</button>
				<h2 className="sse-styles__heading">{ current.title }</h2>
				<Component gs={ gs } go={ setScreen } />
			</div>
		);
	}

	return (
		<div className="sse-styles">
			<MainScreen gs={ gs } go={ setScreen } />
			<div className="sse-styles__footer">
				<ResetButton gs={ gs } />
			</div>
		</div>
	);
}

export default function SiteStyles() {
	return (
		<>
			<PluginSidebarMoreMenuItem target={ SIDEBAR } icon={ brush }>
				{ __( 'Site Styles', 'section-site-editor' ) }
			</PluginSidebarMoreMenuItem>
			<PluginSidebar
				name={ SIDEBAR }
				title={ __( 'Site Styles', 'section-site-editor' ) }
				icon={ brush }
				className="sse-styles-sidebar"
			>
				<SiteStylesPanel />
			</PluginSidebar>
		</>
	);
}
