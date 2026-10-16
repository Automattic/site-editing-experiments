/* eslint-disable no-console */
/**
 * End-to-end smoke test: drives the real editor in a headless browser
 * through Degas' main flows and checks the blocks and the published page.
 *
 * Needs a WordPress site with the plugin active and automatic login, which
 * WordPress Playground gives you:
 *
 *   npx @wp-playground/cli server --login --port=9400 \
 *     --mount=.:/wordpress/wp-content/plugins/degas
 *   npm run test:e2e
 *
 * Set DEGAS_BASE_URL to use another site, DEGAS_SHOTS to a folder to keep
 * screenshots, and DEGAS_CHROME to use a particular Chrome or Chromium. It adds a page and deletes it at the end (DEGAS_KEEP keeps it).
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = ( process.env.DEGAS_BASE_URL || 'http://127.0.0.1:9400' ).replace( /\/$/, '' );
const SHOTS = process.env.DEGAS_SHOTS;
if ( SHOTS ) {
	mkdirSync( SHOTS, { recursive: true } );
}

const browser = await chromium.launch( process.env.DEGAS_CHROME ? { executablePath: process.env.DEGAS_CHROME } : {} );
const page = await browser.newPage( { viewport: { width: 1440, height: 900 } } );
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
		console.log( `  ✗ ${ name }\n    ${ error.message.split( '\n' )[ 0 ] }` );
		if ( SHOTS ) {
			await page.screenshot( { path: `${ SHOTS }/fail-${ name.replace( /\W+/g, '-' ) }.png` } ).catch( () => {} );
		}
	}
}
function expect( condition, message ) {
	if ( ! condition ) {
		throw new Error( message );
	}
}
const shot = ( name ) => ( SHOTS ? page.screenshot( { path: `${ SHOTS }/${ name }.png` } ) : null );
const wait = ( ms ) => page.waitForTimeout( ms );

// ---------- Helpers that read the editor's state ----------
const sectionIds = () =>
	page.evaluate( () => {
		const be = window.wp.data.select( 'core/block-editor' );
		const root = be.getBlocksByName( 'core/post-content' )[ 0 ] || '';
		return be.getBlockOrder( root );
	} );
const kinds = () =>
	page.evaluate( () => {
		const be = window.wp.data.select( 'core/block-editor' );
		const root = be.getBlocksByName( 'core/post-content' )[ 0 ] || '';
		return be.getBlockOrder( root ).map( ( id ) =>
			( be.getBlockAttributes( id ).className || '' )
				.split( ' ' )
				.find( ( c ) => /^degas-/.test( c ) && ! /^degas-(section|layout-|palette-)/.test( c ) )
		);
	} );
const sectionOf = async ( kind ) => ( await sectionIds() )[ ( await kinds() ).indexOf( 'degas-' + kind ) ];
const attrs = ( id ) => page.evaluate( ( c ) => window.wp.data.select( 'core/block-editor' ).getBlockAttributes( c ), id );
const firstInside = ( id, name ) =>
	page.evaluate(
		( [ c, n ] ) => {
			const be = window.wp.data.select( 'core/block-editor' );
			let found = null;
			const walk = ( b ) => {
				if ( ! found && b.name === n ) {
					found = b.clientId;
				}
				b.innerBlocks.forEach( walk );
			};
			be.getBlock( c ).innerBlocks.forEach( walk );
			return found;
		},
		[ id, name ]
	);

async function openEditor( path ) {
	await page.goto( BASE + path, { waitUntil: 'load', timeout: 180000 } );
	await page.waitForSelector( 'iframe[name="editor-canvas"]', { timeout: 120000 } );
	await page.evaluate( () => {
		const prefs = window.wp.data.dispatch( 'core/preferences' );
		[ 'welcomeGuide', 'welcomeGuidePage', 'welcomeGuideTemplate' ].forEach( ( key ) => {
			prefs.set( 'core/edit-post', key, false );
			prefs.set( 'core/edit-site', key, false );
			prefs.set( 'core', key, false );
		} );
		prefs.set( 'core', 'enableChoosePatternModal', false );
	} );
	await canvas.locator( '.dg-layer' ).waitFor( { state: 'attached', timeout: 60000 } );
	await wait( 800 );
}

// Hovers a section so its overlay shows.
async function hover( id ) {
	const el = canvas.locator( `#block-${ id }` );
	await el.evaluate( ( e ) => e.scrollIntoView( { block: e.offsetHeight > innerHeight ? 'start' : 'center' } ) );
	await wait( 250 );
	let box = await el.boundingBox();
	if ( box.y < 100 ) {
		await el.evaluate( ( e ) => e.ownerDocument.defaultView.scrollBy( 0, -160 ) );
		await wait( 250 );
		box = await el.boundingBox();
	}
	await page.mouse.move( box.x + box.width / 2, box.y + Math.min( 120, box.height / 2 ) );
	await wait( 250 );
}
const openMode = async ( id, label ) => {
	await hover( id );
	await canvas.locator( '.dg-ob', { hasText: label } ).click();
	await wait( 500 );
};

// ---------- The test ----------
console.log( 'Degas smoke test against ' + BASE );

await page.goto( BASE + '/wp-admin/post-new.php?post_type=page', { waitUntil: 'load', timeout: 180000 } );
await page.waitForFunction( () => !! ( window.degasSettings && window.wp?.apiFetch ), null, { timeout: 120000 } );
const content = await page.evaluate( () => window.degasSettings.sections.map( ( s ) => s.content ).join( '\n\n' ) );
const created = await page.evaluate(
	( c ) => window.wp.apiFetch( { path: '/wp/v2/pages', method: 'POST', data: { title: 'Degas smoke test', status: 'publish', content: c } } ),
	content
);
console.log( `  (page ${ created.id })` );

await openEditor( `/wp-admin/post.php?post=${ created.id }&action=edit` );

await step( 'every section type loads as valid blocks', async () => {
	const report = await page.evaluate( () => {
		const bad = [];
		const walk = ( bs ) => bs.forEach( ( b ) => ( b.isValid ? null : bad.push( b.name ), walk( b.innerBlocks ) ) );
		const blocks = window.wp.data.select( 'core/block-editor' ).getBlocks();
		walk( blocks );
		return { n: blocks.length, bad };
	} );
	expect( report.n === 12, `expected 12 sections, got ${ report.n }` );
	expect( ! report.bad.length, 'invalid: ' + report.bad.join( ', ' ) );
} );

await step( 'outside a mode the page is locked', async () => {
	const hero = await sectionOf( 'hero' );
	const h1 = await firstInside( hero, 'core/heading' );
	const mode = await page.evaluate( ( c ) => window.wp.data.select( 'core/block-editor' ).getBlockEditingMode( c ), h1 );
	expect( mode === 'disabled', 'heading mode is ' + mode );
} );

await step( 'hovering a section shows its name, the modes and the section toolbar', async () => {
	await hover( await sectionOf( 'hero' ) );
	expect( ( await canvas.locator( '.dg-tab' ).innerText() ) === 'Hero', 'tab' );
	expect( ( await canvas.locator( '.dg-ob' ).count() ) === 3, 'three modes' );
	expect( ( await canvas.locator( '.dg-sbtn' ).count() ) === 4, 'four section buttons' );
	await shot( '01-hover' );
} );

await step( 'Edit layout switches layouts and palettes with live previews', async () => {
	const hero = await sectionOf( 'hero' );
	await openMode( hero, 'Edit layout' );
	const labels = await canvas.locator( '.dg-lp .dg-lo' ).evaluateAll( ( b ) => b.map( ( x ) => x.getAttribute( 'aria-label' ) ) );
	expect( labels.join() === 'Split,Centered,Image left,Cover', labels.join() );
	expect( ( await canvas.locator( '.dg-lp .dg-mini .degas-hero' ).count() ) === 4, 'four previews' );
	await canvas.locator( '.dg-lp .dg-lo[aria-label="Cover"]' ).click();
	await canvas.locator( '.dg-lp .dg-pal', { hasText: 'Night' } ).click();
	await wait( 300 );
	const cls = ( await attrs( hero ) ).className;
	expect( /degas-layout-cover/.test( cls ) && /degas-palette-night/.test( cls ), cls );
	await shot( '02-layout' );
	await canvas.locator( '.dg-lp .dg-lpbtn', { hasText: 'Reset' } ).click();
	await wait( 300 );
	const back = ( await attrs( hero ) ).className;
	expect( /degas-layout-split/.test( back ) && ! /palette/.test( back ), 'Reset: ' + back );
	await canvas.locator( '.dg-lp .dg-done' ).click();
} );

await step( 'Edit content edits text in place; bins remove items and Restore brings them back', async () => {
	const features = await sectionOf( 'features' );
	await openMode( features, 'Edit content' );
	const heading = canvas.locator( `#block-${ features } h2` ).first();
	await heading.click();
	await page.keyboard.press( 'End' );
	await page.keyboard.type( ' today' );
	expect( ( await heading.innerText() ) === 'What we make today', await heading.innerText() );
	const cards = () => canvas.locator( `#block-${ features } .degas-card` ).count();
	expect( ( await cards() ) === 3, 'three cards' );
	await canvas.locator( '.dg-bin' ).nth( 2 ).click();
	await wait( 300 );
	expect( ( await cards() ) === 2, 'removed' );
	await canvas.locator( '.dg-tb .dg-tbb', { hasText: 'Restore' } ).click();
	await wait( 300 );
	expect( ( await cards() ) === 3, 'restored' );
	await shot( '03-content' );
	await canvas.locator( '.dg-tb .dg-done' ).click();
} );

await step( 'Add puts a card in the section, and Four columns appears', async () => {
	const features = await sectionOf( 'features' );
	await hover( features );
	await canvas.locator( '.dg-addtrig' ).click();
	await canvas.locator( '.dg-addmenu button', { hasText: 'Card' } ).click();
	await wait( 400 );
	expect( ( await canvas.locator( `#block-${ features } .degas-card` ).count() ) === 4, 'four cards' );
	await openMode( features, 'Edit layout' );
	expect( ( await canvas.locator( '.dg-lp .dg-lo.is-new[aria-label="Four columns"]' ).count() ) === 1, 'Four columns offered' );
	await canvas.locator( '.dg-lp .dg-done' ).click();
} );

await step( 'Freeform moves and resizes items, saved on the block', async () => {
	const cta = await sectionOf( 'cta' );
	await openMode( cta, 'Freeform' );
	const h2 = canvas.locator( `#block-${ cta } h2` ).first();
	const hb = await h2.boundingBox();
	await page.mouse.move( hb.x + 30, hb.y + 15 );
	await page.mouse.down();
	await page.mouse.move( hb.x + 90, hb.y, { steps: 6 } );
	await page.mouse.move( hb.x + 150, hb.y - 20, { steps: 6 } );
	await page.mouse.up();
	await wait( 300 );
	const free = ( await attrs( await firstInside( cta, 'core/heading' ) ) ).degasFree;
	expect( free && free.x > 0 && free.y < 0, JSON.stringify( free ) );
	const buttons = canvas.locator( `#block-${ cta } .wp-block-buttons` ).first();
	const bb = await buttons.boundingBox();
	await page.mouse.click( bb.x + bb.width / 2, bb.y + bb.height / 2 );
	const handle = await canvas.locator( '.dg-handle[data-h="e"]' ).boundingBox();
	await page.mouse.move( handle.x + 6, handle.y + 6 );
	await page.mouse.down();
	await page.mouse.move( handle.x + 126, handle.y + 6, { steps: 8 } );
	await page.mouse.up();
	await wait( 300 );
	const w = ( await attrs( await firstInside( cta, 'core/buttons' ) ) ).degasFree;
	expect( w && w.w > 0, JSON.stringify( w ) );
	await shot( '04-freeform' );
	await canvas.locator( '.dg-tb .dg-done' ).click();
} );

await step( 'sections move, duplicate, delete with undo, and get added from the picker', async () => {
	const features = await sectionOf( 'features' );
	await hover( features );
	await canvas.locator( '.dg-sbtn[aria-label="Move section up"]' ).click();
	await wait( 300 );
	expect( ( await kinds() )[ 0 ] === 'degas-features', 'moved up' );
	await hover( features );
	await canvas.locator( '.dg-sbtn[aria-label="Duplicate section"]' ).click();
	await wait( 300 );
	expect( ( await sectionIds() ).length === 13, 'duplicated' );
	await hover( features );
	await canvas.locator( '.dg-sbtn[aria-label="Delete section"]' ).click();
	await wait( 300 );
	expect( ( await sectionIds() ).length === 12, 'deleted' );
	await page.locator( '.components-snackbar', { hasText: 'deleted' } ).locator( 'button', { hasText: 'Undo' } ).click();
	await wait( 300 );
	expect( ( await sectionIds() ).length === 13, 'undone' );
	await hover( ( await sectionIds() )[ 0 ] );
	await canvas.locator( '.dg-ins.is-bottom .dg-insbtn' ).click();
	await canvas.locator( '.dg-picker .dg-lo', { hasText: 'Quote' } ).click();
	await wait( 500 );
	expect( ( await kinds() )[ 1 ] === 'degas-quote', ( await kinds() ).slice( 0, 3 ).join() );
} );

await step( 'the published page shows layouts and freeform positions', async () => {
	await page.evaluate( () => window.wp.data.dispatch( 'core/editor' ).savePost() );
	await page.waitForFunction( () => ! window.wp.data.select( 'core/editor' ).isSavingPost() && ! window.wp.data.select( 'core/editor' ).isEditedPostDirty(), null, { timeout: 60000 } );
	await page.goto( created.link, { waitUntil: 'load' } );
	const info = await page.evaluate( () => {
		const h = document.querySelector( '.degas-cta h2' );
		return {
			cls: h.className,
			translate: getComputedStyle( h ).translate,
			cards: document.querySelector( '.degas-features' ).querySelectorAll( '.degas-card' ).length,
		};
	} );
	expect( /has-degas-offset/.test( info.cls ) && info.translate !== 'none', JSON.stringify( info ) );
	expect( info.cards === 4, 'cards on the site: ' + info.cards );
	await shot( '05-site' );
} );

await step( 'no script errors', async () => {
	expect( ! pageErrors.length, pageErrors.join( ' | ' ) );
} );

if ( ! process.env.DEGAS_KEEP ) {
	await page.goto( BASE + '/wp-admin/', { waitUntil: 'load' } );
	await page.evaluate( ( id ) => window.wp.apiFetch( { path: `/wp/v2/pages/${ id }?force=true`, method: 'DELETE' } ), created.id ).catch( () => {} );
}
await browser.close();
console.log( failures ? `\n${ failures } failed` : '\nAll passed' );
process.exit( failures ? 1 : 0 );
