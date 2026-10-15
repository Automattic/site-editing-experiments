/* eslint-disable no-console */
/* global getComputedStyle */
/**
 * End-to-end smoke test: drives the real site editor in a headless browser
 * through the plugin's main flows and checks the results.
 *
 * Needs a WordPress site with the plugin active, a block theme with a header
 * part and a page template (it passes with Twenty Twenty-Five and Twenty
 * Twenty-Four), and automatic login, which WordPress Playground gives you:
 *
 *   npx `@wp-playground/cli` server --login --port=9400 \
 *     --mount=.:/wordpress/wp-content/plugins/squarespace-style-site-editor
 *   npm run test:e2e
 *
 * Set SSE_BASE_URL to use another site, and SSE_SHOTS to a folder to keep
 * screenshots. It resets the theme's header, and adds a page and a short
 * video that it deletes at the end (set SSE_KEEP to keep them).
 */
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const BASE = ( process.env.SSE_BASE_URL || 'http://127.0.0.1:9400' ).replace(
	/\/$/,
	''
);
const SHOTS = process.env.SSE_SHOTS;
if ( SHOTS ) {
	mkdirSync( SHOTS, { recursive: true } );
}

const browser = await chromium.launch();
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
	SHOTS ? page.screenshot( { path: `${ SHOTS }/${ name }.png` } ) : null;

async function openEditor( path ) {
	await page.goto( BASE + path, { waitUntil: 'load', timeout: 120000 } );
	await page.waitForSelector( 'iframe[name="editor-canvas"]', {
		timeout: 120000,
	} );
	await page.evaluate( () => {
		const prefs = window.wp.data.dispatch( 'core/preferences' );
		[ 'welcomeGuide', 'welcomeGuidePage', 'welcomeGuideTemplate' ].forEach(
			( key ) => {
				prefs.set( 'core/edit-site', key, false );
				prefs.set( 'core', key, false );
			}
		);
		prefs.set( 'core', 'enableChoosePatternModal', false );
	} );
	await page.waitForTimeout( 3000 );
	const close = page
		.locator( '.components-modal__header button[aria-label="Close"]' )
		.first();
	if ( await close.isVisible().catch( () => false ) ) {
		await close.click();
	}
}
const select = ( fn, ...args ) => page.evaluate( fn, ...args );
const topLevel = () =>
	select( () => {
		const be = window.wp.data.select( 'core/block-editor' );
		return be.getBlockOrder().map( ( id ) => {
			const b = be.getBlock( id );
			return {
				name: b.name,
				label: b.attributes.metadata?.name,
				className: b.attributes.className || '',
			};
		} );
	} );
async function pick( group, index = 0 ) {
	await page
		.locator( '.sse-picker__nav-item', { hasText: group } )
		.first()
		.click();
	await page.locator( '.sse-picker__card' ).nth( index ).click();
	await page.waitForTimeout( 500 );
}
async function hoverSection( n ) {
	const section = canvas
		.locator( '.sse-section:not(.sse-section--shared)' )
		.nth( n );
	await section.evaluate( ( e ) => e.scrollIntoView( { block: 'start' } ) );
	await page.waitForTimeout( 200 );
	await section.hover( { position: { x: 300, y: 120 } } );
	return canvas.locator( '.sse-section-anchor:not(.is-part)' ).nth( n );
}
async function save() {
	await page.locator( '.sse-save-exit__save' ).click();
	await page.waitForTimeout( 1000 );
	const confirm = page
		.locator(
			'.entities-saved-states__panel button.is-primary, .editor-entities-saved-states__save-button'
		)
		.first();
	if ( await confirm.isVisible().catch( () => false ) ) {
		await confirm.click();
	}
	await page.waitForFunction(
		() =>
			window.wp.data
				.select( 'core' )
				.__experimentalGetDirtyEntityRecords().length === 0,
		null,
		{ timeout: 30000 }
	);
}

console.log( `Testing ${ BASE }` );

await page.goto( `${ BASE }/wp-admin/`, { waitUntil: 'load' } );
// Works with any block theme that has a header part and a page template.
const theme = await select( async () => {
	const [ active ] = await window.wp.apiFetch( {
		path: '/wp/v2/themes?status=active',
	} );
	return active.stylesheet;
} );
console.log( `Theme: ${ theme }` );
// Start from the theme's own header, so runs don't pile up changes.
await select(
	( slug ) =>
		window.wp
			.apiFetch( {
				path: `/wp/v2/template-parts/${ slug }//header?force=true`,
				method: 'DELETE',
			} )
			.catch( () => null ),
	theme
);
const pageId = await select( async () => {
	const created = await window.wp.apiFetch( {
		path: '/wp/v2/pages',
		method: 'POST',
		data: { title: 'SSE smoke test', status: 'publish', content: '' },
	} );
	return created.id;
} );

