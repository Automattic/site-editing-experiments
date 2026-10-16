/**
 * Section settings kept in class names (content alignment, image overlay)
 * read back what was written and leave other classes alone.
 */
import { describe, expect, it } from 'vitest';

import { getClassValue, withClassValue } from '../src/editor/settings';

describe( 'class values', () => {
	it( 'adds, reads, replaces and removes a value', () => {
		let className = withClassValue(
			'is-style-sse-dark-1',
			'sse-valign-',
			'middle'
		);
		expect( className ).toBe( 'is-style-sse-dark-1 sse-valign-middle' );
		expect( getClassValue( className, 'sse-valign-' ) ).toBe( 'middle' );

		className = withClassValue( className, 'sse-valign-', 'bottom' );
		expect( className ).toBe( 'is-style-sse-dark-1 sse-valign-bottom' );

		className = withClassValue( className, 'sse-valign-', undefined );
		expect( className ).toBe( 'is-style-sse-dark-1' );
		expect( getClassValue( className, 'sse-valign-' ) ).toBeUndefined();
	} );

	it( 'keeps prefixes apart, and empties to undefined', () => {
		const className = 'sse-overlay-40 sse-valign-middle';
		expect( getClassValue( className, 'sse-overlay-' ) ).toBe( '40' );
		expect( withClassValue( 'sse-overlay-40', 'sse-overlay-', 0 ) ).toBe(
			'sse-overlay-0'
		);
		expect(
			withClassValue( 'sse-overlay-40', 'sse-overlay-', '' )
		).toBeUndefined();
	} );
} );
