import { describe, expect, it } from 'vitest';

import { contrast, readableOn } from '../src/editor/settings';

describe( 'contrast', () => {
	it( 'matches the WCAG formula', () => {
		expect( contrast( '#000000', '#ffffff' ) ).toBeCloseTo( 21, 0 );
		expect( contrast( '#777777', '#ffffff' ) ).toBeCloseTo( 4.48, 1 );
	} );

	it( 'returns null for colours it cannot read', () => {
		expect( contrast( 'rgb(0,0,0)', '#fff' ) ).toBeNull();
	} );
} );

describe( 'readableOn', () => {
	it( 'keeps a readable preferred colour', () => {
		expect( readableOn( '#ffffff', '#1a1a1a' ) ).toBe( '#1a1a1a' );
	} );

	it( 'falls back to black or white', () => {
		// Mid blue: neither navy nor white reaches 4.5:1, black does.
		expect( readableOn( '#2D7DD2', '#ffffff' ) ).toBe( '#000000' );
		expect( readableOn( '#26214A', '#3A3A3A' ) ).toBe( '#ffffff' );
		expect( readableOn( '#FFF0B8', '#F5F5F5' ) ).toBe( '#000000' );
	} );
} );
