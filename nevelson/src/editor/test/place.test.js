/**
 * Where the floating panel goes.
 */
import { describe, expect, it } from 'vitest';

import {
	placeRight,
	placeSheet,
	isSheet,
	overlaps,
	union,
	MARGIN,
} from '../place';

const canvas = { left: 0, top: 60, right: 1160, bottom: 900 };
const box = ( left, top, right, bottom ) => ( { left, top, right, bottom } );

describe( 'placeRight', () => {
	it( 'pins it to the top right of the canvas', () => {
		const p = placeRight( { canvas, panel: { width: 320 } } );
		expect( p.left ).toBe( 1160 - MARGIN - 320 );
		expect( p.top ).toBe( 60 + MARGIN );
		expect( p.side ).toBe( 'right' );
	} );

	it( 'is never taller than the canvas', () => {
		const p = placeRight( { canvas, panel: { width: 320 } } );
		expect( p.maxHeight ).toBe( 900 - 60 - MARGIN * 2 );
	} );

	it( 'moves with the canvas, not with anything in it', () => {
		const narrower = { ...canvas, right: 800 };
		const p = placeRight( { canvas: narrower, panel: { width: 320 } } );
		expect( p.left ).toBe( 800 - MARGIN - 320 );
	} );
} );

describe( 'sheets', () => {
	it( 'are for narrow canvases', () => {
		expect( isSheet( canvas ) ).toBe( false );
		expect( isSheet( { ...canvas, right: 600 } ) ).toBe( true );
	} );

	it( 'sit along the bottom, as wide as the canvas', () => {
		const narrow = { left: 0, top: 100, right: 400, bottom: 900 };
		const p = placeSheet( { canvas: narrow, panel: { height: 300 } } );
		expect( p ).toMatchObject( {
			left: 0,
			width: 400,
			top: 600,
			side: 'sheet',
		} );
	} );

	it( 'cover at most half the canvas', () => {
		const narrow = { left: 0, top: 100, right: 400, bottom: 900 };
		const p = placeSheet( { canvas: narrow, panel: { height: 2000 } } );
		expect( p.maxHeight ).toBe( 400 );
		expect( p.top ).toBe( 500 );
	} );
} );

describe( 'overlaps and union', () => {
	it( 'knows when boxes overlap', () => {
		expect( overlaps( box( 0, 0, 10, 10 ), box( 5, 5, 20, 20 ) ) ).toBe(
			true
		);
		expect( overlaps( box( 0, 0, 10, 10 ), box( 10, 0, 20, 10 ) ) ).toBe(
			false
		);
	} );

	it( 'makes one box around several', () => {
		expect(
			union( [ box( 10, 10, 20, 20 ), box( 0, 30, 15, 40 ) ] )
		).toEqual( box( 0, 10, 20, 40 ) );
		expect( union( [] ) ).toBe( null );
	} );
} );