console.log( 'Browse mode' );
await page.goto(
	`${ BASE }/wp-admin/site-editor.php?p=${ encodeURIComponent(
		`/page/${ pageId }`
	) }`,
	{ waitUntil: 'load' }
);
await step( 'Edit button opens edit mode', async () => {
	await page
		.locator( '.sse-browse-edit__button' )
		.click( { timeout: 60000 } );
	await page.waitForURL( /canvas=edit/, { timeout: 15000 } );
} );

await openEditor(
	`/wp-admin/site-editor.php?p=${ encodeURIComponent(
		`/page/${ pageId }`
	) }&canvas=edit`
);

console.log( 'Sections' );
await step(
	'empty page offers Add section, picker inserts an Intro',
	async () => {
		await canvas.locator( '.sse-add-section__button' ).first().click();
		await page.locator( '.sse-picker__card' ).first().waitFor();
		await shot( 'picker' );
		await pick( 'Intro', 1 );
		const sections = await topLevel();
		expect(
			sections.length === 1,
			`expected 1 section, got ${ sections.length }`
		);
		expect( sections[ 0 ].label === 'Intro', 'section not named Intro' );
	}
);
await step( 'Add section after, from each group, and Add Blank', async () => {
	for ( const [ group, index ] of [
		[ 'Features', 0 ],
		[ 'Gallery', 0 ],
		[ 'Testimonials', 0 ],
		[ 'Pricing', 1 ],
	] ) {
		const count = ( await topLevel() ).length;
		await hoverSection( count - 1 );
		await canvas
			.locator( '.sse-section-anchor.is-end .sse-add-section__button' )
			.click();
		await pick( group, index );
	}
	const count = ( await topLevel() ).length;
	await hoverSection( count - 1 );
	await canvas
		.locator( '.sse-section-anchor.is-end .sse-add-section__button' )
		.click();
	await page
		.locator( '.sse-picker__nav-action', { hasText: 'Add Blank' } )
		.click();
	const sections = await topLevel();
	expect(
		sections.length === 6,
		`expected 6 sections, got ${ sections.length }`
	);
	expect(
		sections[ 5 ].name === 'sse/fluid-section',
		'Add Blank did not add a freeform section'
	);
} );
await step( 'no invalid blocks', async () => {
	const invalid = await select( () => {
		const be = window.wp.data.select( 'core/block-editor' );
		return be
			.getClientIdsWithDescendants()
			.filter( ( id ) => be.getBlock( id )?.isValid === false ).length;
	} );
	expect( invalid === 0, `${ invalid } invalid blocks` );
} );
await step( 'section menu: duplicate, move, remove and undo', async () => {
	const before = ( await topLevel() ).map( ( s ) => s.label );
	let anchor = await hoverSection( 1 );
	await anchor.getByRole( 'button', { name: 'Duplicate section' } ).click();
	expect(
		( await topLevel() ).length === before.length + 1,
		'not duplicated'
	);
	anchor = await hoverSection( 1 );
	await anchor.getByRole( 'button', { name: 'Move section up' } ).click();
	expect( ( await topLevel() )[ 0 ].label === before[ 1 ], 'not moved up' );
	const afterMove = ( await topLevel() ).map( ( s ) => s.label );
	anchor = await hoverSection( 0 );
	await anchor.getByRole( 'button', { name: 'Remove' } ).click();
	expect(
		( await topLevel() ).length === afterMove.length - 1,
		'not removed'
	);
	await page
		.locator( '.components-snackbar' )
		.getByRole( 'button', { name: 'Undo' } )
		.click();
	expect(
		JSON.stringify( ( await topLevel() ).map( ( s ) => s.label ) ) ===
			JSON.stringify( afterMove ),
		'undo did not restore the section in place'
	);
	// Tidy up the duplicate.
	anchor = await hoverSection( 0 );
	await anchor.getByRole( 'button', { name: 'Remove' } ).click();
} );
await step( 'Edit section: colour theme', async () => {
	const anchor = await hoverSection( 0 );
	await anchor.getByRole( 'button', { name: 'Edit section' } ).click();
	await page.locator( '.sse-panel' ).waitFor();
	await page
		.locator( '.sse-panel .components-tab-panel__tabs-item', {
			hasText: 'Colors',
		} )
		.click();
	await page.locator( '.sse-theme-row', { hasText: 'Dark 1' } ).click();
	await shot( 'edit-section-colors' );
	await page.keyboard.press( 'Escape' );
	expect(
		( await topLevel() )[ 0 ].className.includes( 'is-style-sse-dark-1' ),
		'theme not applied'
	);
	const bg = await canvas
		.locator( '.sse-section:not(.sse-section--shared)' )
		.first()
		.evaluate( ( e ) => getComputedStyle( e ).backgroundColor );
	expect( bg !== 'rgba(0, 0, 0, 0)', 'section has no background colour' );
} );
await step( 'View layouts swaps the layout and keeps the colours', async () => {
	const anchor = await hoverSection( 0 );
	await anchor.getByRole( 'button', { name: 'View layouts' } ).click();
	await page.locator( '.sse-layouts__card' ).first().waitFor();
	await page.locator( '.sse-layouts__card' ).first().click();
	const first = ( await topLevel() )[ 0 ];
	expect( first.label === 'Intro', 'swapped section is not an Intro' );
	expect(
		first.className.includes( 'is-style-sse-dark-1' ),
		'colour theme was not kept'
	);
} );
let videoId = null;
await step(
	'background video turns the section into a Cover and back',
	async () => {
		// Upload a short clip through the REST API, then pick it in the media
		// library the way a person would.
		const clip = readFileSync(
			new URL( './fixtures/background.mp4', import.meta.url )
		).toString( 'base64' );
		videoId = await select( async ( data ) => {
			const bytes = Uint8Array.from( window.atob( data ), ( c ) =>
				c.charCodeAt( 0 )
			);
			const body = new window.FormData();
			body.append(
				'file',
				new window.Blob( [ bytes ], { type: 'video/mp4' } ),
				'sse-smoke-test.mp4'
			);
			return (
				await window.wp.apiFetch( {
					path: '/wp/v2/media',
					method: 'POST',
					body,
				} )
			).id;
		}, clip );
		expect(
			( await topLevel() )[ 0 ].name === 'core/group',
			'not a Group'
		);

		const anchor = await hoverSection( 0 );
		await anchor.getByRole( 'button', { name: 'Edit section' } ).click();
		await page
			.locator( '.sse-panel .components-tab-panel__tabs-item', {
				hasText: 'Background',
			} )
			.click();
		await page.getByRole( 'tab', { name: 'Video' } ).click();
		await page.getByRole( 'button', { name: 'Add a video' } ).click();
		await page
			.locator( '.media-modal .media-menu-item', {
				hasText: 'Media Library',
			} )
			.click();
		await page
			.locator( `.media-modal .attachment[data-id="${ videoId }"]` )
			.click();
		await page.locator( '.media-modal .media-button-select' ).click();
		await page.getByRole( 'button', { name: 'Remove video' } ).waitFor();

		let first = ( await topLevel() )[ 0 ];
		expect( first.name === 'core/cover', 'section did not become a Cover' );
		expect(
			first.className.includes( 'is-style-sse-dark-1' ),
			'colour theme was not kept'
		);
		expect(
			await canvas
				.locator( 'video.wp-block-cover__video-background' )
				.count(),
			'no video in the canvas'
		);
		// The panel stays open on the new block, on the Background tab.
		expect(
			await page
				.getByRole( 'tab', { name: 'Video', selected: true } )
				.count(),
			'panel did not stay on the video'
		);
		await shot( 'background-video' );

		await page.getByRole( 'button', { name: 'Remove video' } ).click();
		await page.getByRole( 'button', { name: 'Add a video' } ).waitFor();
		first = ( await topLevel() )[ 0 ];
		expect(
			first.name === 'core/group',
			'section did not go back to a Group'
		);
		expect(
			first.className.includes( 'is-style-sse-dark-1' ),
			'colour theme was not kept going back'
		);
		await page.keyboard.press( 'Escape' );
	}
);
await step( 'heart saves the section, and it shows under Saved', async () => {
	const anchor = await hoverSection( 0 );
	await anchor.getByRole( 'button', { name: 'Save section' } ).click();
	await page
		.locator( '.components-snackbar', { hasText: 'saved' } )
		.waitFor();
	await hoverSection( 0 );
	await canvas.locator( '.sse-add-section__button' ).first().click();
	await page
		.locator( '.sse-picker__nav-action', { hasText: 'Saved' } )
		.click();
	await page
		.locator( '.sse-picker__card' )
		.first()
		.waitFor( { timeout: 15000 } );
	await page.keyboard.press( 'Escape' );
} );

