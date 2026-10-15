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

/** @return {Object[]} Divider shapes: { slug, label, path }. */
export const getDividerShapes = () => settings.dividers || [];

/**
 * A section's divider, from its className.
 *
 * @param {string} className Block className attribute.
 * @return {{ shape: string|null, size: string, flip: boolean }} Divider.
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
	return { shape, size, flip: classes.includes( 'sse-divider-flip' ) };
}

/**
 * Returns className with its divider replaced.
 *
 * @param {string} className Current className.
 * @param {Object} divider   { shape, size, flip }; shape null removes it.
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
	}
	return kept.length ? kept.join( ' ' ) : undefined;
}
