/* eslint-disable no-console */
/**
 * End-to-end smoke test: drives the real editor in a headless browser
 * through Ito's main flows and checks the blocks and the published page.
 *
 * Needs a WordPress site with the plugin active, Twenty Twenty-Five and
 * automatic login, which WordPress Playground gives you:
 *
 *   npx @wp-playground/cli server --login --port=9400 \
 *     --mount=.:/wordpress/wp-content/plugins/ito
 *   npm run test:e2e
 *
 * (Activate the plugin first, or start the server with a blueprint that
 * does.) Set ITO_BASE_URL to use another site, ITO_SHOTS to a folder to keep
 * screenshots, and ITO_CHROME to use a particular Chrome or Chromium. It adds
 * a page and deletes it at the end (ITO_KEEP keeps it).
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = ( process.env.ITO_BASE_URL || 'http://127.0.0.1:9400' ).replace(
	/\/$/,
	''
);
const SHOTS = process.env.ITO_SHOTS;
if ( SHOTS ) {
	mkdirSync( SHOTS, { recursive: true } );
}

const browser = await chromium.launch(
	process.env.ITO_CHROME ? { executablePath: process.env.ITO_CHROME } : {}
);
const page = await browser.newPage( {
	viewport: { width: 1440, height: 900 },
} );
const canvas = page.frameLocator( 'iframe[name="editor-canvas"]' );
const pageErrors = [];
page.on( 'pageerror', ( e ) => pageErrors.push( e.message ) );

let failures = 0;
async function step( name, fn ) {
	try {
		await fn();
		console.log( `  ✓ ${ name }` );
	} catch ( error ) {
		failures++;
		console.log(
			`  ✗ ${ name }\n    ${ error.message.split( '\n' )[ 0 ] }`
		);
		if ( SHOTS ) {
			await page
				.screenshot( {
					path: `${ SHOTS }/fail-${ name.replace( /\W+/g, '-' ) }.png`,
				} )
				.catch( () => {} );
		}
	}
}
function expect( condition, message ) {
	if ( ! condition ) {
		throw new Error( message );
	}
}
const PATTERNS = '.ito-lprow.is-patterns .ito-lpi';
const ARRANGED = '.ito-lprow.is-layouts .ito-lpi';
const shot = ( name ) =>
	SHOTS ? page.screenshot( { path: `${ SHOTS }/${ name }.png` } ) : null;
const wait = ( ms ) => page.waitForTimeout( ms );

// ---------- Helpers that read the editor's state ----------

// Each section: its pattern, top block, and the content Ito carries across.
const sections = () =>
	page.evaluate( () => {
		const be = window.wp.data.select( 'core/block-editor' );
		const root = be.getBlocksByName( 'core/post-content' )[ 0 ] || '';
		const flat = ( b ) => [ b, ...b.innerBlocks.flatMap( flat ) ];
		const text = ( v ) => ( v === undefined ? undefined : String( v ) );
		return be.getBlockOrder( root ).map( ( id ) => {
			const block = be.getBlock( id );
			const all = flat( block );
			const first = ( name ) =>
				all.find( ( b ) => b.name === name )?.attributes;
			const picture = all
				.map( ( b ) => b.attributes.url || b.attributes.mediaUrl )
				.find( Boolean );
			return {
				id,
				name: block.name,
				pattern: block.attributes.metadata?.patternName,
				valid: all.every( ( b ) => b.isValid !== false ),
				heading: text( first( 'core/heading' )?.content ),
				level: first( 'core/heading' )?.level,
				paragraph: text( first( 'core/paragraph' )?.content ),
				button: text( first( 'core/button' )?.text ),
				picture,
			};
		} );
	} );

// A section's content blocks, whole, and its pictures, wherever they are,
// and whether it saves as valid markup.
const contentAt = ( index ) =>
	page.evaluate( ( at ) => {
		const be = window.wp.data.select( 'core/block-editor' );
		const root = be.getBlocksByName( 'core/post-content' )[ 0 ] || '';
		const block = be.getBlock( be.getBlockOrder( root )[ at ] );
		const layout = [
			'core/group',
			'core/columns',
			'core/column',
			'core/buttons',
			'core/spacer',
			'core/separator',
			'core/cover',
			'core/media-text',
		];
		const strip = ( b ) => [
			b.name,
			b.attributes,
			b.innerBlocks.map( strip ),
		];
		// Attributes in a fixed order, as making a block can reorder
		// them, and rich text as its HTML.
		const sorted = ( v ) => {
			if ( ! v || typeof v !== 'object' || Array.isArray( v ) ) {
				return v;
			}
			if ( v.constructor !== Object ) {
				return String( v );
			}
			return Object.fromEntries(
				Object.keys( v )
					.sort()
					.map( ( k ) => [ k, sorted( v[ k ] ) ] )
			);
		};
		const items = [];
		const walk = ( b ) => {
			const a = b.attributes;
			if ( a.url || a.mediaUrl ) {
				items.push( [ a.url || a.mediaUrl, a.alt ?? a.mediaAlt ] );
			}
			if ( layout.includes( b.name ) ) {
				b.innerBlocks.forEach( walk );
			} else if ( b.name !== 'core/image' ) {
				items.push( strip( b ) );
			}
		};
		walk( block );
		const valid = ( b ) => b.isValid && b.innerBlocks.every( valid );
		return {
			items: items
				.map( ( i ) => JSON.stringify( i, ( k, v ) => sorted( v ) ) )
				.sort(),
			// Saved and read back, it's still valid markup.
			valid: window.wp.blocks
				.parse( window.wp.blocks.serialize( block ) )
				.every( valid ),
		};
	}, index );

// Sets the first heading, paragraph and button in a section.
const setContent = ( id, content ) =>
	page.evaluate(
		( [ c, values ] ) => {
			const be = window.wp.data.select( 'core/block-editor' );
			const { updateBlockAttributes } =
				window.wp.data.dispatch( 'core/block-editor' );
			const flat = ( b ) => [ b, ...b.innerBlocks.flatMap( flat ) ];
			const all = flat( be.getBlock( c ) );
			const set = ( name, attrs ) => {
				const b = all.find( ( x ) => x.name === name );
				if ( b ) {
					updateBlockAttributes( b.clientId, attrs );
				}
			};
			set( 'core/heading', { content: values.heading } );
			set( 'core/paragraph', { content: values.paragraph } );
			set( 'core/button', { text: values.button } );
		},
		[ id, content ]
	);

async function openEditor( path ) {
	await page.goto( BASE + path, { waitUntil: 'load', timeout: 180000 } );
	await page.waitForSelector( 'iframe[name="editor-canvas"]', {
		timeout: 120000,
	} );
	await page.evaluate( () => {
		const prefs = window.wp.data.dispatch( 'core/preferences' );
		[ 'welcomeGuide', 'welcomeGuidePage', 'welcomeGuideTemplate' ].forEach(
			( key ) => {
				prefs.set( 'core/edit-post', key, false );
				prefs.set( 'core/edit-site', key, false );
				prefs.set( 'core', key, false );
			}
		);
		prefs.set( 'core', 'enableChoosePatternModal', false );
	} );
	await canvas
		.locator( '.ito-layer' )
		.waitFor( { state: 'attached', timeout: 60000 } );
	// The patterns load after the editor does.
	await page.waitForFunction(
		() =>
			window.wp.data
				.select( 'core/block-editor' )
				.__experimentalGetAllowedPatterns().length > 0,
		null,
		{ timeout: 60000 }
	);
	await wait( 800 );
}

// Hovers a section so its overlay shows.
async function hover( id ) {
	const el = canvas.locator( `#block-${ id }` );
	await el.evaluate( ( e ) =>
		e.scrollIntoView( {
			block:
				e.offsetHeight > e.ownerDocument.defaultView.innerHeight
					? 'start'
					: 'center',
		} )
	);
	await wait( 250 );
	let box = await el.boundingBox();
	if ( box.y < 100 ) {
		await el.evaluate( ( e ) =>
			e.ownerDocument.defaultView.scrollBy( 0, -160 )
		);
		await wait( 250 );
		box = await el.boundingBox();
	}
	// Near the left edge: in the middle, the pointer can land on the editor's
	// line for inserting between blocks, which sits over the canvas.
	await page.mouse.move(
		box.x + 24,
		box.y + Math.min( 120, box.height / 2 )
	);
	await wait( 250 );
}
// Opens Edit layout on a section by its place on the page: swapping a
// section replaces its block, so its ID changes.
async function openPanel( index ) {
	await hover( ( await sections() )[ index ].id );
	await canvas.locator( '.ito-ob' ).click();
	await page.locator( '.ito-lp' ).waitFor();
	await wait( 1500 ); // the previews render
}

// ---------- The test ----------
console.log( 'Ito smoke test against ' + BASE );

await openEditor( '/wp-admin/?ito-sample' );
const sampleContent = await page.evaluate( () =>
	window.wp.data.select( 'core/editor' ).getEditedPostContent()
);
const created = await page.evaluate(
	( content ) =>
		window.wp.apiFetch( {
			path: '/wp/v2/pages',
			method: 'POST',
			data: { title: 'Ito smoke test', status: 'draft', content },
		} ),
	sampleContent
);
await openEditor( `/wp-admin/post.php?post=${ created.id }&action=edit` );

const mine = {
	heading: 'Northfield Ceramics',
	paragraph: 'Hand-thrown pots from a <em>small</em> studio.',
	button: 'Visit the shop',
};
let hero;

await step(
	'the sample page loads as valid blocks, each section a pattern',
	async () => {
		const list = await sections();
		expect(
			list.length === 4,
			`expected 4 sections, got ${ list.length }`
		);
		expect(
			list.every( ( s ) => s.valid ),
			'a section has invalid blocks'
		);
		expect(
			list.every( ( s ) => s.pattern ),
			'a section has no pattern name'
		);
		hero = list[ 0 ];
	}
);

await step(
	'hovering a section shows its name and how many other layouts it has',
	async () => {
		for ( const s of await sections() ) {
			await hover( s.id );
			const tab = await canvas.locator( '.ito-tab' ).textContent();
			const button = canvas.locator( '.ito-ob' );
			expect( tab.length > 0, 'no name tab' );
			expect(
				await button.isEnabled(),
				`no other layouts for ${ s.pattern }`
			);
			expect(
				/\d+ others?/.test( await button.textContent() ),
				'no count on Edit layout'
			);
		}
		await hover( hero.id );
		await shot( '01-hover' );
	}
);

await step(
	'Edit layout previews every matching pattern with the section’s own content',
	async () => {
		await setContent( hero.id, mine );
		await openPanel( 0 );
		const labels = await page.locator( '.ito-lpl' ).allTextContents();
		expect(
			labels[ 0 ] === 'As it was',
			`first option is “${ labels[ 0 ] }”`
		);
		expect(
			labels.length >= 3,
			`only ${ labels.length - 1 } other layouts`
		);
		const previewText = await page.evaluate( () =>
			[ ...document.querySelectorAll( '.ito-lp iframe' ) ].map(
				( f ) => f.contentDocument?.body?.innerText || ''
			)
		);
		expect(
			previewText.length === labels.length,
			`${ previewText.length } previews for ${ labels.length } options`
		);
		expect(
			previewText.every( ( t ) =>
				t.toLowerCase().includes( 'northfield ceramics' )
			),
			'a preview doesn’t show the section’s heading'
		);
		await shot( '02-panel' );
	}
);

// Picks a layout in the open panel and checks the panel closed.
async function pick( option ) {
	await option.click();
	await wait( 400 );
	expect(
		( await page.locator( '.ito-lp' ).count() ) === 0,
		'picking a layout didn’t close the panel'
	);
}
const undo = async () => {
	await page.evaluate( () =>
		window.wp.data.dispatch( 'core/editor' ).undo()
	);
	await wait( 300 );
};

await step(
	'picking a pattern swaps it, closes the panel and keeps the words, links and picture',
	async () => {
		const before = ( await sections() )[ 0 ];
		const count = await page.locator( PATTERNS ).count();
		await page.keyboard.press( 'Escape' );
		const seen = new Set( [ before.pattern ] );
		for ( let i = 1; i < count; i++ ) {
			await openPanel( 0 );
			await pick( page.locator( PATTERNS ).nth( i ) );
			const now = ( await sections() )[ 0 ];
			expect(
				! seen.has( now.pattern ),
				`option ${ i } didn’t change the pattern (${ now.pattern })`
			);
			seen.add( now.pattern );
			expect( now.valid, `${ now.pattern } has invalid blocks` );
			expect(
				now.heading === mine.heading,
				`${ now.pattern }: heading is “${ now.heading }”`
			);
			expect(
				now.level === before.level,
				`${ now.pattern }: heading level ${ now.level }, was ${ before.level }`
			);
			expect(
				now.paragraph === mine.paragraph,
				`${ now.pattern }: paragraph is “${ now.paragraph }”`
			);
			expect(
				now.button === mine.button,
				`${ now.pattern }: button is “${ now.button }”`
			);
			expect(
				now.picture === before.picture,
				`${ now.pattern }: picture is ${ now.picture }`
			);
			await shot( `03-swapped-${ i }` );
			await undo();
		}
	}
);

await step(
	'picking a generated layout keeps every content block as it was',
	async () => {
		const before = await contentAt( 0 );
		await openPanel( 0 );
		const count = await page.locator( ARRANGED ).count();
		expect( count >= 3, `only ${ count } generated layouts for the hero` );
		await page.keyboard.press( 'Escape' );
		for ( let i = 0; i < count; i++ ) {
			await openPanel( 0 );
			const option = page.locator( ARRANGED ).nth( i );
			const label = await option.textContent();
			await pick( option );
			const now = await contentAt( 0 );
			expect( now.valid, `${ label }: invalid blocks` );
			expect(
				JSON.stringify( now.items ) === JSON.stringify( before.items ),
				`${ label }: the content changed`
			);
			await shot( `04-arranged-${ i }` );
			await undo();
		}
	}
);

await step(
	'As it was closes the panel and leaves the section alone',
	async () => {
		const before = ( await sections() )[ 0 ];
		await openPanel( 0 );
		expect(
			( await page
				.locator( PATTERNS )
				.first()
				.getAttribute( 'aria-pressed' ) ) === 'true',
			'As it was isn’t marked as the current layout'
		);
		await pick( page.locator( PATTERNS ).first() );
		const now = ( await sections() )[ 0 ];
		expect(
			now.id === before.id && now.pattern === hero.pattern,
			`section is ${ now.name } ${ now.pattern }`
		);
	}
);

await step(
	'Done, Escape and a click on the page close the panel',
	async () => {
		await openPanel( 0 );
		await page.locator( '.ito-lpbtn', { hasText: 'Done' } ).click();
		expect(
			( await page.locator( '.ito-lp' ).count() ) === 0,
			'Done didn’t close it'
		);
		await openPanel( 0 );
		await page.keyboard.press( 'Escape' );
		await wait( 200 );
		expect(
			( await page.locator( '.ito-lp' ).count() ) === 0,
			'Escape didn’t close it'
		);
		await openPanel( 0 );
		const selected = await page.evaluate( () =>
			window.wp.data
				.select( 'core/block-editor' )
				.getSelectedBlockClientId()
		);
		await canvas
			.locator( `#block-${ ( await sections() )[ 1 ].id }` )
			.click( { position: { x: 20, y: 20 } } );
		await wait( 200 );
		expect(
			( await page.locator( '.ito-lp' ).count() ) === 0,
			'a click on the page didn’t close it'
		);
		const after = await page.evaluate( () =>
			window.wp.data
				.select( 'core/block-editor' )
				.getSelectedBlockClientId()
		);
		expect( after === selected, 'the click also selected a block' );
	}
);

await step( 'one undo takes back a swap', async () => {
	await openPanel( 0 );
	await pick( page.locator( '.ito-lpi' ).nth( 1 ) );
	await page.evaluate( () =>
		window.wp.data.dispatch( 'core/editor' ).undo()
	);
	await wait( 300 );
	expect(
		( await sections() )[ 0 ].pattern === hero.pattern,
		'undo didn’t bring the old pattern back'
	);
} );

let swappedTo;
await step( 'a swapped section saves and shows on the site', async () => {
	await openPanel( 0 );
	await pick( page.locator( '.ito-lpi' ).nth( 1 ) );
	swappedTo = ( await sections() )[ 0 ].pattern;
	// A save while the editor is autosaving does nothing.
	await page.waitForFunction(
		() => ! window.wp.data.select( 'core/editor' ).isSavingPost()
	);
	await page.evaluate( async () => {
		window.wp.data
			.dispatch( 'core/editor' )
			.editPost( { status: 'publish' } );
		await window.wp.data.dispatch( 'core/editor' ).savePost();
	} );
	await page.waitForFunction(
		() => ! window.wp.data.select( 'core/editor' ).isSavingPost()
	);
	const link = await page.evaluate( () =>
		window.wp.data.select( 'core/editor' ).getPermalink()
	);
	const site = await browser.newPage();
	await site.goto( link, { waitUntil: 'load' } );
	const body = await site.locator( 'main' ).innerText();
	expect(
		body.includes( 'Northfield Ceramics' ),
		'heading missing on the site'
	);
	expect( body.includes( 'Visit the shop' ), 'button missing on the site' );
	await site.close();
} );

await step( 'it reopens as valid blocks, as the new pattern', async () => {
	await openEditor( `/wp-admin/post.php?post=${ created.id }&action=edit` );
	const list = await sections();
	expect(
		list.every( ( s ) => s.valid ),
		'invalid blocks after reloading'
	);
	expect(
		list[ 0 ].pattern === swappedTo,
		`first section is ${ list[ 0 ].pattern }, saved as ${ swappedTo }`
	);
	expect(
		list[ 0 ].heading === mine.heading,
		'heading lost after reloading'
	);
} );

await step(
	'a section of alike cards goes to one fewer or one more column, keeping its content',
	async () => {
		// Twenty Twenty-Five's three services, at the end of the page.
		const index = await page.evaluate( () => {
			const be = window.wp.data.select( 'core/block-editor' );
			const pattern = be
				.__experimentalGetAllowedPatterns()
				.find( ( p ) => p.name === 'twentytwentyfive/services-3-col' );
			const root = be.getBlocksByName( 'core/post-content' )[ 0 ] || '';
			window.wp.data.dispatch( 'core/block-editor' ).insertBlocks(
				pattern.blocks.map( ( b ) => window.wp.blocks.cloneBlock( b ) ),
				undefined,
				root
			);
			return be.getBlockOrder( root ).length - 1;
		} );
		// The number of columns in each row of the section.
		const rows = () =>
			page.evaluate( ( at ) => {
				const be = window.wp.data.select( 'core/block-editor' );
				const root =
					be.getBlocksByName( 'core/post-content' )[ 0 ] || '';
				const out = [];
				const walk = ( b ) =>
					b.name === 'core/columns'
						? out.push( b.innerBlocks.length )
						: b.innerBlocks.forEach( walk );
				walk( be.getBlock( be.getBlockOrder( root )[ at ] ) );
				return out;
			}, index );
		expect(
			( await rows() ).join() === '3',
			`the services are in rows of ${ await rows() }`
		);
		const before = await contentAt( index );
		for ( const [ label, want ] of [
			[ '2 columns', '2,2' ],
			[ '4 columns', '4' ],
		] ) {
			await openPanel( index );
			await pick( page.locator( ARRANGED, { hasText: label } ) );
			const now = await contentAt( index );
			expect( now.valid, `${ label }: invalid blocks` );
			expect(
				JSON.stringify( now.items ) === JSON.stringify( before.items ),
				`${ label }: the content changed`
			);
			expect(
				( await rows() ).join() === want,
				`${ label }: rows of ${ await rows() }`
			);
			await shot( `05-${ label.replace( ' ', '-' ) }` );
			await undo();
		}
	}
);

await step( 'no errors on the page', async () => {
	expect( pageErrors.length === 0, pageErrors.join( ' | ' ) );
} );

if ( ! process.env.ITO_KEEP ) {
	await page.evaluate(
		( id ) =>
			window.wp.apiFetch( {
				path: `/wp/v2/pages/${ id }?force=true`,
				method: 'DELETE',
			} ),
		created.id
	);
}
await browser.close();
console.log( failures ? `\n${ failures } failed` : '\nAll passed' );
process.exit( failures ? 1 : 0 );
