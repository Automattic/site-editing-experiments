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
		const userPalette = user?.settings?.color?.palette?.theme;
		const colors = [
			...( Array.isArray( userPalette ) ? userPalette : [] ),
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
