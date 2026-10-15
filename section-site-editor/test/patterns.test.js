/**
 * Parses every section pattern and checks each block validates against core's
 * save output, so patterns never open as "This block contains unexpected or
 * invalid content".
 */
import path from 'path';
import { execFileSync } from 'child_process';
import { beforeAll, describe, expect, it } from 'vitest';
import { parse, registerBlockType, validateBlock } from '@wordpress/blocks';
import { registerCoreBlocks } from '@wordpress/block-library';

import fluidSection from '../src/fluid-section/block.json';
import fluidItem from '../src/fluid-item/block.json';
import sectionSave from '../src/fluid-section/save';
import itemSave from '../src/fluid-item/save';

beforeAll( () => {
	registerCoreBlocks();
	registerBlockType( fluidSection.name, {
		...fluidSection,
		edit: () => null,
		save: sectionSave,
	} );
	registerBlockType( fluidItem.name, {
		...fluidItem,
		edit: () => null,
		save: itemSave,
	} );
} );

function loadPatterns() {
	const php = `
		define('ABSPATH', 1);
		function __($s){return $s;}
		$out = [];
		foreach (glob(${ JSON.stringify( path.resolve( 'patterns' ) ) } . '/*.php') as $f) { $out[] = include $f; }
		echo json_encode($out);
	`;
	return JSON.parse( execFileSync( 'php', [ '-r', php ] ).toString() );
}

function invalid( blocks, out = [] ) {
	blocks.forEach( ( b ) => {
		// Strict: matches today's save(), not just a deprecation.
		if ( ! b.isValid || ! validateBlock( b )[ 0 ] ) {
			out.push( b.name );
		}
		invalid( b.innerBlocks, out );
	} );
	return out;
}

describe( 'section patterns', () => {
	const patterns = loadPatterns();
	it( 'exist', () => expect( patterns.length ).toBeGreaterThan( 10 ) );
	it.each( patterns.map( ( p ) => [ p.slug, p ] ) )(
		'%s is valid',
		( slug, p ) => {
			const blocks = parse(
				p.content.replace( /\{\{images\}\}/g, 'https://example.com/' )
			);
			expect( blocks.length ).toBeGreaterThan( 0 );
			expect(
				blocks.every(
					( b ) =>
						b.name !== 'core/freeform' && b.name !== 'core/missing'
				)
			).toBe( true );
			expect( invalid( blocks ) ).toEqual( [] );
		}
	);
} );

describe( 'the validity check', () => {
	it( 'catches markup that does not match save()', () => {
		const blocks = parse(
			'<!-- wp:paragraph -->\n<div>Hi</div>\n<!-- /wp:paragraph -->'
		);
		expect( invalid( blocks ) ).toEqual( [ 'core/paragraph' ] );
	} );
} );
