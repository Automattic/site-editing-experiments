/**
 * Site Styles: one place for fonts, colours, buttons and spacing, laid out
 * like Squarespace's panel (a short menu that drills into each area). Every
 * control writes to the user's global styles.
 */
import clsx from 'clsx';
import { __, sprintf } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import {
	Button,
	ColorPicker,
	Dropdown,
	RangeControl,
	SelectControl,
	// ToggleGroupControl is what core's own Styles panel uses for these choices.
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControl as ToggleGroupControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import { PluginSidebar, PluginSidebarMoreMenuItem } from '@wordpress/editor';
import {
	brush,
	button as buttonIcon,
	chevronLeft,
	chevronRight,
	color as colorIcon,
	Icon,
	layout as layoutIcon,
	typography,
} from '@wordpress/icons';

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
	useSitePalette,
} from './settings';
import ThemeSwatches from './theme-swatches';

const SIDEBAR = 'sse-site-styles';

const ROLE_LABELS = {
	lightest: __( 'Lightest', 'squarespace-style-site-editor' ),
	light: __( 'Light', 'squarespace-style-site-editor' ),
	accent: __( 'Accent', 'squarespace-style-site-editor' ),
	dark: __( 'Dark', 'squarespace-style-site-editor' ),
	darkest: __( 'Darkest', 'squarespace-style-site-editor' ),
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

const keyFor = ( map, value ) =>
	Object.keys( map ).find(
		( key ) => JSON.stringify( map[ key ] ) === JSON.stringify( value )
	);

/* ---------------------------------------------------------------- Fonts */

function FontsScreen( { gs } ) {
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

	const options = [
		{
			value: '',
			label: __( 'Theme default', 'squarespace-style-site-editor' ),
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

	const fontSize = parseFloat( gs.get( 'styles.typography.fontSize' ) ) || 18;
	const isPx = /px$/.test( gs.get( 'styles.typography.fontSize' ) || '' );
	const weight =
		gs.get( 'styles.elements.heading.typography.fontWeight' ) || '';

	return (
		<div className="sse-styles__screen">
			{ families.length === 0 && (
				<p className="sse-styles__help">
					{ __(
						"Your theme doesn't define any fonts. Add some in the Font Library.",
						'squarespace-style-site-editor'
					) }
				</p>
			) }
			<div className="sse-font-preview">
				<span
					className="sse-font-preview__heading"
					style={ {
						fontFamily: bySlug[ headings ]?.fontFamily,
						fontWeight: weight || undefined,
					} }
				>
					{ __( 'Heading', 'squarespace-style-site-editor' ) }
				</span>
				<span
					className="sse-font-preview__body"
					style={ { fontFamily: bySlug[ body ]?.fontFamily } }
				>
					{ __(
						'Paragraph text looks like this.',
						'squarespace-style-site-editor'
					) }
				</span>
			</div>
			<SelectControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label={ __( 'Headings', 'squarespace-style-site-editor' ) }
				value={ headings || '' }
				options={ options }
				onChange={ setFont( 'elements.heading.typography.fontFamily' ) }
			/>
			<SelectControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label={ __( 'Paragraphs', 'squarespace-style-site-editor' ) }
				value={ body || '' }
				options={ options }
				onChange={ setFont( 'typography.fontFamily' ) }
			/>
			<SelectControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label={ __(
					'Heading weight',
					'squarespace-style-site-editor'
				) }
				value={ String( weight ) }
				options={ [
					{
						value: '',
						label: __(
							'Theme default',
							'squarespace-style-site-editor'
						),
					},
					{
						value: '300',
						label: __( 'Light', 'squarespace-style-site-editor' ),
					},
					{
						value: '400',
						label: __( 'Regular', 'squarespace-style-site-editor' ),
					},
					{
						value: '500',
						label: __( 'Medium', 'squarespace-style-site-editor' ),
					},
					{
						value: '600',
						label: __(
							'Semibold',
							'squarespace-style-site-editor'
						),
					},
					{
						value: '700',
						label: __( 'Bold', 'squarespace-style-site-editor' ),
					},
					{
						value: '800',
						label: __(
							'Extra bold',
							'squarespace-style-site-editor'
						),
					},
				] }
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
			<RangeControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label={ __(
					'Paragraph size (px)',
					'squarespace-style-site-editor'
				) }
				help={
					isPx
						? undefined
						: __(
								'Using the theme size until you change it.',
								'squarespace-style-site-editor'
							)
				}
				min={ 13 }
				max={ 24 }
				value={ isPx ? fontSize : undefined }
				initialPosition={ 18 }
				allowReset
				resetFallbackValue={ undefined }
				onChange={ ( value ) =>
					gs.edit( ( { styles } ) =>
						setPath(
							styles,
							'typography.fontSize',
							value ? `${ value }px` : undefined
						)
					)
				}
			/>
		</div>
	);
}

/* --------------------------------------------------------------- Colours */

function themePalette( gs ) {
	const user = gs.user?.settings?.color?.palette?.theme;
	if ( Array.isArray( user ) ) {
		return user;
	}
	return presetList( gs.base?.settings?.color?.palette, [ 'theme' ] );
}

function writePalette( gs, colors ) {
	gs.edit( ( { settings } ) => {
		const next = themePalette( gs ).map( ( entry ) => ( { ...entry } ) );
		PALETTE_ROLES.forEach( ( role, i ) => {
			const slug = `sse-${ role }`;
			const existing = next.find( ( e ) => e.slug === slug );
			if ( existing ) {
				existing.color = colors[ i ];
			} else {
				next.push( {
					slug,
					name: sprintf(
						/* translators: %s: palette role. */
						__( 'Site %s', 'squarespace-style-site-editor' ),
						ROLE_LABELS[ role ]
					),
					color: colors[ i ],
				} );
			}
		} );
		setPath( settings, 'color.palette.theme', next );
	} );
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

function ColoursScreen( { gs } ) {
	const palette = useSitePalette();
	const colors = PALETTE_ROLES.map( ( role ) => palette[ role ] );
	const siteTheme = gs.user?.settings?.custom?.sse?.siteTheme || null;

	const isCurrent = ( preset ) =>
		preset.colors.every(
			( c, i ) => c.toLowerCase() === ( colors[ i ] || '' ).toLowerCase()
		);

	return (
		<div className="sse-styles__screen">
			<h3 className="sse-styles__subhead">
				{ __( 'Palette', 'squarespace-style-site-editor' ) }
			</h3>
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
								<span style={ { background: colors[ i ] } } />
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
									writePalette( gs, next );
								} }
							/>
						) }
					/>
				) ) }
			</div>
			<h3 className="sse-styles__subhead">
				{ __( 'Palettes', 'squarespace-style-site-editor' ) }
			</h3>
			<div className="sse-palette-presets">
				{ getPalettePresets().map( ( preset ) => (
					<button
						key={ preset.name }
						type="button"
						className={ clsx( 'sse-palette-preset', {
							'is-selected': isCurrent( preset ),
						} ) }
						onClick={ () => writePalette( gs, preset.colors ) }
					>
						<span className="sse-palette-preset__colors">
							{ preset.colors.map( ( c, i ) => (
								<span key={ i } style={ { background: c } } />
							) ) }
						</span>
						{ preset.name }
					</button>
				) ) }
			</div>
			<h3 className="sse-styles__subhead">
				{ __( 'Site background', 'squarespace-style-site-editor' ) }
			</h3>
			<p className="sse-styles__help">
				{ __(
					'The colour theme for anything outside a coloured section. Sections pick their own from the Colours button on each section.',
					'squarespace-style-site-editor'
				) }
			</p>
			<ThemeSwatches
				value={ siteTheme }
				onChange={ ( slug ) => applySiteTheme( gs, slug ) }
			/>
		</div>
	);
}