console.log( 'Freeform sections' );
const items = () =>
	select( () => {
		const be = window.wp.data.select( 'core/block-editor' );
		return be
			.getBlocksByName( 'sse/fluid-item' )
			.map( ( id ) => be.getBlockAttributes( id ) );
	} );
await step( 'Add block panel adds a text block in edit mode', async () => {
	const section = canvas.locator( '.wp-block-sse-fluid-section' ).last();
	await section.evaluate( ( e ) => e.scrollIntoView( { block: 'center' } ) );
	await section.hover();
	await canvas.locator( '.sse-fluid-bar__add' ).last().click();
	await page.locator( '.sse-add-block input' ).fill( 'tab' );
	const found = await page.locator( '.sse-add-block__tile' ).allInnerTexts();
	expect( found.includes( 'Table' ), 'search did not find Table' );
	await page.locator( '.sse-add-block input' ).fill( '' );
	await page.locator( '.sse-add-block__tile', { hasText: 'Text' } ).click();
	await page.waitForTimeout( 300 );
	await page.keyboard.type( 'Drag me' );
	expect( ( await items() ).length === 1, 'no item added' );
} );
await step(
	'click selects, drag moves on the grid, second click edits',
	async () => {
		await select( () =>
			window.wp.data.dispatch( 'core/block-editor' ).clearSelectedBlock()
		);
		const item = canvas.locator( '.wp-block-sse-fluid-item' ).last();
		await item.click();
		const selected = () =>
			select( () => {
				const be = window.wp.data.select( 'core/block-editor' );
				return be.getBlockName( be.getSelectedBlockClientId() );
			} );
		expect(
			( await selected() ) === 'sse/fluid-item',
			'first click did not select'
		);
		const before = ( await items() ).at( -1 ).layout;
		const box = await item.boundingBox();
		await page.mouse.move( box.x + box.width / 2, box.y + box.height / 2 );
		await page.mouse.down();
		await page.mouse.move(
			box.x + box.width / 2 - 180,
			box.y + box.height / 2 + 90,
			{ steps: 10 }
		);
		await shot( 'freeform-drag' );
		await page.mouse.up();
		const after = ( await items() ).at( -1 ).layout;
		expect(
			after.c !== before.c || after.r !== before.r,
			`did not move: ${ JSON.stringify( after ) }`
		);
		await item.click();
		expect(
			( await selected() ) === 'core/paragraph',
			'second click did not edit'
		);
	}
);
await step( 'bottom handle adds rows', async () => {
	const rows = () =>
		select( () => {
			const be = window.wp.data.select( 'core/block-editor' );
			const id = be.getBlocksByName( 'sse/fluid-section' ).at( -1 );
			return be.getBlockAttributes( id ).rows;
		} );
	const before = await rows();
	const handle = canvas.locator( '.sse-rows-handle' ).last();
	await handle.evaluate( ( e ) => e.scrollIntoView( { block: 'center' } ) );
	let box = await handle.boundingBox();
	await page.mouse.move( box.x - 200, box.y - 50 );
	box = await handle.boundingBox();
	await page.mouse.move( box.x + 10, box.y + 10 );
	await page.mouse.down();
	await page.mouse.move( box.x + 10, box.y + 140, { steps: 8 } );
	await page.mouse.up();
	expect( ( await rows() ) > before, 'rows did not grow' );
} );
await step(
	'first drag on mobile starts a mobile layout without a jump',
	async () => {
		await select( () =>
			window.wp.data.dispatch( 'core/block-editor' ).clearSelectedBlock()
		);
		await page
			.locator( '.sse-device-switch__group button[aria-label="Mobile"]' )
			.click();
		await page.waitForTimeout( 1200 );
		const item = canvas.locator( '.wp-block-sse-fluid-item' ).last();
		await item.evaluate( ( e ) => e.scrollIntoView( { block: 'center' } ) );
		const b0 = await item.boundingBox();
		// Clear of the section's own buttons in its top corners.
		const x = b0.x + b0.width * 0.3;
		const y = b0.y + b0.height * 0.7;
		await page.mouse.move( x, y );
		await page.mouse.down();
		await page.mouse.move( x + 2, y + 6, { steps: 3 } );
		await page.mouse.up();
		const b1 = await item.boundingBox();
		expect( Math.abs( b1.y - b0.y ) < 60, `jumped ${ b1.y - b0.y }px` );
		expect(
			!! ( await items() ).at( -1 ).mobileLayout,
			'no mobile layout'
		);
		await page
			.locator( '.sse-device-switch__group button[aria-label="Desktop"]' )
			.click();
	}
);

