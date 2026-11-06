/**
 * Tools made from block types: schemas and the attributes they set.
 */
import { describe, expect, it } from 'vitest';

import {
	abilityNameForTool,
	attributesSchema,
	designSchema,
	designSupports,
	designToAttributes,
	getPresets,
	toolNameForAbility,
} from '../schema';

const heading = {
	name: 'core/heading',
	attributes: {
		textAlign: { type: 'string' },
		content: { type: 'rich-text', source: 'rich-text', selector: 'h1,h2' },
		level: { type: 'number', default: 2 },
		levelOptions: { type: 'array' },
		placeholder: { type: 'string' },
		// Added by supports.
		className: { type: 'string' },
		style: { type: 'object' },
		textColor: { type: 'string' },
		fontSize: { type: 'string' },
		lock: { type: 'object' },
		metadata: { type: 'object' },
	},
	supports: {
		align: [ 'wide', 'full' ],
		color: { gradients: true, link: true },
		spacing: { margin: true, padding: true },
		typography: { fontSize: true, __experimentalFontFamily: true },
	},
};

const settings = {
	colors: [
		{ slug: 'base', name: 'Base', color: '#fff' },
		{ slug: 'contrast', name: 'Contrast', color: '#111' },
		{ slug: 'accent-1', name: 'Accent 1', color: '#FFEE58' },
	],
	fontSizes: [
		{ slug: 'small', name: 'Small', size: '0.875rem' },
		{ slug: 'large', name: 'Large', size: '1.5rem' },
	],
	__experimentalFeatures: {
		color: {
			gradients: {
				theme: [
					{
						slug: 'g1',
						name: 'G1',
						gradient: 'linear-gradient(red,blue)',
					},
				],
			},
		},
		typography: {
			fontFamilies: {
				theme: [
					{
						slug: 'manrope',
						name: 'Manrope',
						fontFamily: 'Manrope, sans-serif',
					},
				],
			},
		},
		spacing: {
			spacingSizes: {
				default: [ { slug: '20', name: 'Tiny', size: '10px' } ],
				theme: [ { slug: '50', name: 'Medium', size: '2rem' } ],
			},
		},
	},
};

describe( 'getPresets', () => {
	it( 'reads the merged lists and the features, without duplicates', () => {
		const p = getPresets( settings );
		expect( p.colors.map( ( c ) => c.slug ) ).toEqual( [
			'base',
			'contrast',
			'accent-1',
		] );
		expect( p.fontSizes[ 1 ] ).toEqual( {
			slug: 'large',
			name: 'Large',
			value: '1.5rem',
		} );
		expect( p.fontFamilies.map( ( f ) => f.slug ) ).toEqual( [
			'manrope',
		] );
		expect( p.spacing.map( ( s ) => s.slug ) ).toEqual( [ '50', '20' ] );
		expect( p.gradients.map( ( s ) => s.slug ) ).toEqual( [ 'g1' ] );
	} );
	it( 'is empty with no settings', () => {
		expect( getPresets( {} ).colors ).toEqual( [] );
	} );
} );

describe( 'attributesSchema', () => {
	const schema = attributesSchema( heading );
	it( 'has the content attributes, typed, and rich text as a string', () => {
		expect( Object.keys( schema.properties ) ).toEqual( [
			'textAlign',
			'content',
			'level',
			'levelOptions',
			'placeholder',
		] );
		expect( schema.properties.content.type ).toBe( 'string' );
		expect( schema.properties.content.description ).toMatch( /HTML/ );
		// No `default`: agents and browsers fill it in.
		expect( schema.properties.level ).toEqual( {
			type: 'number',
			description: "WordPress' default is 2.",
		} );
		expect( schema.additionalProperties ).toBe( false );
	} );
	it( 'leaves design and bookkeeping to other tools', () => {
		[
			'style',
			'className',
			'textColor',
			'fontSize',
			'lock',
			'metadata',
		].forEach( ( k ) =>
			expect( schema.properties ).not.toHaveProperty( k )
		);
	} );
	it( 'keeps enums, typed', () => {
		const s = attributesSchema( {
			attributes: {
				linkTo: { type: 'string', enum: [ 'none', 'media' ] },
			},
		} );
		expect( s.properties.linkTo ).toEqual( {
			enum: [ 'none', 'media' ],
			type: 'string',
		} );
	} );
} );

