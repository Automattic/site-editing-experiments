/**
 * Dividers are stored as classes. Reading them back gives the same divider,
 * and every class the editor can write has CSS from the plugin.
 */
import { execFileSync } from 'child_process';
import path from 'path';
import { beforeAll, describe, expect, it } from 'vitest';

function loadPhp() {
	const php = `
		define('ABSPATH', 1);
		function __($s){return $s;}
		function add_action(){}
		function add_filter(){}
		require ${ JSON.stringify( path.resolve( 'inc/section-themes.php' ) ) };
		echo json_encode([
			'shapes' => array_keys(sse_divider_shapes()),
			'widths' => sse_divider_widths(),
			'offsets' => sse_divider_offsets(),
			'css' => sse_divider_css(),
		]);
	`;
	return JSON.parse( execFileSync( 'php', [ '-r', php ] ).toString() );
}

const php = loadPhp();
let getDivider, withDivider;

beforeAll( async () => {
	window.sseEditorSettings = {
		dividers: php.shapes.map( ( slug ) => ( { slug, label: slug } ) ),
	};
	( { getDivider, withDivider } = await import( '../src/editor/settings' ) );
} );

describe( 'dividers', () => {
	it( 'reads back what it writes', () => {
		const divider = {
			shape: 'wave',
			size: 'l',
			flip: true,
			width: 50,
			offset: -20,
			stroke: 2,
			strokeColor: 'accent',
		};
		const className = withDivider( 'is-style-sse-dark-1', divider );
		expect( className ).toBe(
			'is-style-sse-dark-1 sse-divider-wave sse-divider-l sse-divider-flip sse-divider-w-50 sse-divider-x-m20 sse-divider-stroke-2 sse-divider-sc-accent'
		);
		expect( getDivider( className ) ).toEqual( divider );
	} );

	it( 'leaves defaults out, and removes the divider entirely', () => {
		const plain = {
			shape: 'curve',
			size: 'm',
			flip: false,
			width: 100,
			offset: 0,
			stroke: 0,
			strokeColor: null,
		};
		expect( withDivider( '', plain ) ).toBe( 'sse-divider-curve' );
		expect( getDivider( 'sse-divider-curve' ) ).toEqual( plain );
		expect(
			withDivider( 'keep sse-divider-curve sse-divider-w-50', {
				shape: null,
			} )
		).toBe( 'keep' );
	} );

	it( 'has CSS for every class the editor can write', () => {
		const classes = new Set();
		for ( const shape of php.shapes ) {
			for ( const width of php.widths ) {
				for ( const offset of php.offsets ) {
					for ( const stroke of [ 0, 1, 2 ] ) {
						for ( const flip of [ false, true ] ) {
							withDivider( '', {
								shape,
								size: 's',
								flip,
								width,
								offset,
								stroke,
								strokeColor: stroke ? 'darkest' : null,
							} )
								.split( ' ' )
								.forEach( ( c ) => classes.add( c ) );
						}
					}
				}
			}
		}
		const missing = [ ...classes ].filter(
			( c ) =>
				! php.css.includes( `.${ c }{` ) &&
				! php.css.includes( `.${ c }.` )
		);
		expect( missing ).toEqual( [] );
		expect( classes.has( 'sse-divider-sc-darkest' ) ).toBe( true );
	} );
} );