/* --------------------------------------------------------------- Buttons */

function ButtonsScreen( { gs } ) {
	const radius = gs.get( 'styles.elements.button.border.radius' );
	const padding = gs.user?.styles?.elements?.button?.spacing?.padding;
	const shape = keyFor( BUTTON_RADIUS, radius ) || '';
	const size = keyFor( BUTTON_PADDING, padding ) || '';

	return (
		<div className="sse-styles__screen">
			<div className="sse-button-preview">
				<span
					style={ {
						borderRadius: radius || undefined,
						padding: padding
							? `${ padding.top } ${ padding.right }`
							: undefined,
					} }
				>
					{ __( 'Book now', 'squarespace-style-site-editor' ) }
				</span>
			</div>
			<ToggleGroupControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				isBlock
				label={ __( 'Shape', 'squarespace-style-site-editor' ) }
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
					label={ __( 'Square', 'squarespace-style-site-editor' ) }
				/>
				<ToggleGroupControlOption
					value="rounded"
					label={ __( 'Rounded', 'squarespace-style-site-editor' ) }
				/>
				<ToggleGroupControlOption
					value="pill"
					label={ __( 'Pill', 'squarespace-style-site-editor' ) }
				/>
			</ToggleGroupControl>
			<ToggleGroupControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				isBlock
				label={ __( 'Size', 'squarespace-style-site-editor' ) }
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
					label={ __( 'Small', 'squarespace-style-site-editor' ) }
				/>
				<ToggleGroupControlOption
					value="medium"
					label={ __( 'Medium', 'squarespace-style-site-editor' ) }
				/>
				<ToggleGroupControlOption
					value="large"
					label={ __( 'Large', 'squarespace-style-site-editor' ) }
				/>
			</ToggleGroupControl>
		</div>
	);
}

/* --------------------------------------------------------------- Spacing */