console.log( 'Site Styles' );
await step( 'palette writes custom colours that reach the canvas', async () => {
	await page
		.locator( '.interface-pinned-items button[aria-label="Site Styles"]' )
		.click();
	await page.locator( '.sse-card__main', { hasText: 'Colours' } ).click();
	await page.locator( '.sse-palette-preset' ).nth( 3 ).click();
	await page.waitForTimeout( 500 );
	await shot( 'site-styles-colours' );
	const accent = await canvas
		.locator( 'body' )
		.evaluate( ( b ) =>
			getComputedStyle( b ).getPropertyValue(
				'--wp--preset--color--sse-accent'
			)
		);
	expect(
		accent.trim().toUpperCase() === '#2A74C3',
		`accent is ${ accent }`
	);
	expect(
		( await canvas.locator( '.sse-theme-tag' ).count() ) > 0,
		'sections are not tagged with their themes'
	);
	await page.locator( '.sse-styles__back' ).click();
	await page.locator( '.sse-card__main', { hasText: 'Buttons' } ).click();
	await page.getByRole( 'radio', { name: 'Pill' } ).click();
	await page.locator( '.sse-styles__back' ).click();
	await select( () =>
		window.wp.data
			.dispatch( 'core/interface' )
			.disableComplementaryArea( 'core' )
	);
} );

