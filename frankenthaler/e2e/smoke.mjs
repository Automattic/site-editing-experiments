/* eslint-disable no-console */
/**
 * End-to-end smoke test: drives the real editor in a headless browser through
 * both toolbars on the sample page, and checks the blocks they leave behind.
 *
 * Needs a WordPress site with the plugin active and automatic login, which
 * WordPress Playground gives you:
 *
 *   npx @wp-playground/cli server --login --port=9400 \
 *     --mount=.:/wordpress/wp-content/plugins/frankenthaler
 *   (activate the plugin in Plugins, then)
 *   npm run test:e2e
 *
 * Set FRANKENTHALER_BASE_URL to use another site, FRANKENTHALER_SHOTS to a
 * folder to keep screenshots, and FRANKENTHALER_CHROME to use a particular
 * Chrome or Chromium. It edits the sample page but never saves it.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = (
	process.env.FRANKENTHALER_BASE_URL || 'http://127.0.0.1:9400'
).replace( /\/$/, '' );
const SHOTS = process.env.FRANKENTHALER_SHOTS;
if ( SHOTS ) {
	mkdirSync( SHOTS, { recursive: true } );
}

const browser = await chromium.launch(
	process.env.FRANKENTHALER_CHROME
		? { executablePath: process.env.FRANKENTHALER_CHROME }
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
	SHOTS ? page.screenshot( { path: `${ SHOTS }/${ name }.png` } ) : null;
const wait = ( ms ) => page.waitForTimeout( ms );
const selected = () =>
	page.evaluate( () => {
		const b = window.wp.data
			.select( 'core/block-editor' )
			.getSelectedBlock();
		return b && { name: b.name, attrs: b.attributes };
	} );
const mode = () =>
	page.evaluate(
		() =>
			( document.body.className.match( /\bfk-(write|design)\b/ ) ||
				[] )[ 1 ]
	);
const select = ( name, n = 0 ) =>
	page.evaluate(
		( [ blockName, i ] ) => {
			const id = window.wp.data
				.select( 'core/block-editor' )
				.getBlocksByName( blockName )[ i ];
			window.wp.data.dispatch( 'core/block-editor' ).selectBlock( id );
		},
		[ name, n ]
	);
async function pick( toggle, text ) {
	await page.locator( toggle ).click();
	await wait( 300 );
	await page
		.locator( '.fk-popover [role=menuitemradio]', { hasText: text } )
		.first()
		.click();
	await wait( 500 );
}

console.log( `Frankenthaler smoke test on ${ BASE }` );
await page.goto( `${ BASE }/wp-admin/?frankenthaler-sample`, {
	timeout: 180000,
} );
await page.waitForFunction(
	() => window.wp?.data?.select( 'core/block-editor' ).getBlocks().length > 0,
	null,
	{ timeout: 120000 }
);
await page.evaluate( () =>
	window.wp.data
		.dispatch( 'core/preferences' )
		.set( 'core/edit-post', 'welcomeGuide', false )
);
await wait( 2500 );

await step( 'the sample page loads with every block valid', async () => {
	const invalid = await page.evaluate( () => {
		const out = [];
		const walk = ( b ) => {
			if ( ! b.isValid ) {
				out.push( b.name );
			}
			b.innerBlocks.forEach( walk );
		};
		window.wp.data
			.select( 'core/block-editor' )
			.getBlocks()
			.forEach( walk );
		return out;
	} );
	expect( ! invalid.length, `invalid blocks: ${ invalid.join( ', ' ) }` );
} );

await step(
	'clicking a heading opens the writing toolbar, without the block switcher',
	async () => {
		await canvas.locator( 'h1.wp-block-heading' ).first().click();
		await wait( 600 );
		expect( ( await mode() ) === 'write', 'not in writing mode' );
		expect(
			( await page.locator( '.fk-style .fk-box__text' ).innerText() ) ===
				'Title',
			'Style should say Title'
		);
		expect(
			! ( await page
				.locator(
					'.block-editor-block-toolbar .block-editor-block-switcher'
				)
				.isVisible() ),
			'block switcher showing'
		);
		await shot( '01-writing' );
	}
);

await step( 'Style turns the heading into a paragraph and back', async () => {
	await pick( '.fk-style', 'Normal' );
	expect( ( await selected() ).name === 'core/paragraph', 'not a paragraph' );
	await pick( '.fk-style', 'Subheading' );
	const s = await selected();
	expect(
		s.name === 'core/heading' && s.attrs.level === 3,
		'not a level 3 heading'
	);
} );

await step( 'A▲ goes up to the next heading level', async () => {
	await page.locator( '.fk-step' ).first().click();
	await wait( 400 );
	expect( ( await selected() ).attrs.level === 2, 'not level 2' );
} );

await step( 'Size takes a size of your own', async () => {
	await page.locator( '.fk-size' ).click();
	await wait( 300 );
	await page.keyboard.press( 'Control+a' );
	await page.keyboard.type( '37' );
	await page.keyboard.press( 'Enter' );
	await wait( 400 );
	expect(
		( await selected() ).attrs.style?.typography?.fontSize === '37px',
		'no 37px'
	);
} );

await step( 'font colour applies, then asks about every heading', async () => {
	await page.locator( '.fk-font-colour' ).click();
	await wait( 300 );
	await page
		.locator( '.fk-colours .components-circular-option-picker__option' )
		.nth( 2 )
		.click();
	await wait( 600 );
	expect( !! ( await selected() ).attrs.textColor, 'no text colour' );
	const snack = page.locator( '.components-snackbar button', {
		hasText: 'Every heading',
	} );
	expect( await snack.isVisible(), 'no question' );
	await shot( '02-every-heading' );
	await snack.click();
	await wait( 1500 );
	const heading = await page.evaluate( () => {
		const c = window.wp.data.select( 'core' );
		return c.getEditedEntityRecord(
			'root',
			'globalStyles',
			c.__experimentalGetCurrentGlobalStylesId()
		).styles?.elements?.heading?.color?.text;
	} );
	expect( !! heading, 'global heading colour not set' );
	expect(
		! ( await selected() ).attrs.textColor,
		'the one-off colour should go'
	);
} );

await step( 'Design hides the text formatting', async () => {
	await page.locator( '.fk-mode__design' ).click();
	await wait( 400 );
	expect( ( await mode() ) === 'design', 'not in design mode' );
	expect(
		! ( await page
			.locator( '.block-editor-block-toolbar button[aria-label="Bold"]' )
			.isVisible() ),
		'Bold still showing'
	);
} );

await step(
	'a button opens the design toolbar, and its settings work',
	async () => {
		await select( 'core/button' );
		await wait( 600 );
		expect( ( await mode() ) === 'design', 'not in design mode' );
		await pick( '.fk-design-tools button[aria-label="Size"]', 'Large' );
		await pick( '.fk-design-tools button[aria-label="Corners"]', 'Square' );
		await page
			.locator( '.fk-design-tools button[aria-label="Full width"]' )
			.click();
		await wait( 300 );
		const a = ( await selected() ).attrs;
		const wide = a.width === 100 || a.style?.dimensions?.width === '100%';
		expect(
			a.fontSize === 'large' && a.style?.border?.radius === '0px' && wide,
			JSON.stringify( a )
		);
		await shot( '03-button' );
	}
);

await step( 'a section gets a background, and Every section', async () => {
	await select( 'core/group' );
	await wait( 600 );
	await page
		.locator( '.fk-design-tools button[aria-label="Background"]' )
		.click();
	await wait( 300 );
	await page
		.locator( '.fk-colours .components-circular-option-picker__option' )
		.nth( 3 )
		.click();
	await wait( 600 );
	await page
		.locator( '.components-snackbar button', { hasText: 'Every section' } )
		.click();
	await wait( 600 );
	const colours = await page.evaluate( () =>
		window.wp.data
			.select( 'core/block-editor' )
			.getBlocks()
			.map( ( b ) => b.attributes.backgroundColor )
	);
	expect(
		new Set( colours ).size === 1 && colours[ 0 ],
		colours.join( ', ' )
	);
} );

await step( 'Swap sides moves a media and text picture across', async () => {
	await select( 'core/media-text' );
	await wait( 600 );
	await page
		.locator( '.fk-design-tools button[aria-label="Swap sides"]' )
		.click();
	await wait( 300 );
	expect(
		( await selected() ).attrs.mediaPosition === 'left',
		'still on the right'
	);
} );

await step( 'a picture can be made a circle', async () => {
	await select( 'core/image' );
	await wait( 600 );
	await pick( '.fk-design-tools button[aria-label="Shape"]', 'Circle' );
	const a = ( await selected() ).attrs;
	expect(
		a.aspectRatio === '1' && a.style?.border?.radius === '9999px',
		JSON.stringify( a )
	);
} );

await step( 'no errors on the page', async () => {
	expect( ! pageErrors.length, pageErrors.join( ' | ' ) );
} );

await browser.close();
console.log( failures ? `\n${ failures } failed` : '\nAll passed' );
process.exit( failures ? 1 : 0 );
