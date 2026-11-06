/**
 * Tools made from a block type: JSON Schemas for a block's own attributes,
 * and for its design from what it supports and the theme's presets. No
 * editor here, so it's tested on its own.
 */

// Attributes the style tool covers, or that aren't for changing by hand.
const NOT_CONTENT = new Set( [
	'lock',
	'metadata',
	'style',
	'className',
	'backgroundColor',
	'textColor',
	'gradient',
	'fontSize',
	'fontFamily',
	'borderColor',
	'align',
	'layout',
	'allowedBlocks',
	'templateLock',
] );

const DEFAULT = 'default';

/**
 * The theme's presets, from the block editor's settings.
 *
 * @param {Object} settings The block editor's settings.
 * @return {Object} `{ colors, gradients, fontSizes, fontFamilies, spacing }`,
 *                  each a list of `{ slug, name, value }`.
 */
export function getPresets( settings = {} ) {
	const f = settings.__experimentalFeatures || {};
	const origins = ( v ) =>
		Array.isArray( v )
			? v
			: [
					...( v?.custom || [] ),
					...( v?.theme || [] ),
					...( v?.default || [] ),
				];
	const uniq = ( list ) => {
		const seen = new Set();
		return list.filter( ( p ) => {
			if ( ! p?.slug || seen.has( p.slug ) ) {
				return false;
			}
			seen.add( p.slug );
			return true;
		} );
	};
	const pick = ( list, key ) =>
		uniq( list ).map( ( p ) => ( {
			slug: p.slug,
			name: p.name || p.slug,
			value: p[ key ],
		} ) );
	return {
		colors: pick(
			settings.colors?.length
				? settings.colors
				: origins( f.color?.palette ),
			'color'
		),
		gradients: pick(
			settings.gradients?.length
				? settings.gradients
				: origins( f.color?.gradients ),
			'gradient'
		),
		fontSizes: pick(
			settings.fontSizes?.length
				? settings.fontSizes
				: origins( f.typography?.fontSizes ),
			'size'
		),
		fontFamilies: pick(
			origins( f.typography?.fontFamilies ),
			'fontFamily'
		),
		spacing: pick( origins( f.spacing?.spacingSizes ), 'size' ),
	};
}

function attributeSchema( name, def ) {
	if ( def.role === 'local' || def.source === 'raw' ) {
		return null;
	}
	const types = Array.isArray( def.type ) ? def.type : [ def.type ];
	let type = types[ 0 ];
	const schema = {};
	if ( type === 'rich-text' || def.source === 'html' ) {
		schema.type = 'string';
		schema.description =
			'Text. Inline HTML is fine: <strong>, <em>, <a href="…">, <br>.';
	} else if ( def.enum ) {
		schema.enum = def.enum;
		if ( def.enum.every( ( v ) => typeof v === 'string' ) ) {
			schema.type = 'string';
		} else if ( def.enum.every( ( v ) => typeof v === 'number' ) ) {
			schema.type = 'number';
		}
	} else if ( type ) {
		if (
			! [
				'string',
				'number',
				'integer',
				'boolean',
				'array',
				'object',
				'null',
			].includes( type )
		) {
			type = 'string';
		}
		schema.type = types.length > 1 ? types : type;
	}
	// Not as `default`: agents and browsers fill defaults in, which would
	// reset what's there. Said in words instead.
	if ( def.default !== undefined && typeof def.default !== 'object' ) {
		schema.description = [
			schema.description,
			`WordPress' default is ${ JSON.stringify( def.default ) }.`,
		]
			.filter( Boolean )
			.join( ' ' );
	}
	if ( ! schema.type && ! schema.enum ) {
		return null;
	}
	return schema;
}

/**
 * A schema for a block's own attributes: the ones that are content or the
 * block's own settings, not its design.
 *
 * @param {Object} blockType A registered block type.
 * @return {Object} A JSON Schema for an object of attributes.
 */
export function attributesSchema( blockType ) {
	const properties = {};
	Object.entries( blockType?.attributes || {} ).forEach(
		( [ name, def ] ) => {
			if ( NOT_CONTENT.has( name ) ) {
				return;
			}
			const schema = attributeSchema( name, def || {} );
			if ( schema ) {
				properties[ name ] = schema;
			}
		}
	);
	return { type: 'object', properties, additionalProperties: false };
}

