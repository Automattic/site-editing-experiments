/**
 * Every section colour theme should be readable with every ready-made
 * palette: body text, links and button labels at 4.5:1, headings (large
 * text) at 3:1, as WCAG AA asks.
 */
import { execFileSync } from 'child_process';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { contrast } from '../src/editor/settings';

function loadThemes() {
	const php = `
		define('ABSPATH', 1);
		function __($s){return $s;}
		function add_action(){}
		function add_filter(){}
		require ${ JSON.stringify( path.resolve( 'inc/section-themes.php' ) ) };
		echo json_encode(['themes' => sse_section_themes(), 'palettes' => sse_palette_presets()]);
	`;
	return JSON.parse( execFileSync( 'php', [ '-r', php ] ).toString() );
}

const ROLES = [ 'lightest', 'light', 'accent', 'dark', 'darkest' ];
const { themes, palettes } = loadThemes();

describe.each( palettes.map( ( p ) => [ p.name, p ] ) )(
	'%s palette',
	( name, palette ) => {
		const colour = ( role ) => palette.colors[ ROLES.indexOf( role ) ];
		it.each( themes.map( ( t ) => [ t.label, t ] ) )(
			'%s',
			( label, t ) => {
				const bg = colour( t.background );
				const problems = [];
				const check = ( what, fg, back, min ) => {
					const ratio = contrast( fg, back );
					if ( ratio < min ) {
						problems.push( `${ what } ${ ratio.toFixed( 2 ) }:1` );
					}
				};
				check( 'text', colour( t.text ), bg, 4.5 );
				check( 'headings', colour( t.heading ), bg, 3 );
				check( 'links', colour( t.link ), bg, 4.5 );
				check(
					'button label',
					colour( t.buttonText ),
					colour( t.buttonBg ),
					4.5
				);
				expect( problems ).toEqual( [] );
			}
		);
	}
);