console.log( 'Saving' );
await step( 'save, reload, still valid', async () => {
	await save();
	await openEditor(
		`/wp-admin/site-editor.php?p=${ encodeURIComponent(
			`/page/${ pageId }`
		) }&canvas=edit`
	);
	const [ total, invalid ] = await select( () => {
		const be = window.wp.data.select( 'core/block-editor' );
		const all = be.getClientIdsWithDescendants();
		return [
			all.length,
			all.filter( ( id ) => be.getBlock( id )?.isValid === false ).length,
		];
	} );
	expect( total > 50, `only ${ total } blocks after reload` );
	expect( invalid === 0, `${ invalid } invalid blocks after reload` );
} );

console.log( 'Header' );
await openEditor(
	`/wp-admin/site-editor.php?p=${ encodeURIComponent(
		`/wp_template/${ theme }//page`
	) }&canvas=edit`
);
await step( 'Edit site header: dim, add a button, colour, save', async () => {
	const header = canvas.locator( '.sse-section--shared' ).first();
	await header.waitFor( { timeout: 30000 } );
	await header.scrollIntoViewIfNeeded();
	const box = await header.boundingBox();
	await page.mouse.move( box.x + 400, box.y + box.height / 2 );
	await canvas.locator( '.sse-part-button.is-edit' ).first().click();
	const title = await page.locator( '.sse-part-title' ).innerText();
	expect( title.includes( 'Editing Site Header' ), 'top bar title missing' );
	await canvas
		.locator( '.sse-part-actions .sse-part-button', {
			hasText: 'Add elements',
		} )
		.click();
	await page.locator( '.sse-add-block__tile', { hasText: 'Button' } ).click();
	await canvas
		.locator( '.sse-part-actions .sse-part-button', {
			hasText: 'Edit design',
		} )
		.click();
	await page
		.locator( '.sse-panel .components-tab-panel__tabs-item', {
			hasText: 'Color',
		} )
		.click();
	await page.locator( '.sse-theme-row', { hasText: 'Light 2' } ).click();
	await shot( 'header-editing' );
	await page.keyboard.press( 'Escape' );
	await page.mouse.click( 700, 700 );
	expect(
		( await select( () =>
			window.wp.data.select( 'sse/editor' ).getEditingPart()
		) ) === null,
		'clicking outside did not finish editing'
	);
	await save();
} );

console.log( 'Accessibility (axe, WCAG 2 A and AA)' );
const axeSource = readFileSync(
	createRequire( import.meta.url ).resolve( 'axe-core/axe.min.js' ),
	'utf8'
);
async function axe( frame, selector ) {
	await frame.evaluate( axeSource );
	return frame.evaluate( async ( sel ) => {
		const result = await window.axe.run(
			{ include: [ [ sel ] ] },
			{ runOnly: [ 'wcag2a', 'wcag2aa' ] }
		);
		return result.violations.map(
			( v ) => `${ v.id }: ${ v.nodes[ 0 ]?.target.join( ' ' ) }`
		);
	}, selector );
}
await openEditor(
	`/wp-admin/site-editor.php?p=${ encodeURIComponent(
		`/page/${ pageId }`
	) }&canvas=edit`
);
await step(
	'section chrome, Edit section, picker and Site Styles',
	async () => {
		const canvasFrame = page
			.frames()
			.find( ( f ) => f.name() === 'editor-canvas' );
		const problems = [
			...( await axe( canvasFrame, '.sse-section-anchor' ) ),
		];
		const anchor = await hoverSection( 0 );
		await anchor.getByRole( 'button', { name: 'Edit section' } ).click();
		await page.locator( '.sse-panel' ).waitFor();
		for ( const tab of [ 'Design', 'Background', 'Colors' ] ) {
			await page
				.locator( '.sse-panel .components-tab-panel__tabs-item', {
					hasText: tab,
				} )
				.click();
			problems.push( ...( await axe( page.mainFrame(), '.sse-panel' ) ) );
		}
		await page.keyboard.press( 'Escape' );
		await select( () =>
			window.wp.data.dispatch( 'sse/editor' ).openSectionPicker( '', 0 )
		);
		await page.locator( '.sse-picker__card' ).first().waitFor();
		problems.push( ...( await axe( page.mainFrame(), '.sse-picker' ) ) );
		await page.keyboard.press( 'Escape' );
		await select( () =>
			window.wp.data
				.dispatch( 'core/interface' )
				.enableComplementaryArea( 'core', 'sse-editor/sse-site-styles' )
		);
		await page.locator( '.sse-card' ).first().waitFor();
		problems.push( ...( await axe( page.mainFrame(), '.sse-styles' ) ) );
		await page.locator( '.sse-card__main', { hasText: 'Colours' } ).click();
		problems.push( ...( await axe( page.mainFrame(), '.sse-styles' ) ) );
		problems.push( ...( await axe( page.mainFrame(), '.editor-header' ) ) );
		expect( problems.length === 0, problems.join( '; ' ) );
	}
);

console.log( 'Front end' );
for ( const [ width, name ] of [
	[ 1440, 'desktop' ],
	[ 390, 'phone' ],
] ) {
	await step( `renders on ${ name } without overflow`, async () => {
		const front = await browser.newPage( {
			viewport: { width, height: 900 },
		} );
		const errors = [];
		front.on( 'pageerror', ( e ) => errors.push( e.message ) );
		await front.goto( `${ BASE }/?page_id=${ pageId }`, {
			waitUntil: 'load',
		} );
		const overflow = await front.evaluate(
			() => document.documentElement.scrollWidth - window.innerWidth
		);
		const header = await front.evaluate( () => {
			const h = document.querySelector( 'header.wp-block-template-part' );
			return h?.className || '';
		} );
		if ( SHOTS ) {
			await front.screenshot( {
				path: `${ SHOTS }/front-${ name }.png`,
				fullPage: true,
			} );
		}
		await front.close();
		expect( overflow <= 0, `${ overflow }px horizontal overflow` );
		expect( errors.length === 0, errors.join( '; ' ) );
		expect(
			header.includes( 'is-style-sse-light-2' ),
			'header colour not saved'
		);
	} );
}

// Leave the site as we found it: the test page would otherwise pile up in
// page lists and navigation menus.
if ( ! process.env.SSE_KEEP ) {
	await page
		.evaluate(
			( [ id, media ] ) =>
				Promise.all( [
					window.wp.apiFetch( {
						path: `/wp/v2/pages/${ id }?force=true`,
						method: 'DELETE',
					} ),
					media &&
						window.wp.apiFetch( {
							path: `/wp/v2/media/${ media }?force=true`,
							method: 'DELETE',
						} ),
				] ),
			[ pageId, videoId ]
		)
		.catch( () => null );
}

await browser.close();
if ( pageErrors.length ) {
	console.log( `Page errors:\n  ${ pageErrors.join( '\n  ' ) }` );
}
console.log( failures ? `${ failures } failed` : 'All passed' );
process.exit( failures || pageErrors.length ? 1 : 0 );
