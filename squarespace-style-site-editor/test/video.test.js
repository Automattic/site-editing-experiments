/**
 * Background video turns a Group section into a Cover and back, keeping
 * what the section controls set, and both results save as valid blocks.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import {
	createBlock,
	parse,
	serialize,
	validateBlock,
} from '@wordpress/blocks';
import { registerCoreBlocks } from '@wordpress/block-library';

import {
	hasVideoBackground,
	withVideo,
	withoutVideo,
} from '../src/editor/video-section';

beforeAll( () => {
	registerCoreBlocks();
} );

const media = { url: 'https://example.com/clay.mp4', id: 42 };

function section() {
	return createBlock(
		'core/group',
		{
			align: 'full',
			anchor: 'studio',
			className: 'is-style-sse-dark-1 sse-divider-wave',
			layout: { type: 'constrained' },
			metadata: { name: 'Intro' },
			style: {
				spacing: { padding: { top: '4rem' } },
				dimensions: { minHeight: '100vh' },
				color: { gradient: 'linear-gradient(red,blue)' },
			},
		},
		[
			createBlock( 'core/heading', { content: 'Hello' } ),
			createBlock( 'core/paragraph', { content: 'World' } ),
		]
	);
}

// Round-trips through markup, as saving and reloading would.
function reload( block ) {
	const [ parsed ] = parse( serialize( [ block ] ) );
	return parsed;
}

function allValid( block ) {
	const [ valid ] = validateBlock( block );
	return valid && block.innerBlocks.every( allValid );
}

describe( 'background video', () => {
	it( 'turns a Group into a Cover with the video', () => {
		const { block } = withVideo( section(), media, {
			overlay: '#222222',
			isDark: true,
		} );
		expect( block.name ).toBe( 'core/cover' );
		expect( hasVideoBackground( block ) ).toBe( true );
		expect( block.attributes ).toMatchObject( {
			url: media.url,
			id: 42,
			backgroundType: 'video',
			align: 'full',
			anchor: 'studio',
			className: 'is-style-sse-dark-1 sse-divider-wave',
			customOverlayColor: '#222222',
			dimRatio: 40,
			isDark: true,
			minHeight: 100,
			minHeightUnit: 'vh',
			metadata: { name: 'Intro' },
		} );
		// Art (a gradient) doesn't carry over: the video replaces it.
		expect( block.attributes.style ).toEqual( {
			spacing: { padding: { top: '4rem' } },
		} );
		expect( block.innerBlocks.map( ( b ) => b.name ) ).toEqual( [
			'core/heading',
			'core/paragraph',
		] );
	} );

	it( 'saves a valid Cover', () => {
		const { block } = withVideo( section(), media, { isDark: true } );
		const reloaded = reload( block );
		expect( allValid( reloaded ) ).toBe( true );
		expect( reloaded.attributes.url ).toBe( media.url );
	} );

	it( 'only swaps the video on a section that is already a Cover', () => {
		const { block } = withVideo( section(), media, {} );
		const next = withVideo(
			block,
			{ url: 'https://example.com/b.mp4', id: 7 },
			{}
		);
		expect( next.block ).toBeUndefined();
		expect( next.attributes ).toEqual( {
			url: 'https://example.com/b.mp4',
			id: 7,
			backgroundType: 'video',
		} );
	} );

	it( 'turns back into a valid Group with the same settings', () => {
		const { block } = withVideo( section(), media, { isDark: true } );
		const group = withoutVideo( reload( block ) );
		expect( group.name ).toBe( 'core/group' );
		expect( group.attributes ).toMatchObject( {
			align: 'full',
			anchor: 'studio',
			className: 'is-style-sse-dark-1 sse-divider-wave',
			layout: { type: 'constrained' },
			style: {
				spacing: { padding: { top: '4rem' } },
				dimensions: { minHeight: '100vh' },
			},
		} );
		expect( hasVideoBackground( group ) ).toBe( false );
		expect( allValid( reload( group ) ) ).toBe( true );
	} );
} );
