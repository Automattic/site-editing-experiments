/**
 * Small helpers for reading and editing the user's global styles entity, the
 * same record the core Styles panel edits. Changes show up immediately in the
 * canvas and are saved with the site editor's Save button.
 */
import { useDispatch, useSelect } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';

export function getPath( object, path ) {
	return path
		.split( '.' )
		.reduce(
			( value, key ) =>
				value === null || value === undefined
					? undefined
					: value[ key ],
			object
		);
}

/**
 * Sets a dotted path on a plain object, creating objects on the way. An
 * undefined value deletes the key and prunes any objects left empty.
 *
 * @param {Object}  object Object to change in place.
 * @param {string}  path   Dotted path.
 * @param {unknown} value  New value.
 */
export function setPath( object, path, value ) {
	const keys = path.split( '.' );
	const parents = [ object ];
	let target = object;
	for ( let i = 0; i < keys.length - 1; i++ ) {
		if (
			typeof target[ keys[ i ] ] !== 'object' ||
			target[ keys[ i ] ] === null
		) {
			if ( value === undefined ) {
				return;
			}
			target[ keys[ i ] ] = {};
		}
		target = target[ keys[ i ] ];
		parents.push( target );
	}
	const last = keys[ keys.length - 1 ];
	if ( value === undefined ) {
		delete target[ last ];
		for ( let i = parents.length - 1; i > 0; i-- ) {
			if ( Object.keys( parents[ i ] ).length === 0 ) {
				delete parents[ i - 1 ][ keys[ i - 1 ] ];
			}
		}
	} else {
		target[ last ] = value;
	}
}

/**
 * Flattens a preset list that may be an array or keyed by origin.
 *
 * @param {Array|Object} presets Presets.
 * @param {string[]}     origins Origins to include, in order.
 * @return {Object[]} Presets.
 */
export function presetList( presets, origins = [ 'theme', 'custom' ] ) {
	if ( ! presets ) {
		return [];
	}
	if ( Array.isArray( presets ) ) {
		return presets;
	}
	return origins.flatMap( ( origin ) => presets[ origin ] || [] );
}

/**
 * Pulls a slug out of "var:preset|font-family|inter" or
 * "var(--wp--preset--font-family--inter)".
 *
 * @param {string} value Style value.
 * @param {string} type  Preset type, e.g. "font-family".
 * @return {string|null} Slug.
 */
export function presetSlug( value, type ) {
	if ( typeof value !== 'string' ) {
		return null;
	}
	const short = value.match(
		new RegExp( `^var:preset\\|${ type }\\|(.+)$` )
	);
	if ( short ) {
		return short[ 1 ];
	}
	const long = value.match(
		new RegExp( `--wp--preset--${ type }--([^)\\s]+)` )
	);
	return long ? long[ 1 ] : null;
}

export const presetRef = ( type, slug ) => `var:preset|${ type }|${ slug }`;

export function useGlobalStyles() {
	const { id, user, base } = useSelect( ( select ) => {
		const core = select( coreStore );
		const recordId = core.__experimentalGetCurrentGlobalStylesId();
		return {
			id: recordId,
			user: recordId
				? core.getEditedEntityRecord( 'root', 'globalStyles', recordId )
				: undefined,
			base: core.__experimentalGetCurrentThemeBaseGlobalStyles(),
		};
	}, [] );
	const { editEntityRecord } = useDispatch( coreStore );

	const edit = ( mutate ) => {
		if ( ! id || ! user ) {
			return;
		}
		const settings = structuredClone( user.settings || {} );
		const styles = structuredClone( user.styles || {} );
		mutate( { settings, styles } );
		editEntityRecord( 'root', 'globalStyles', id, { settings, styles } );
	};

	/**
	 * The value in effect: the user's, falling back to the theme's.
	 *
	 * @param {string} path e.g. "styles.typography.fontFamily".
	 * @return {unknown} Value.
	 */
	const get = ( path ) => {
		const value = getPath( user, path );
		return value !== undefined ? value : getPath( base, path );
	};

	return { ready: !! ( id && user && base ), user, base, get, edit };
}