const presetEnum = ( list ) => [ DEFAULT, ...list.map( ( p ) => p.slug ) ];
const presetHelp = ( list, unit = '' ) =>
	list
		.slice( 0, 24 )
		.map(
			( p ) =>
				`${ p.slug } (${ p.name }${ p.value && unit ? `, ${ p.value }` : '' })`
		)
		.join( ', ' );

/**
 * What a block type supports for its design, read from block.json's
 * `supports` with WordPress' defaults.
 *
 * @param {Object} blockType A registered block type.
 * @return {Object} Flags.
 */
export function designSupports( blockType ) {
	const s = blockType?.supports || {};
	const color = s.color;
	const hasColor = !! color;
	const typo = s.typography || {};
	const spacing = s.spacing || {};
	const border = s.__experimentalBorder || s.border || {};
	let align = [];
	if ( s.align === true ) {
		align = [ 'left', 'center', 'right', 'wide', 'full' ];
	} else if ( Array.isArray( s.align ) ) {
		align = s.align;
	}
	return {
		text: hasColor && color.text !== false,
		background: hasColor && color.background !== false,
		gradients: hasColor && !! color.gradients,
		link: hasColor && !! color.link,
		fontSize: !! ( typo.fontSize || s.fontSize ),
		fontFamily: !! ( typo.__experimentalFontFamily || typo.fontFamily ),
		padding: !! spacing.padding,
		margin: !! spacing.margin,
		radius: !! border.radius,
		minHeight: !! s.dimensions?.minHeight,
		align,
	};
}

/**
 * A schema for a block's design, from what it supports and the theme's
 * presets. Every preset field takes `default` to go back to the theme's.
 *
 * @param {Object} blockType A registered block type.
 * @param {Object} presets   From getPresets().
 * @return {Object|null} A JSON Schema, or null if it has no design to change.
 */
export function designSchema( blockType, presets ) {
	const has = designSupports( blockType );
	const p = {};
	if ( has.text && presets.colors.length ) {
		p.textColor = {
			enum: presetEnum( presets.colors ),
			description: `Text colour, from the theme's palette: ${ presetHelp( presets.colors, true ) }.`,
		};
	}
	if ( has.background && presets.colors.length ) {
		p.backgroundColor = {
			enum: presetEnum( presets.colors ),
			description: 'Background colour, from the same palette.',
		};
	}
	if ( has.gradients && presets.gradients.length ) {
		p.gradient = {
			enum: presetEnum( presets.gradients ),
			description: `Background gradient: ${ presetHelp( presets.gradients ) }.`,
		};
	}
	if ( has.link && presets.colors.length ) {
		p.linkColor = {
			enum: presetEnum( presets.colors ),
			description: 'Colour of links inside it.',
		};
	}
	if ( has.fontSize && presets.fontSizes.length ) {
		p.fontSize = {
			enum: presetEnum( presets.fontSizes ),
			description: `Font size: ${ presetHelp( presets.fontSizes, true ) }.`,
		};
	}
	if ( has.fontFamily && presets.fontFamilies.length ) {
		p.fontFamily = {
			enum: presetEnum( presets.fontFamilies ),
			description: `Font: ${ presetHelp( presets.fontFamilies ) }.`,
		};
	}
	if ( has.padding && presets.spacing.length ) {
		p.padding = {
			enum: presetEnum( presets.spacing ),
			description: `Space inside it, on every side: ${ presetHelp( presets.spacing, true ) }.`,
		};
	}
	if ( has.margin && presets.spacing.length ) {
		p.marginBlock = {
			enum: presetEnum( presets.spacing ),
			description: 'Space above and below it, from the same sizes.',
		};
	}
	if ( has.radius ) {
		p.borderRadius = {
			type: 'string',
			description:
				'Rounded corners as a CSS length, like "12px", or "default".',
		};
	}
	if ( has.minHeight ) {
		p.minHeight = {
			type: 'string',
			description:
				'Minimum height as a CSS length, like "60vh", or "default".',
		};
	}
	if ( has.align.length ) {
		p.align = {
			enum: [ DEFAULT, ...has.align ],
			description:
				'Alignment: wide and full make it wider than the text.',
		};
	}
	if ( ! Object.keys( p ).length ) {
		return null;
	}
	Object.values( p ).forEach( ( prop ) => {
		if ( prop.enum && ! prop.type ) {
			prop.type = 'string';
		}
	} );
	return { type: 'object', properties: p, additionalProperties: false };
}

