import { useMemo } from '@wordpress/element';

import { presetList, useGlobalStyles } from './global-styles';

const settings = window.sseEditorSettings || {};

/** @return {Object[]} The ten section colour themes. */
export const getSectionThemes = () => settings.sectionThemes || [];

/** @return {Object[]} Curated five-colour palettes. */
export const getPalettePresets = () => settings.palettes || [];

export const PALETTE_ROLES = [
	'lightest',
	'light',
	'accent',
	'dark',
	'darkest',
];

export const THEME_CLASS_PREFIX = 'is-style-sse-';

/**
 * The section theme a block uses, from its className.
 *
 * @param {string} className Block className attribute.
 * @return {string|null} Theme slug, e.g. "dark-1".
 */
export function getThemeFromClassName( className = '' ) {
	const match = ( className || '' ).match(
		/(?:^|\s)is-style-sse-([a-z0-9-]+)/
	);
	return match ? match[ 1 ] : null;
}

/**
 * Returns className with its section theme replaced.
 *
 * @param {string}      className Current className.
 * @param {string|null} slug      Theme slug, or null for none.
 * @return {string|undefined} New className.
 */
export function withTheme( className = '', slug ) {
	const kept = ( className || '' )
		.split( /\s+/ )
		.filter( ( c ) => c && ! c.startsWith( 'is-style-' ) );
	if ( slug ) {
		kept.push( THEME_CLASS_PREFIX + slug );
	}
	return kept.length ? kept.join( ' ' ) : undefined;
}

/**
 * The current site palette as { lightest, light, accent, dark, darkest } hex
 * values: the user's global styles, falling back to the theme's. The editor chrome
 * can't use the canvas CSS variables, so swatches use these.
 *
 * @return {Object} Colours by role.
 */
export function useSitePalette() {
	const { user, base } = useGlobalStyles();
	return useMemo( () => {
		const list = ( value ) => ( Array.isArray( value ) ? value : [] );
		const userPalette = user?.settings?.color?.palette || {};
		// Custom first: that's where Site Styles writes, and it wins.
		const colors = [
			...list( userPalette.custom ),
			...list( userPalette.theme ),
			...presetList( base?.settings?.color?.palette, [ 'theme' ] ),
		];
		const out = {};
		PALETTE_ROLES.forEach( ( role ) => {
			const found = colors.find( ( c ) => c.slug === `sse-${ role }` );
			out[ role ] = found?.color || '#ccc';
		} );
		return out;
	}, [ user, base ] );
}

/** @return {Object<string,string>} Animations: slug => label. */
export const getAnimations = () => settings.animations || {};

/** @return {Object[]} Divider shapes: { slug, label, path }. */
export const getDividerShapes = () => settings.dividers || [];

/**
 * A section's divider, from its className.
 *
 * @param {string} className Block className attribute.
 * @return {{ shape: string|null, size: string, flip: boolean, width: number, offset: number, stroke: number }} Divider.
 */
export function getDivider( className = '' ) {
	const classes = ( className || '' ).split( /\s+/ );
	const shapes = getDividerShapes().map( ( d ) => d.slug );
	const shape =
		shapes.find( ( slug ) =>
			classes.includes( `sse-divider-${ slug }` )
		) || null;
	let size = 'm';
	if ( classes.includes( 'sse-divider-s' ) ) {
		size = 's';
	} else if ( classes.includes( 'sse-divider-l' ) ) {
		size = 'l';
	}
	const number = ( prefix, fallback ) => {
		const found = classes.find( ( c ) => c.startsWith( prefix ) );
		if ( ! found ) {
			return fallback;
		}
		const value = found.slice( prefix.length );
		return value.startsWith( 'm' )
			? -Number( value.slice( 1 ) )
			: Number( value );
	};
	return {
		shape,
		size,
		flip: classes.includes( 'sse-divider-flip' ),
		width: number( 'sse-divider-w-', 100 ),
		offset: number( 'sse-divider-x-', 0 ),
		stroke: number( 'sse-divider-stroke-', 0 ),
	};
}

/**
 * Returns className with its divider replaced.
 *
 * @param {string} className Current className.
 * @param {Object} divider   { shape, size, flip, width, offset, stroke };
 *                           shape null removes it.
 * @return {string|undefined} New className.
 */
export function withDivider( className = '', divider ) {
	const kept = ( className || '' )
		.split( /\s+/ )
		.filter( ( c ) => c && ! c.startsWith( 'sse-divider-' ) );
	if ( divider?.shape ) {
		kept.push( `sse-divider-${ divider.shape }` );
		if ( divider.size && divider.size !== 'm' ) {
			kept.push( `sse-divider-${ divider.size }` );
		}
		if ( divider.flip ) {
			kept.push( 'sse-divider-flip' );
		}
		if ( divider.width && divider.width !== 100 ) {
			kept.push( `sse-divider-w-${ divider.width }` );
		}
		if ( divider.offset ) {
			kept.push(
				`sse-divider-x-${
					divider.offset < 0
						? `m${ Math.abs( divider.offset ) }`
						: divider.offset
				}`
			);
		}
		if ( divider.stroke ) {
			kept.push( `sse-divider-stroke-${ divider.stroke }` );
		}
	}
	return kept.length ? kept.join( ' ' ) : undefined;
}

function luminance( hex ) {
	const value = ( hex || '' ).replace( '#', '' );
	const full =
		value.length === 3
			? value
					.split( '' )
					.map( ( c ) => c + c )
					.join( '' )
			: value.slice( 0, 6 );
	const channels = [ 0, 2, 4 ].map( ( i ) => {
		const c = parseInt( full.slice( i, i + 2 ), 16 ) / 255;
		return c <= 0.03928
			? c / 12.92
			: Math.pow( ( c + 0.055 ) / 1.055, 2.4 );
	} );
	if ( channels.some( ( c ) => Number.isNaN( c ) ) ) {
		return null;
	}
	return (
		0.2126 * channels[ 0 ] + 0.7152 * channels[ 1 ] + 0.0722 * channels[ 2 ]
	);
}

/**
 * Contrast ratio between two hex colours, or null if either can't be read.
 *
 * @param {string} a Hex colour.
 * @param {string} b Hex colour.
 * @return {number|null} Ratio, 1 to 21.
 */
export function contrast( a, b ) {
	const la = luminance( a );
	const lb = luminance( b );
	if ( la === null || lb === null ) {
		return null;
	}
	return ( Math.max( la, lb ) + 0.05 ) / ( Math.min( la, lb ) + 0.05 );
}

/**
 * A text colour for labels on a background: the preferred one if it's
 * readable (4.5:1), otherwise black or white, whichever reads better.
 *
 * @param {string} background Hex colour.
 * @param {string} preferred  Hex colour.
 * @return {string} Hex colour.
 */
export function readableOn( background, preferred ) {
	const ratio = contrast( background, preferred );
	if ( ratio === null || ratio >= 4.5 ) {
		return preferred;
	}
	return contrast( background, '#000000' ) >=
		contrast( background, '#ffffff' )
		? '#000000'
		: '#ffffff';
}