describe( 'designSupports', () => {
	it( 'applies WordPress defaults for colour', () => {
		const has = designSupports( heading );
		expect( has ).toMatchObject( {
			text: true,
			background: true,
			gradients: true,
			link: true,
			fontSize: true,
			fontFamily: true,
			padding: true,
			margin: true,
			radius: false,
			align: [ 'wide', 'full' ],
		} );
	} );
	it( 'turns off what a block turns off', () => {
		const has = designSupports( {
			supports: { color: { background: false } },
		} );
		expect( has.text ).toBe( true );
		expect( has.background ).toBe( false );
	} );
	it( 'reads align: true as every alignment', () => {
		expect(
			designSupports( { supports: { align: true } } ).align
		).toHaveLength( 5 );
	} );
} );

describe( 'designSchema', () => {
	const presets = getPresets( settings );
	it( 'offers the theme presets, by slug, with default first', () => {
		const s = designSchema( heading, presets );
		expect( s.properties.textColor.enum ).toEqual( [
			'default',
			'base',
			'contrast',
			'accent-1',
		] );
		expect( s.properties.textColor.type ).toBe( 'string' );
		expect( s.properties.fontSize.enum ).toEqual( [
			'default',
			'small',
			'large',
		] );
		expect( s.properties.padding.enum ).toEqual( [
			'default',
			'50',
			'20',
		] );
		expect( s.properties.align.enum ).toEqual( [
			'default',
			'wide',
			'full',
		] );
		expect( s.properties ).not.toHaveProperty( 'borderRadius' );
	} );
	it( 'is null for a block with nothing to design', () => {
		expect( designSchema( { supports: {} }, presets ) ).toBeNull();
	} );
} );

describe( 'designToAttributes', () => {
	it( 'sets presets as the editor does, and clears custom values they replace', () => {
		const out = designToAttributes(
			{ textColor: 'accent-1', fontSize: 'large' },
			{
				style: {
					color: { text: '#f00' },
					typography: { fontSize: '40px' },
				},
			}
		);
		expect( out.textColor ).toBe( 'accent-1' );
		expect( out.fontSize ).toBe( 'large' );
		expect( out.style ).toBeUndefined();
		expect( 'style' in out ).toBe( true );
	} );
	it( "leaves style alone when a preset doesn't change it", () => {
		expect( designToAttributes( { textColor: 'base' }, {} ) ).toEqual( {
			textColor: 'base',
		} );
		const style = { typography: { textAlign: 'left' } };
		expect(
			designToAttributes( { textColor: 'base' }, { style } )
		).toEqual( {
			textColor: 'base',
		} );
	} );
	it( 'goes back to the theme with default', () => {
		const out = designToAttributes(
			{ backgroundColor: 'default' },
			{ backgroundColor: 'base' }
		);
		expect( 'backgroundColor' in out ).toBe( true );
		expect( out.backgroundColor ).toBeUndefined();
	} );
	it( 'writes spacing, links and radius into style', () => {
		const out = designToAttributes(
			{ padding: '50', linkColor: 'contrast', borderRadius: '12px' },
			{ style: { typography: { fontStyle: 'italic' } } }
		);
		expect( out.style ).toEqual( {
			typography: { fontStyle: 'italic' },
			spacing: {
				padding: {
					top: 'var:preset|spacing|50',
					right: 'var:preset|spacing|50',
					bottom: 'var:preset|spacing|50',
					left: 'var:preset|spacing|50',
				},
			},
			elements: {
				link: { color: { text: 'var:preset|color|contrast' } },
			},
			border: { radius: '12px' },
		} );
	} );
	it( 'keeps left and right margins when setting top and bottom', () => {
		const out = designToAttributes(
			{ marginBlock: '20' },
			{ style: { spacing: { margin: { left: '1px' } } } }
		);
		expect( out.style.spacing.margin ).toEqual( {
			left: '1px',
			top: 'var:preset|spacing|20',
			bottom: 'var:preset|spacing|20',
		} );
	} );
	it( 'changes nothing for an empty input', () => {
		expect( designToAttributes( {}, { style: { a: 1 } } ) ).toEqual( {} );
	} );
} );

describe( 'names', () => {
	it( 'maps between tools and abilities', () => {
		expect( abilityNameForTool( 'get_block_tree' ) ).toBe(
			'lowry/get-block-tree'
		);
		expect( toolNameForAbility( 'lowry/get-block-tree' ) ).toBe(
			'get_block_tree'
		);
		expect( toolNameForAbility( 'core/get-site-info' ) ).toBe(
			'core_get_site_info'
		);
		expect( toolNameForAbility( 'my-plugin/posts/find' ) ).toBe(
			'my_plugin_posts_find'
		);
	} );
} );
