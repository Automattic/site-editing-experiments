/* eslint-disable no-console */
/**
 * End-to-end smoke test: drives the real editor in a headless browser through
 * Nevelson's floating panel: opening it from the toolbar, where it's pinned,
 * the toolbar in it, changing a setting, the page's settings card, blocks in
 * patterns, closing it, multiple blocks, the sheet on a narrow screen, and
 * the site editor.
 *
 * Needs a WordPress site with the plugin active, Twenty Twenty-Five and
 * automatic login, which WordPress Playground gives you:
 *
 *   npx @wp-playground/cli server --login --port=9400 \
 *     --mount=.:/wordpress/wp-content/plugins/nevelson
 *   npm run test:e2e
 *
 * (Activate the plugin first, or start the server with a blueprint that
 * does.) Set NEVELSON_BASE_URL to use another site, NEVELSON_SHOTS to a folder
 * to keep screenshots, and NEVELSON_CHROME to use a particular Chrome or
 * Chromium. It uses the sample page, and doesn't save it.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = (
	process.env.NEVELSON_BASE_URL || 'http://127.0.0.1:9400'
).replace( /\/$/, '' );
const SHOTS = process.env.NEVELSON_SHOTS;
if ( SHOTS ) {
	mkdirSync( SHOTS, { recursive: true } );
}

const browser = await chromium.launch(
	process.env.NEVELSON_CHROME
		? { executablePath: process.env.NEVELSON_CHROME }
		: {}
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
const shot = ( name ) =>
	SHOTS
		? page.screenshot( { path: `${ SHOTS }/${ name }.jpg`, quality: 85 } )
		: null;
const wait = ( ms ) => page.waitForTimeout( ms );
const PANEL = '.nevelson-panel';
const BUTTON = '.block-editor-block-toolbar .nevelson-toolbar-button';
const pressed = () =>
	page.locator( BUTTON ).first().getAttribute( 'aria-pressed' );

// ---------- Helpers that read the editor's state ----------

const area = () =>
	page.evaluate( () =>
		window.wp.data
			.select( 'core/interface' )
			.getActiveComplementaryArea( 'core' )
	);

// The panel's box and side, or null when it isn't showing.
const panel = () =>
	page.evaluate( ( sel ) => {
		const el = document.querySelector( sel );
		if ( ! el || el.style.visibility === 'hidden' ) {
			return null;
		}
		const r = el.getBoundingClientRect();
		return {
			left: r.left,
			top: r.top,
			right: r.right,
			bottom: r.bottom,
			side: el.dataset.side,
			title: el.querySelector( '.block-editor-block-card__title' )
				?.textContent,
			faded: el.classList.contains( 'is-faded' ),
		};
	}, PANEL );

// A block's box in the editor window.
const blockBox = ( clientId ) =>
	page.evaluate( ( id ) => {
		const iframe = document.querySelector( 'iframe[name="editor-canvas"]' );
		const f = iframe.getBoundingClientRect();
		const r = iframe.contentDocument
			.getElementById( `block-${ id }` )
			.getBoundingClientRect();
		return {
			left: f.left + r.left,
			top: f.top + r.top,
			right: f.left + r.right,
			bottom: f.top + r.bottom,
		};
	}, clientId );

// The block toolbar's box, with all its parts.
const toolbarBox = () =>
	page.evaluate( () => {
		const c = document.querySelector(
			'.block-editor-block-popover:has(.block-editor-block-contextual-toolbar) .components-popover__content'
		);
		if ( ! c ) {
			return null;
		}
		const parts = [ ...c.querySelectorAll( ':scope > *, :scope > * > *' ) ]
			.map( ( e ) => e.getBoundingClientRect() )
			.filter( ( r ) => r.width && r.height );
		return {
			left: Math.min( ...parts.map( ( r ) => r.left ) ),
			top: Math.min( ...parts.map( ( r ) => r.top ) ),
			right: Math.max( ...parts.map( ( r ) => r.right ) ),
			bottom: Math.max( ...parts.map( ( r ) => r.bottom ) ),
		};
	} );

const select = ( clientId ) =>
	page.evaluate(
		( id ) =>
			window.wp.data.dispatch( 'core/block-editor' ).selectBlock( id ),
		clientId
	);

const blocks = () =>
	page.evaluate( () => {
		const be = window.wp.data.select( 'core/block-editor' );
		return be.getBlocks().map( ( b ) => ( {
			id: b.clientId,
			name: b.name,
			align: b.attributes.align,
			fontSize: b.attributes.fontSize,
		} ) );
	} );

const settingsToggle = () =>
	page
		.locator(
			'.editor-header__settings button[aria-label="Settings"], .editor-header__settings button[aria-controls*="edit-post"]'
		)
		.first();

// ---------- The tests ----------

console.log( `Nevelson smoke test against ${ BASE }` );

await page.goto( `${ BASE }/wp-admin/?nevelson-sample`, {
	timeout: 120000,
} );
await page.waitForSelector( 'iframe[name="editor-canvas"]', {
	timeout: 120000,
} );
await canvas.locator( '.is-root-container' ).waitFor( { timeout: 60000 } );
await wait( 1500 );

const all = await blocks();
const para = all.find( ( b ) => b.name === 'core/paragraph' );
const paras = all.filter( ( b ) => b.name === 'core/paragraph' );
const wide = all.find( ( b ) => b.align === 'full' );

await step( 'the editor opens without its sidebar', async () => {
	expect( ( await area() ) === null, `sidebar is ${ await area() }` );
	expect(
		( await panel() ) === null,
		'a panel showed with nothing selected'
	);
} );

await step( 'selecting a block doesn’t open the panel', async () => {
	await canvas.locator( `#block-${ para.id }` ).click();
	await wait( 500 );
	expect( ( await panel() ) === null, 'the panel opened by itself' );
	expect( ( await pressed() ) === 'false', 'the button is pressed' );
} );

// Where the panel should be: the top right of the canvas.
const pinned = () =>
	page.evaluate( () => {
		const c = document
			.querySelector( '.interface-interface-skeleton__content' )
			.getBoundingClientRect();
		return { right: c.right - 12, top: c.top + 12 };
	} );

await step(
	'the toolbar’s settings button opens it, pinned to the top right',
	async () => {
		await page.locator( BUTTON ).first().click();
		await wait( 400 );
		const p = await panel();
		const at = await pinned();
		expect( p, 'no panel' );
		expect( ( await pressed() ) === 'true', 'the button isn’t pressed' );
		expect( Math.abs( p.right - at.right ) < 2, `right is ${ p.right }` );
		expect( Math.abs( p.top - at.top ) < 2, `top is ${ p.top }` );
		expect( p.title === 'Paragraph', `panel shows ${ p.title }` );
		expect( ( await area() ) === null, 'the sidebar opened' );
		await shot( '01-pinned' );
	}
);

await step(
	'it stays open, in the same place, for the next block',
	async () => {
		const before = await panel();
		await canvas.locator( `#block-${ paras[ 1 ].id }` ).click();
		await wait( 400 );
		const after = await panel();
		expect( after, 'it closed' );
		expect(
			after.left === before.left && after.top === before.top,
			'it moved'
		);
		await canvas.locator( `#block-${ para.id }` ).click();
		await wait( 400 );
	}
);

await step( 'it’s as tall as its controls', async () => {
	const tall = await panel();
	const list = all.find( ( b ) => b.name === 'core/list' );
	const item = await page.evaluate(
		( id ) =>
			window.wp.data
				.select( 'core/block-editor' )
				.getBlockOrder( id )[ 0 ],
		list.id
	);
	await select( item );
	await wait( 500 );
	const short = await panel();
	expect(
		short.bottom - short.top < tall.bottom - tall.top - 100,
		`list item ${ short.bottom - short.top }, paragraph ${ tall.bottom - tall.top }`
	);
	await shot( '01b-short' );
	await select( para.id );
	await wait( 400 );
} );

await step(
	'the block toolbar is in a band at the top of the panel',
	async () => {
		const p = await panel();
		const t = await toolbarBox();
		expect( t, 'no toolbar' );
		expect(
			t.left >= p.left && t.left - p.left < 12,
			`toolbar at ${ t.left }, panel at ${ p.left }`
		);
		expect( t.right <= p.right, 'the toolbar sticks out of the panel' );
		expect(
			t.top > p.top && t.top - p.top < 16,
			'the toolbar isn’t at the top'
		);
		const band = await page.evaluate( () =>
			document
				.querySelector( '.nevelson-panel .nevelson-toolbar-row' )
				.getBoundingClientRect()
				.toJSON()
		);
		expect( t.bottom <= band.bottom, 'the toolbar is out of its band' );
		const settings = await page.evaluate( () =>
			document
				.querySelector( '.nevelson-panel .nevelson-body' )
				.getBoundingClientRect()
				.toJSON()
		);
		expect(
			settings.top >= band.bottom - 1,
			'the band covers the settings'
		);
		// It's the real toolbar: its button is the one that opened the panel.
		const inside = await page.evaluate( () => {
			const b = document
				.querySelector( '.nevelson-toolbar-button' )
				.getBoundingClientRect();
			const card = document
				.querySelector( '.nevelson-panel' )
				.getBoundingClientRect();
			return (
				b.left >= card.left &&
				b.right <= card.right &&
				b.top >= card.top
			);
		} );
		expect( inside, 'the settings button isn’t in the panel' );
	}
);

await step( 'a setting in the panel changes the block', async () => {
	await page
		.locator( `${ PANEL } [role="radio"][aria-label="Large"]` )
		.click();
	await wait( 300 );
	const b = ( await blocks() ).find( ( x ) => x.id === para.id );
	expect( b.fontSize === 'large', `font size is ${ b.fontSize }` );
	await page.keyboard.press( 'ControlOrMeta+z' );
} );

await step( 'it stays put as the page scrolls', async () => {
	const before = await panel();
	await page.mouse.move( 300, 500 );
	await page.mouse.wheel( 0, 300 );
	await wait( 500 );
	const after = await panel();
	expect(
		after && after.left === before.left && after.top === before.top,
		'it moved'
	);
	await page.mouse.wheel( 0, -300 );
	await wait( 300 );
} );

await step( 'a colour picker opens over the panel', async () => {
	await page
		.locator(
			`${ PANEL } .block-editor-tools-panel-color-gradient-settings__dropdown`
		)
		.first()
		.click();
	await wait( 400 );
	const onTop = await page.evaluate( () => {
		const pop = document.querySelector(
			'.block-editor-panel-color-gradient-settings__dropdown-content, .components-popover.block-editor-tools-panel-color-gradient-settings__dropdown-content, .components-dropdown__content'
		);
		if ( ! pop ) {
			return 'no popover';
		}
		const r = pop.getBoundingClientRect();
		const hit = document.elementFromPoint(
			r.left + r.width / 2,
			r.top + r.height / 2
		);
		return pop.contains( hit ) ? true : `covered by ${ hit?.className }`;
	} );
	expect( onTop === true, String( onTop ) );
	await shot( '02-colour' );
	await page.keyboard.press( 'Escape' );
	await wait( 200 );
} );

await step( 'a full-width section gets it in the same place', async () => {
	await select( wide.id );
	await wait( 400 );
	const p = await panel();
	const at = await pinned();
	expect( p.side === 'right', `side is ${ p.side }` );
	expect( Math.abs( p.right - at.right ) < 2, 'it moved' );
	await shot( '03-wide' );
} );

await step( 'Settings opens the page in a card below the button', async () => {
	await select( para.id );
	await settingsToggle().click();
	await wait( 600 );
	expect(
		( await area() ) === 'edit-post/document',
		`sidebar is ${ await area() }`
	);
	const r = await page.evaluate( () => {
		const card = document
			.querySelector( '.interface-interface-skeleton__sidebar' )
			.getBoundingClientRect();
		const button = document
			.querySelector(
				'.editor-header__settings [aria-controls^="edit-post"]'
			)
			.getBoundingClientRect();
		const frame = document
			.querySelector( 'iframe[name="editor-canvas"]' )
			.getBoundingClientRect();
		const tab = document.querySelector( '[data-tab-id="edit-post/block"]' );
		return {
			card: card.toJSON(),
			button: button.toJSON(),
			frameWidth: frame.width,
			blockTab: !! tab && tab.offsetParent !== null,
		};
	} );
	expect(
		Math.abs( r.card.right - r.button.right ) < 2,
		'card is not under the button'
	);
	expect(
		r.card.top > r.button.bottom && r.card.top - r.button.bottom < 32,
		'card is not just below the header'
	);
	expect( r.frameWidth === 1440, `the page is ${ r.frameWidth } wide` );
	expect( ! r.blockTab, 'the Block tab shows' );
	const p = await panel();
	expect( p, 'the panel went away' );
	expect(
		p.right <= r.card.left || p.left >= r.card.right,
		'the panel is under the card'
	);
	await shot( '04-page' );
} );

await step( 'selecting a block keeps the card on the page', async () => {
	await select( paras[ 1 ].id );
	await wait( 600 );
	expect(
		( await area() ) === 'edit-post/document',
		`sidebar is ${ await area() }`
	);
	expect( await panel(), 'no panel' );
} );

await step( 'a click on the page closes the card', async () => {
	await canvas
		.locator( `#block-${ paras[ 1 ].id }` )
		.click( { position: { x: 20, y: 10 } } );
	await wait( 500 );
	expect( ( await area() ) === null, `sidebar is ${ await area() }` );
	expect( await panel(), 'no panel' );
} );

// Clicks a block where you'd click it: near its top left.
async function clickOn( locator ) {
	const l = canvas.locator( locator ).first();
	await l.scrollIntoViewIfNeeded();
	await wait( 250 );
	const b = await l.boundingBox();
	await page.mouse.click(
		b.x + Math.min( 30, b.width / 4 ),
		b.y + Math.min( 15, b.height / 2 )
	);
	await wait( 900 );
}
const cards = () =>
	page.evaluate( () =>
		Array.from(
			document.querySelectorAll(
				'.nevelson-panel .block-editor-block-card__title'
			)
		).map( ( e ) => e.textContent )
	);
const selectedName = () =>
	page.evaluate( () => {
		const be = window.wp.data.select( 'core/block-editor' );
		return be.getBlockName( be.getSelectedBlockClientId() );
	} );

await step(
	'a click in a pattern shows that block, not the pattern',
	async () => {
		await clickOn( '.wp-block-cover .wp-block-heading' );
		const c = await cards();
		expect(
			( await selectedName() ) === 'core/heading',
			`selected ${ await selectedName() }`
		);
		expect(
			c.at( -1 )?.startsWith( 'Heading' ),
			`panel shows ${ c.join( ' > ' ) }`
		);
		await shot( '05-in-a-pattern' );
	}
);

await step(
	'a click in another pattern goes straight to that block',
	async () => {
		await clickOn( '.wp-block-columns .wp-block-image img' );
		const c = await cards();
		expect(
			( await selectedName() ) === 'core/image',
			`selected ${ await selectedName() }`
		);
		expect( c.at( -1 ) === 'Image', `panel shows ${ c.join( ' > ' ) }` );
	}
);

await step( 'a click outside the patterns goes to that block', async () => {
	await clickOn( 'li' );
	expect(
		( await selectedName() ) === 'core/list-item',
		`selected ${ await selectedName() }`
	);
	expect( ( await cards() ).at( -1 ) === 'List Item', 'wrong panel' );
} );

await step( 'closed, it stays closed until the button opens it', async () => {
	await canvas.locator( `#block-${ para.id }` ).scrollIntoViewIfNeeded();
	await select( para.id );
	await wait( 300 );
	await page.locator( BUTTON ).first().click();
	await wait( 300 );
	expect( ( await panel() ) === null, 'still there' );
	const t = await toolbarBox();
	const b = await blockBox( para.id );
	expect(
		// Above the block, or below if there's no room above.
		t &&
			( t.bottom <= b.top + 1 || t.top >= b.bottom - 1 ) &&
			Math.abs( t.left - b.left ) < 80,
		`the toolbar isn’t back by the block: ${ JSON.stringify( [ t, b ] ) }`
	);
	await canvas.locator( `#block-${ paras[ 1 ].id }` ).click();
	await wait( 400 );
	expect( ( await panel() ) === null, 'it came back by itself' );
	await page.locator( BUTTON ).first().click();
	await wait( 400 );
	expect( await panel(), 'the button didn’t open it' );
	await page.locator( BUTTON ).first().click();
	await wait( 400 );
	expect( ( await panel() ) === null, 'the button didn’t close it' );
	await page.locator( BUTTON ).first().click();
	await wait( 400 );
} );

await step( 'several blocks share one panel', async () => {
	await page.evaluate(
		( [ a, b ] ) =>
			window.wp.data.dispatch( 'core/block-editor' ).multiSelect( a, b ),
		[ paras[ 0 ].id, paras[ 1 ].id ]
	);
	await wait( 400 );
	const p = await panel();
	expect( p, 'no panel' );
	const multi = await page
		.locator(
			`${ PANEL } .block-editor-multi-selection-inspector__card, ${ PANEL } .block-editor-block-card`
		)
		.count();
	expect( multi > 0, 'no multi-selection card' );
} );

await step( 'on a narrow screen it is a sheet along the bottom', async () => {
	await page.setViewportSize( { width: 600, height: 900 } );
	await wait( 800 );
	const list = all.find( ( b ) => b.name === 'core/list' );
	await select( list.id );
	await wait( 1200 );
	const p = await panel();
	expect( p, 'no panel' );
	expect( p.side === 'sheet', `side is ${ p.side }` );
	const frame = await page.evaluate( () =>
		document
			.querySelector( 'iframe[name="editor-canvas"]' )
			.getBoundingClientRect()
			.toJSON()
	);
	expect( Math.abs( p.left - frame.left ) < 2, 'not at the left edge' );
	expect( Math.abs( p.right - frame.right ) < 2, 'not as wide as the page' );
	const b = await blockBox( list.id );
	expect( b.bottom <= p.top + 2, 'the block is under the sheet' );
	await shot( '07-sheet' );
	await page.setViewportSize( { width: 1440, height: 900 } );
	await wait( 600 );
} );

await step( 'it works in the site editor', async () => {
	await page.goto(
		`${ BASE }/wp-admin/site-editor.php?p=%2Fwp_template%2Ftwentytwentyfive%2F%2Findex&canvas=edit`,
		{ timeout: 120000 }
	);
	await page.waitForSelector( 'iframe[name="editor-canvas"]', {
		timeout: 120000,
	} );
	await page.waitForFunction(
		() =>
			window.wp.data
				.select( 'core/block-editor' )
				.getBlocksByName( 'core/site-title' ).length,
		null,
		{ timeout: 60000 }
	);
	await wait( 1500 );
	await clickOn( '.wp-block-site-title' );
	expect( ( await panel() ) === null, 'the panel opened by itself' );
	await page.locator( BUTTON ).first().click();
	await wait( 500 );
	expect( await panel(), 'no panel' );
	const c = await cards();
	expect( c.at( -1 ) === 'Site Title', `panel shows ${ c.join( ' > ' ) }` );
	await shot( '08-site-editor' );
} );

await step( 'no errors on the page', async () => {
	expect( ! pageErrors.length, pageErrors.join( ' | ' ) );
} );

await browser.close();
console.log( failures ? `${ failures } failed` : 'All passed' );
process.exit( failures ? 1 : 0 );
