/**
 * Text presets: the only fonts and sizes the writing toolbar offers.
 *
 * Each preset is really a block (and a level or a font size preset), so
 * choosing "Large" in the headline font turns a paragraph into a level 2
 * heading. The fonts and sizes shown are measured from the theme's styles in
 * the editor canvas, so the menus show what the page will actually look like.
 */
import { __ } from '@wordpress/i18n';
import { switchToBlockType } from '@wordpress/blocks';

// What each kind of text block can be, before the theme's paragraph sizes are added.
const BASE = [
	{
		id: 'h1',
		name: __( 'Title', 'hepworth' ),
		block: 'core/heading',
		attrs: { level: 1 },
		sample: '<h1 class="wp-block-heading">x</h1>',
		pick: 'h1',
	},
	{
		id: 'h2',
		name: __( 'Heading', 'hepworth' ),
		block: 'core/heading',
		attrs: { level: 2 },
		sample: '<h2 class="wp-block-heading">x</h2>',
		pick: 'h2',
	},
	{
		id: 'h3',
		name: __( 'Subheading', 'hepworth' ),
		block: 'core/heading',
		attrs: { level: 3 },
		sample: '<h3 class="wp-block-heading">x</h3>',
		pick: 'h3',
	},
	{
		id: 'h4',
		name: __( 'Small heading', 'hepworth' ),
		block: 'core/heading',
		attrs: { level: 4 },
		sample: '<h4 class="wp-block-heading">x</h4>',
		pick: 'h4',
	},
	{
		id: 'pullquote',
		name: __( 'Big quote', 'hepworth' ),
		block: 'core/pullquote',
		attrs: {},
		sample: '<figure class="wp-block-pullquote"><blockquote><p>x</p></blockquote></figure>',
		pick: 'p',
	},
	{
		id: 'quote',
		name: __( 'Quote', 'hepworth' ),
		block: 'core/quote',
		attrs: {},
		sample: '<blockquote class="wp-block-quote"><p>x</p></blockquote>',
		pick: 'p',
	},
	{
		id: 'verse',
		name: __( 'Poem', 'hepworth' ),
		block: 'core/verse',
		attrs: {},
		sample: '<pre class="wp-block-verse">x</pre>',
		pick: 'pre',
	},
	{
		id: 'preformatted',
		name: __( 'Typewriter', 'hepworth' ),
		block: 'core/preformatted',
		attrs: {},
		sample: '<pre class="wp-block-preformatted">x</pre>',
		pick: 'pre',
	},
	{
		id: 'code',
		name: __( 'Code', 'hepworth' ),
		block: 'core/code',
		attrs: {},
		sample: '<pre class="wp-block-code"><code>x</code></pre>',
		pick: 'code',
	},
];

export const PRESET_BLOCKS = [
	'core/paragraph',
	...new Set( BASE.map( ( p ) => p.block ) ),
];

/** The document the blocks are drawn in: the canvas iframe, or the page itself. */
export function canvasDocument() {
	const frame = document.querySelector( 'iframe[name="editor-canvas"]' );
	return ( frame && frame.contentDocument ) || document;
}

const GENERIC = {
	monospace: __( 'Monospace', 'hepworth' ),
	serif: __( 'Serif', 'hepworth' ),
	'sans-serif': __( 'Sans-serif', 'hepworth' ),
	'system-ui': __( 'System', 'hepworth' ),
	'ui-monospace': __( 'Monospace', 'hepworth' ),
};