function SpacingScreen( { gs } ) {
	const padding = gs.get( 'settings.custom.sse.sectionPadding' );
	const paddingKey = keyFor( SECTION_PADDING, padding ) || '';
	const contentSize = parseInt( gs.get( 'settings.layout.contentSize' ), 10 );
	const wideSize = parseInt( gs.get( 'settings.layout.wideSize' ), 10 );

	return (
		<div className="sse-styles__screen">
			<ToggleGroupControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				isBlock
				label={ __(
					'Section padding',
					'squarespace-style-site-editor'
				) }
				help={ __(
					'Space above and below the content of coloured sections.',
					'squarespace-style-site-editor'
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
					label={ __( 'Small', 'squarespace-style-site-editor' ) }
				/>
				<ToggleGroupControlOption
					value="medium"
					label={ __( 'Medium', 'squarespace-style-site-editor' ) }
				/>
				<ToggleGroupControlOption
					value="large"
					label={ __( 'Large', 'squarespace-style-site-editor' ) }
				/>
			</ToggleGroupControl>
			<RangeControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label={ __(
					'Content width (px)',
					'squarespace-style-site-editor'
				) }
				min={ 480 }
				max={ 1200 }
				step={ 10 }
				value={ Number.isFinite( contentSize ) ? contentSize : 640 }
				onChange={ ( value ) =>
					gs.edit( ( { settings } ) =>
						setPath(
							settings,
							'layout.contentSize',
							value ? `${ value }px` : undefined
						)
					)
				}
			/>
			<RangeControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label={ __(
					'Wide width (px)',
					'squarespace-style-site-editor'
				) }
				help={ __(
					'Also the width of freeform sections.',
					'squarespace-style-site-editor'
				) }
				min={ 800 }
				max={ 1800 }
				step={ 10 }
				value={ Number.isFinite( wideSize ) ? wideSize : 1200 }
				onChange={ ( value ) =>
					gs.edit( ( { settings } ) =>
						setPath(
							settings,
							'layout.wideSize',
							value ? `${ value }px` : undefined
						)
					)
				}
			/>
		</div>
	);
}

/* ------------------------------------------------------------------ Shell */

const SCREENS = [
	{
		key: 'fonts',
		label: __( 'Fonts', 'squarespace-style-site-editor' ),
		icon: typography,
		Component: FontsScreen,
	},
	{
		key: 'colours',
		label: __( 'Colours', 'squarespace-style-site-editor' ),
		icon: colorIcon,
		Component: ColoursScreen,
	},
	{
		key: 'buttons',
		label: __( 'Buttons', 'squarespace-style-site-editor' ),
		icon: buttonIcon,
		Component: ButtonsScreen,
	},
	{
		key: 'spacing',
		label: __( 'Spacing', 'squarespace-style-site-editor' ),
		icon: layoutIcon,
		Component: SpacingScreen,
	},
];

function resetAll( gs ) {
	gs.edit( ( { settings, styles } ) => {
		[
			'typography.fontFamily',
			'typography.fontSize',
			'elements.heading.typography.fontFamily',
			'elements.heading.typography.fontWeight',
			'elements.button.border.radius',
			'elements.button.spacing.padding',
			...Object.keys( SITE_THEME_PATHS ),
		].forEach( ( path ) => setPath( styles, path, undefined ) );
		[
			'custom.sse',
			'layout.contentSize',
			'layout.wideSize',
			'color.palette.theme',
		].forEach( ( path ) => setPath( settings, path, undefined ) );
	} );
}

function SiteStylesPanel() {
	const gs = useGlobalStyles();
	const [ screen, setScreen ] = useState( null );

	if ( ! gs.ready ) {
		return null;
	}

	const current = SCREENS.find( ( s ) => s.key === screen );

	if ( current ) {
		const { Component } = current;
		return (
			<div className="sse-styles">
				<div className="sse-styles__header">
					<Button
						icon={ chevronLeft }
						label={ __( 'Back', 'squarespace-style-site-editor' ) }
						onClick={ () => setScreen( null ) }
						size="compact"
					/>
					<h2>{ current.label }</h2>
				</div>
				<Component gs={ gs } />
			</div>
		);
	}

	return (
		<div className="sse-styles">
			<nav className="sse-styles__menu">
				{ SCREENS.map( ( s ) => (
					<button
						key={ s.key }
						type="button"
						className="sse-styles__menu-item"
						onClick={ () => setScreen( s.key ) }
					>
						<Icon icon={ s.icon } />
						<span>{ s.label }</span>
						<Icon
							icon={ chevronRight }
							className="sse-styles__chevron"
						/>
					</button>
				) ) }
			</nav>
			<div className="sse-styles__footer">
				<Button
					__next40pxDefaultSize
					variant="tertiary"
					isDestructive
					onClick={ () => resetAll( gs ) }
				>
					{ __(
						'Reset site styles',
						'squarespace-style-site-editor'
					) }
				</Button>
			</div>
		</div>
	);
}

export default function SiteStyles() {
	return (
		<>
			<PluginSidebarMoreMenuItem target={ SIDEBAR } icon={ brush }>
				{ __( 'Site Styles', 'squarespace-style-site-editor' ) }
			</PluginSidebarMoreMenuItem>
			<PluginSidebar
				name={ SIDEBAR }
				title={ __( 'Site Styles', 'squarespace-style-site-editor' ) }
				icon={ brush }
				className="sse-styles-sidebar"
			>
				<SiteStylesPanel />
			</PluginSidebar>
		</>
	);
}
