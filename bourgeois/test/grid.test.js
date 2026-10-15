import { describe, expect, it } from 'vitest';

import {
	applyGesture,
	itemStyle,
	normalizeLayout,
	stackForMobile,
} from '../src/shared/grid';
import { findFreeSpot } from '../src/shared/add-block-items';

// A 24-column grid, 10px columns with 0 gap, 10px rows.
const tracks = {
	columns: 24,
	colAt: ( x ) => Math.max( 0, Math.min( 23, Math.round( x / 10 ) ) ),
	colEndAt: ( x ) => Math.max( 0, Math.min( 23, Math.round( x / 10 ) - 1 ) ),
	rowAt: ( y ) => Math.max( 0, Math.round( y / 10 ) ),
	rowEndAt: ( y ) => Math.max( 0, Math.round( y / 10 ) - 1 ),
};

describe( 'normalizeLayout', () => {
	it( 'keeps items inside the grid', () => {
		expect( normalizeLayout( { c: 20, r: 0, w: 10, h: 0 } ) ).toEqual( {
			c: 15,
			r: 1,
			w: 10,
			h: 1,
		} );
	} );
} );

describe( 'applyGesture', () => {
	const start = { c: 3, r: 2, w: 6, h: 4 };
	const box = { left: 20, top: 10, right: 80, bottom: 50 };

	it( 'moves by whole cells', () => {
		expect( applyGesture( start, 'move', tracks, box, 34, 21 ) ).toEqual( {
			c: 6,
			r: 4,
			w: 6,
			h: 4,
		} );
	} );

	it( 'resizes from the right and bottom', () => {
		expect( applyGesture( start, 'se', tracks, box, 20, 10 ) ).toEqual( {
			c: 3,
			r: 2,
			w: 8,
			h: 5,
		} );
	} );

	it( 'resizes from the left, keeping the right edge', () => {
		expect( applyGesture( start, 'w', tracks, box, -20, 0 ) ).toEqual( {
			c: 1,
			r: 2,
			w: 8,
			h: 4,
		} );
	} );

	it( 'never goes below one cell', () => {
		expect( applyGesture( start, 'e', tracks, box, -200, 0 ).w ).toBe( 1 );
	} );
} );

describe( 'itemStyle', () => {
	it( 'writes desktop and mobile placement', () => {
		expect(
			itemStyle( {
				layout: { c: 2, r: 3, w: 4, h: 5 },
				mobileLayout: { c: 1, r: 1, w: 8, h: 2 },
				zIndex: 2,
			} )
		).toEqual( {
			'--sse-c': 2,
			'--sse-w': 4,
			'--sse-r': 3,
			'--sse-h': 5,
			'--sse-o': 302,
			'--sse-z': 2,
			'--sse-mc': 1,
			'--sse-mw': 8,
			'--sse-mr': 1,
			'--sse-mh': 2,
		} );
	} );
} );

describe( 'stackForMobile', () => {
	it( 'stacks in reading order', () => {
		const { layouts, rows } = stackForMobile( [
			{
				clientId: 'b',
				attributes: { layout: { c: 13, r: 1, w: 6, h: 3 } },
			},
			{
				clientId: 'a',
				attributes: { layout: { c: 1, r: 1, w: 6, h: 4 } },
			},
		] );
		expect( layouts.a ).toEqual( { c: 1, r: 1, w: 8, h: 4 } );
		expect( layouts.b ).toEqual( { c: 1, r: 5, w: 8, h: 3 } );
		expect( rows ).toBe( 7 );
	} );
} );

describe( 'findFreeSpot', () => {
	it( 'uses the centre when it is free', () => {
		expect( findFreeSpot( [], 12, 2, 24, 10 ) ).toEqual( {
			c: 7,
			r: 1,
			w: 12,
			h: 2,
		} );
	} );

	it( 'goes below everything when the grid is full', () => {
		expect(
			findFreeSpot( [ { c: 1, r: 1, w: 24, h: 10 } ], 12, 2, 24, 10 )
		).toEqual( { c: 7, r: 11, w: 12, h: 2 } );
	} );
} );
