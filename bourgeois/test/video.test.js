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
			overlay: 'sse-darkest',
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
			overlayColor: 'sse-darkest',
			dimRatio: 40,
			isDark: true,
			minHeight: 100,
			minHeightUnit: 'vh',
			metadata: { name: 'Intro' },
		} );
		// Art (a gradient) can't show behind a video; it's kept aside.
		expect( block.attributes.style ).toEqual( {
			spacing: { padding: { top: '4rem' } },
		} );
		expect( block.attributes.metadata.sseBeforeVideo ).toEqual( {
			gradient: 'linear-gradient(red,blue)',
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
		// Art comes back, and the stash goes.
		expect( group.attributes.style.color ).toEqual( {
			gradient: 'linear-gradient(red,blue)',
		} );
		expect( group.attributes.metadata ).toEqual( { name: 'Intro' } );
	} );

	it( 'puts back what Cover can not hold, and keeps what it can', () => {
		const original = createBlock(
			'core/group',
			{
				align: 'full',
				backgroundColor: 'sse-light',
				fontSize: 'large',
				lock: { move: true, remove: true },
				style: {
					background: {
						backgroundImage: { url: 'https://example.com/a.jpg' },
					},
					dimensions: { minHeight: 'clamp(20rem, 50vh, 40rem)' },
				},
			},
			[ createBlock( 'core/paragraph', { content: 'Hi' } ) ]
		);
		const { block } = withVideo( original, media, {} );
		expect( block.attributes ).toMatchObject( {
			fontSize: 'large',
			lock: { move: true, remove: true },
			// No colour theme: the background colour becomes the overlay.
			overlayColor: 'sse-light',
		} );
		expect( block.attributes.minHeight ).toBeUndefined();
		expect( allValid( reload( block ) ) ).toBe( true );

		const group = withoutVideo( reload( block ) );
		expect( group.attributes ).toMatchObject( {
			backgroundColor: 'sse-light',
			fontSize: 'large',
			lock: { move: true, remove: true },
			style: {
				background: {
					backgroundImage: { url: 'https://example.com/a.jpg' },
				},
				dimensions: { minHeight: 'clamp(20rem, 50vh, 40rem)' },
			},
		} );
		expect( group.attributes.metadata ).toBeUndefined();
		expect( allValid( reload( group ) ) ).toBe( true );
	} );
} );
