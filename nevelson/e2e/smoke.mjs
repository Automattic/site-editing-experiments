/* eslint-disable no-console */
/**
 * End-to-end smoke test: drives the real editor in a headless browser through
 * Nevelson's floating panel: where it goes, following the block, changing a
 * setting, docking it in the sidebar and floating it again, dragging and
 * closing it, multiple blocks, and the site editor.
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

// Where the panel's top should be: level with the block's, unless that would
// take it out of the canvas.
const expectedTop = ( p, b ) =>
	page.evaluate(
		( [ panelBox, block ] ) => {
			const c = document
				.querySelector( '.interface-interface-skeleton__content' )
				.getBoundingClientRect();
			const h = panelBox.bottom - panelBox.top;
			return Math.min(
				Math.max( block.top, c.top + 12 ),
				Math.max( c.top + 12, c.bottom - 12 - h )
			);
		},
		[ p, b ]
	);

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

await step(
	'selecting a paragraph floats its settings to its right',
	async () => {
		await canvas.locator( `#block-${ para.id }` ).click();
		await wait( 400 );
		const p = await panel();
		const b = await blockBox( para.id );
		expect( p, 'no panel' );
		expect( p.side === 'right', `side is ${ p.side }` );
		expect( p.left > b.right, 'panel overlaps the block' );
		expect(
			Math.abs( p.top - ( await expectedTop( p, b ) ) ) < 2,
			'panel is not level with the block'
		);
		expect( p.title === 'Paragraph', `panel shows ${ p.title }` );
		expect( ( await area() ) === null, 'the sidebar opened' );
		await shot( '01-beside' );
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

await step( 'it follows the block as the page scrolls', async () => {
	// The list's settings are short enough to sit level with it.
	const list = all.find( ( b ) => b.name === 'core/list' );
	await select( list.id );
	await wait( 400 );
	const before = await panel();
	const b0 = await blockBox( list.id );
	expect(
		Math.abs( before.top - ( await expectedTop( before, b0 ) ) ) < 2,
		'panel is not level with the list'
	);
	await page.mouse.move( 300, 500 );
	await page.mouse.wheel( 0, 200 );
	await wait( 500 );
	const after = await panel();
	const b1 = await blockBox( list.id );
	expect( b1.top < b0.top - 100, 'the page did not scroll' );
	expect(
		Math.abs( after.top - ( await expectedTop( after, b1 ) ) ) < 2,
		`panel at ${ after.top }, block at ${ b1.top }`
	);
	await shot( '01b-list' );
	await page.mouse.wheel( 0, -200 );
	await wait( 300 );
	await select( para.id );
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

await step( 'a full-width section gets it over the canvas edge', async () => {
	await select( wide.id );
	await wait( 400 );
	const b = await blockBox( wide.id );
	await page.evaluate( ( id ) => {
		document
			.querySelector( 'iframe[name="editor-canvas"]' )
			.contentDocument.getElementById( `block-${ id }` )
			.scrollIntoView( { block: 'center' } );
	}, wide.id );
	await wait( 400 );
	const p = await panel();
	expect( p.side === 'over', `side is ${ p.side }` );
	expect( p.right <= b.right, 'panel is off the canvas' );
	await shot( '03-wide' );
} );

await step(
	'opening the sidebar shows the page, with the block floating',
	async () => {
		await select( para.id );
		await settingsToggle().click();
		await wait( 600 );
		expect(
			( await area() ) === 'edit-post/document',
			`sidebar is ${ await area() }`
		);
		expect( await panel(), 'the panel went away' );
		await shot( '04-page-sidebar' );
	}
);

await step(
	'selecting a block with the sidebar open keeps it on the page',
	async () => {
		await page.evaluate( () =>
			window.wp.data.dispatch( 'core/block-editor' ).clearSelectedBlock()
		);
		await wait( 200 );
		await canvas.locator( `#block-${ paras[ 1 ].id }` ).click();
		await wait( 800 );
		expect(
			( await area() ) === 'edit-post/document',
			`sidebar is ${ await area() }`
		);
		expect( await panel(), 'no panel' );
	}
);

await step( 'Move to the sidebar docks the settings', async () => {
	await page
		.locator( `${ PANEL } button[aria-label="Move to the sidebar"]` )
		.click();
	await wait( 600 );
	expect(
		( await area() ) === 'edit-post/block',
		`sidebar is ${ await area() }`
	);
	expect( ( await panel() ) === null, 'the panel is still there' );
	const inSidebar = await page
		.locator( '.editor-sidebar .block-editor-block-inspector' )
		.count();
	expect( inSidebar === 1, 'no inspector in the sidebar' );
	await page.waitForSelector( '.nevelson-float', { timeout: 3000 } );
	await shot( '05-docked' );
} );

await step( 'Float floats them again', async () => {
	await page.locator( '.nevelson-float' ).click();
	await wait( 500 );
	expect(
		( await area() ) === 'edit-post/document',
		`sidebar is ${ await area() }`
	);
	expect( await panel(), 'no panel' );
} );

await step( 'choosing the Block tab docks them too', async () => {
	await page.getByRole( 'tab', { name: 'Block' } ).click();
	await wait( 500 );
	expect(
		( await area() ) === 'edit-post/block',
		`sidebar is ${ await area() }`
	);
	expect( ( await panel() ) === null, 'the panel is still there' );
} );

await step( 'closing the sidebar floats them', async () => {
	await settingsToggle().click();
	await wait( 500 );
	expect( ( await area() ) === null, `sidebar is ${ await area() }` );
	expect( await panel(), 'no panel' );
} );

await step( 'dragging puts it somewhere else, for every block', async () => {
	const head = page.locator( `${ PANEL } .nevelson-kind` );
	const h = await head.boundingBox();
	await page.mouse.move( h.x + 10, h.y + 5 );
	await page.mouse.down();
	await page.mouse.move( 200, 500, { steps: 8 } );
	await page.mouse.up();
	await wait( 300 );
	const p = await panel();
	expect( p.side === 'put', `side is ${ p.side }` );
	expect( Math.abs( p.left - 190 ) < 30, `left is ${ p.left }` );
	await select( wide.id );
	await wait( 300 );
	const q = await panel();
	expect( q.side === 'put' && Math.abs( q.left - p.left ) < 2, 'it moved' );
	await shot( '06-put' );
	await page.locator( `${ PANEL } .nevelson-follow` ).click();
	await wait( 300 );
	expect( ( await panel() ).side !== 'put', 'Follow block did nothing' );
} );

await step( 'closing it hides it until another block is selected', async () => {
	await select( para.id );
	await wait( 300 );
	await page.locator( `${ PANEL } button[aria-label="Close"]` ).click();
	await wait( 300 );
	expect( ( await panel() ) === null, 'still there' );
	await select( paras[ 1 ].id );
	await wait( 300 );
	expect( await panel(), 'did not come back' );
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

await step( 'it works in the site editor', async () => {
	await page.goto(
		`${ BASE }/wp-admin/site-editor.php?p=%2Fwp_template%2Ftwentytwentyfive%2F%2Findex&canvas=edit`,
		{
			timeout: 120000,
		}
	);
	await page.waitForSelector( 'iframe[name="editor-canvas"]', {
		timeout: 120000,
	} );
	await page.waitForFunction(
		() =>
			window.wp.data
				.select( 'core/block-editor' )
				.getBlocksByName( 'core/query' ).length,
		null,
		{ timeout: 60000 }
	);
	await wait( 1500 );
	await page.evaluate( () => {
		const be = window.wp.data.select( 'core/block-editor' );
		window.wp.data
			.dispatch( 'core/block-editor' )
			.selectBlock( be.getBlocksByName( 'core/query' )[ 0 ] );
	} );
	await wait( 600 );
	const p = await panel();
	expect( p, 'no panel' );
	expect( p.title, 'the panel has no block card' );
	await shot( '07-site-editor' );
} );

await step( 'no errors on the page', async () => {
	expect( ! pageErrors.length, pageErrors.join( ' | ' ) );
} );

await browser.close();
console.log( failures ? `${ failures } failed` : 'All passed' );
process.exit( failures ? 1 : 0 );
