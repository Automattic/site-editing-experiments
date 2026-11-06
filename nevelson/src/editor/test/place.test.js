/**
 * Where the floating panel goes.
 */
import { describe, expect, it } from 'vitest';

import {
	place,
	placeAt,
	placeSheet,
	isSheet,
	overlaps,
	union,
	GAP,
	MARGIN,
} from '../place';

const canvas = { left: 0, top: 60, right: 1160, bottom: 900 };
const panel = { width: 300, height: 400 };
const box = ( left, top, right, bottom ) => ( { left, top, right, bottom } );

describe( 'place', () => {
	it( 'goes to the right of a narrow block, level with its top', () => {
		const p = place( { block: box( 260, 200, 800, 260 ), canvas, panel } );
		expect( p.side ).toBe( 'right' );
		expect( p.left ).toBe( 800 + GAP );
		expect( p.top ).toBe( 200 );
	} );

	it( 'goes to the left when there is no room on the right', () => {
		const p = place( { block: box( 400, 200, 1000, 260 ), canvas, panel } );
		expect( p.side ).toBe( 'left' );
		expect( p.left ).toBe( 400 - GAP - 300 );
	} );

	it( 'goes over the right edge of the canvas for a wide block', () => {
		const p = place( { block: box( 0, 200, 1160, 700 ), canvas, panel } );
		expect( p.side ).toBe( 'over' );
		expect( p.left ).toBe( 1160 - MARGIN - 300 );
	} );

	it( 'stays in view when the block is scrolled above the canvas', () => {
		const p = place( { block: box( 260, -800, 900, 120 ), canvas, panel } );
		expect( p.top ).toBe( 60 + MARGIN );
	} );

	it( 'stays in view when the block is low down', () => {
		const p = place( { block: box( 260, 850, 900, 1400 ), canvas, panel } );
		expect( p.top ).toBe( 900 - MARGIN - 400 );
	} );

	it( 'is never taller than the canvas', () => {
		const p = place( {
			block: box( 260, 500, 900, 560 ),
			canvas,
			panel: { width: 300, height: 2000 },
		} );
		expect( p.maxHeight ).toBe( 900 - 60 - MARGIN * 2 );
		expect( p.top ).toBe( 60 + MARGIN );
	} );
} );

describe( 'placeAt', () => {
	it( 'puts a dragged panel where it was put, relative to the canvas', () => {
		const p = placeAt( { offset: { x: 40, y: 100 }, canvas, panel } );
		expect( p ).toMatchObject( { left: 40, top: 160, side: 'put' } );
	} );

	it( 'keeps it inside the canvas', () => {
		const p = placeAt( { offset: { x: 5000, y: -50 }, canvas, panel } );
		expect( p.left ).toBe( 1160 - MARGIN - 300 );
		expect( p.top ).toBe( 60 + MARGIN );
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