function firstFamily( css ) {
	const name = ( css || '' ).split( ',' )[ 0 ].replace( /["']/g, '' ).trim();
	return GENERIC[ name ] || name || __( 'Theme font', 'hepworth' );
}

/**
 * Draws a sample of every preset, hidden, inside the canvas and reads back the
 * font each one gets and its size in pixels.
 *
 * @param {Array} fontSizes The theme's font size presets.
 * @return {Array} Presets with `family`, `css` (the font stack) and `px`.
 */
export function measurePresets( fontSizes = [] ) {
	const doc = canvasDocument();
	const root = doc.querySelector( '.editor-styles-wrapper' ) || doc.body;
	if ( ! root ) {
		return [];
	}
	const paragraphs = [
		{
			id: 'p',
			name: __( 'Normal', 'hepworth' ),
			block: 'core/paragraph',
			attrs: { fontSize: undefined },
			sample: '<p>x</p>',
			pick: 'p',
		},
		...fontSizes.map( ( size ) => ( {
			id: 'p-' + size.slug,
			name: size.name || size.slug,
			block: 'core/paragraph',
			attrs: { fontSize: size.slug },
			sample: `<p class="has-${ size.slug }-font-size">x</p>`,
			pick: 'p',
		} ) ),
	];
	const all = [ ...BASE.slice( 0, 4 ), ...paragraphs, ...BASE.slice( 4 ) ];

	const box = doc.createElement( 'div' );
	box.className = 'is-layout-flow';
	box.setAttribute( 'aria-hidden', 'true' );
	Object.assign( box.style, {
		position: 'absolute',
		left: '-10000px',
		top: '0',
		width: '600px',
		visibility: 'hidden',
		pointerEvents: 'none',
	} );
	box.innerHTML = all
		.map( ( p ) => `<div data-hw="${ p.id }">${ p.sample }</div>` )
		.join( '' );
	root.appendChild( box );
	const view = doc.defaultView || window;
	const out = all.map( ( p ) => {
		const el = box.querySelector( `[data-hw="${ p.id }"] ${ p.pick }` );
		const cs = el ? view.getComputedStyle( el ) : null;
		return {
			...p,
			css: cs ? cs.fontFamily : '',
			family: firstFamily( cs && cs.fontFamily ),
			px: cs ? Math.round( parseFloat( cs.fontSize ) ) : 16,
		};
	} );
	box.remove();

	// A paragraph size that looks just like Normal adds nothing, and the rest go biggest first.
	const normal = out.find( ( p ) => p.id === 'p' );
	// (It's still kept, hidden, so a paragraph that uses it shows its name.)
	const kept = out.map( ( p ) =>
		p.block === 'core/paragraph' &&
		p.id !== 'p' &&
		normal &&
		p.px === normal.px &&
		p.family === normal.family
			? { ...p, hidden: true }
			: p
	);
	const paras = kept
		.filter( ( p ) => p.block === 'core/paragraph' )
		.sort( ( a, b ) => b.px - a.px );
	const first = kept.findIndex( ( p ) => p.block === 'core/paragraph' );
	const others = kept.filter( ( p ) => p.block !== 'core/paragraph' );
	others.splice( first, 0, ...paras );
	return others;
}

/**
 * The fonts in use, in the order they first appear (headings first).
 * @param presets
 */
export function fontsOf( presets ) {
	const seen = new Map();
	for ( const p of presets.filter( ( q ) => ! q.hidden ) ) {
		if ( ! seen.has( p.family ) ) {
			seen.set( p.family, { family: p.family, css: p.css } );
		}
	}
	return [ ...seen.values() ];
}

/**
 * The preset a block is in now, and any size of its own.
 *
 * @param {Object} block   Block (name and attributes).
 * @param {Array}  presets Measured presets.
 * @return {{preset: Object|undefined, custom: number|null}} Current look.
 */
export function lookOf( block, presets ) {
	const a = block.attributes || {};
	const preset = presets.find( ( p ) => {
		if ( p.block !== block.name ) {
			return false;
		}
		if ( p.block === 'core/heading' ) {
			return p.attrs.level === a.level;
		}
		if ( p.block === 'core/paragraph' ) {
			return ( p.attrs.fontSize || null ) === ( a.fontSize || null );
		}
		return true;
	} );
	const own = a.style && a.style.typography && a.style.typography.fontSize;
	const custom = own ? Math.round( parseFloat( own ) ) || null : null;
	return { preset, custom };
}

function withoutOwnSize( style ) {
	if ( ! style || ! style.typography || ! style.typography.fontSize ) {
		return style;
	}
	const { fontSize, ...typography } = style.typography;
	const next = { ...style, typography };
	if ( ! Object.keys( typography ).length ) {
		delete next.typography;
	}
	return Object.keys( next ).length ? next : undefined;
}

/**
 * The blocks that replace `block` to give it `preset`'s look, keeping the
 * words. Uses the blocks' own transformations, going by way of a paragraph
 * when there's no direct one.
 *
 * @param {Object}      block  Block to change.
 * @param {Object}      preset Preset to give it.
 * @param {number|null} keepPx A size of the person's own to keep.
 * @return {Array|null} New blocks, or null if it can't be done.
 */
export function blocksForPreset( block, preset, keepPx = null ) {
	let blocks = [ block ];
	if ( block.name !== preset.block ) {
		blocks = switchToBlockType( block, preset.block );
		if ( ! blocks && block.name !== 'core/paragraph' ) {
			const paragraphs = switchToBlockType( block, 'core/paragraph' );
			blocks =
				paragraphs && switchToBlockType( paragraphs, preset.block );
		}
		if ( ! blocks || ! blocks.length ) {
			return null;
		}
		// A transform can leave empty blocks behind (a quote's empty citation, say).
		const words = ( b ) =>
			String( ( b.attributes && b.attributes.content ) || '' )
				.replace( /<[^>]*>/g, '' )
				.trim() ||
			( b.innerBlocks && b.innerBlocks.length );
		if ( blocks.some( words ) ) {
			blocks = blocks.filter( words );
		}
	}
	return blocks.map( ( b ) => {
		const attrs = { ...b.attributes, ...preset.attrs };
		if ( preset.block === 'core/paragraph' && ! preset.attrs.fontSize ) {
			delete attrs.fontSize;
		}
		attrs.style = withoutOwnSize( attrs.style );
		if ( keepPx ) {
			attrs.style = {
				...( attrs.style || {} ),
				typography: {
					...( ( attrs.style || {} ).typography || {} ),
					fontSize: keepPx + 'px',
				},
			};
			delete attrs.fontSize;
		}
		return { ...b, attributes: attrs };
	} );
}

/**
 * Attributes for a size of the person's own.
 * @param block
 * @param px
 */
export function ownSizeAttributes( block, px ) {
	const style = block.attributes.style || {};
	return {
		fontSize: undefined,
		style: {
			...style,
			typography: { ...( style.typography || {} ), fontSize: px + 'px' },
		},
	};
}

/**
 * The next preset up or down in the same font.
 *
 * @param {Array}  presets Presets.
 * @param {Object} look    Current look (lookOf).
 * @param {number} dir     1 bigger, -1 smaller.
 * @return {Object|undefined} Preset.
 */
export function stepPreset( presets, look, dir ) {
	if ( ! look.preset ) {
		return undefined;
	}
	const px = look.custom || look.preset.px;
	const kind = look.preset.block;
	// Like Word's A▲ and A▼, but only through the theme's sizes: stay the same kind of
	// block while there's a size left (heading levels, paragraph sizes), then the nearest other.
	const near = ( p ) =>
		p.block === kind
			? 0
			: ( kind === 'core/heading' || kind === 'core/paragraph' ) &&
				  ( p.block === 'core/heading' || p.block === 'core/paragraph' )
				? 1
				: 2;
	const options = presets.filter(
		( p ) =>
			! p.hidden &&
			p.family === look.preset.family &&
			( dir > 0 ? p.px > px : p.px < px )
	);
	if ( ! options.length ) {
		return undefined;
	}
	const best = Math.min( ...options.map( near ) );
	return options
		.filter( ( p ) => near( p ) === best )
		.sort( ( a, b ) => ( dir > 0 ? a.px - b.px : b.px - a.px ) )[ 0 ];
}

/**
 * The preset in another font closest to the current size, preferring the same
 * kind of block.
 *
 * @param {Array}  presets Presets.
 * @param {Object} look    Current look.
 * @param {string} family  Font.
 * @return {Object|undefined} Preset.
 */
export function presetInFont( presets, look, family ) {
	const px = look.custom || ( look.preset ? look.preset.px : 16 );
	const options = presets.filter(
		( p ) => ! p.hidden && p.family === family
	);
	if ( ! options.length ) {
		return undefined;
	}
	return options.reduce( ( best, p ) => {
		const score = ( q ) =>
			Math.abs( q.px - px ) +
			( look.preset && q.block === look.preset.block ? 0 : 3 );
		return score( p ) < score( best ) ? p : best;
	} );
}