const presetVar = ( kind, slug ) => `var:preset|${ kind }|${ slug }`;

function setPath( obj, path, value ) {
	const out = { ...( obj || {} ) };
	const [ key, ...rest ] = path;
	if ( ! rest.length ) {
		if ( value === undefined ) {
			delete out[ key ];
		} else {
			out[ key ] = value;
		}
		return out;
	}
	const next = setPath( out[ key ], rest, value );
	if ( Object.keys( next ).length ) {
		out[ key ] = next;
	} else {
		delete out[ key ];
	}
	return out;
}

/**
 * Turns a design tool's input into the block attributes to set: preset
 * attributes (`textColor`, `fontSize`…) and `style` for the rest, which is how
 * the editor's own controls save them.
 *
 * @param {Object} input      The tool's input.
 * @param {Object} attributes The block's current attributes.
 * @return {Object} Attributes to update.
 */
export function designToAttributes( input, attributes = {} ) {
	const out = {};
	let style = attributes.style;
	const preset = ( attr, value, clearStyle ) => {
		if ( value === undefined ) {
			return;
		}
		out[ attr ] = value === DEFAULT ? undefined : value;
		// A preset replaces a custom value set for the same thing.
		if ( clearStyle ) {
			style = setPath( style, clearStyle, undefined );
		}
	};
	preset( 'textColor', input.textColor, [ 'color', 'text' ] );
	preset( 'backgroundColor', input.backgroundColor, [
		'color',
		'background',
	] );
	preset( 'gradient', input.gradient, [ 'color', 'gradient' ] );
	preset( 'fontSize', input.fontSize, [ 'typography', 'fontSize' ] );
	preset( 'fontFamily', input.fontFamily, [ 'typography', 'fontFamily' ] );
	preset( 'align', input.align );
	if ( input.backgroundColor && input.backgroundColor !== DEFAULT ) {
		out.gradient = undefined;
	}
	const styled = ( path, value, toValue ) => {
		if ( value === undefined ) {
			return;
		}
		style = setPath(
			style,
			path,
			value === DEFAULT || value === '' ? undefined : toValue( value )
		);
	};
	styled( [ 'elements', 'link', 'color', 'text' ], input.linkColor, ( v ) =>
		presetVar( 'color', v )
	);
	styled( [ 'spacing', 'padding' ], input.padding, ( v ) => {
		const s = presetVar( 'spacing', v );
		return { top: s, right: s, bottom: s, left: s };
	} );
	styled( [ 'spacing', 'margin' ], input.marginBlock, ( v ) => {
		const s = presetVar( 'spacing', v );
		return {
			...( attributes.style?.spacing?.margin || {} ),
			top: s,
			bottom: s,
		};
	} );
	styled( [ 'border', 'radius' ], input.borderRadius, ( v ) => v );
	styled( [ 'dimensions', 'minHeight' ], input.minHeight, ( v ) => v );
	const next = style && Object.keys( style ).length ? style : undefined;
	if ( JSON.stringify( next ) !== JSON.stringify( attributes.style ) ) {
		out.style = next;
	}
	return out;
}

/**
 * A tool name for an ability: `lowry/get-block` is `get_block`, anyone
 * else's keeps its namespace, so `core/get-site-info` is
 * `core_get_site_info`.
 *
 * @param {string} abilityName The ability's name.
 * @return {string} The tool's name.
 */
export function toolNameForAbility( abilityName ) {
	const own = abilityName.replace( /^lowry\//, '' );
	return own.replace( /[\/-]+/g, '_' );
}

/**
 * The ability name for one of Lowry's tools: `get_block` is `lowry/get-block`.
 *
 * @param {string} toolName The tool's name.
 * @return {string} The ability's name.
 */
export function abilityNameForTool( toolName ) {
	return `lowry/${ toolName.replace( /_/g, '-' ) }`;
}
