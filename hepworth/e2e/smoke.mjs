/* eslint-disable no-console */
/**
 * End-to-end smoke test: drives the real editor in a headless browser through
 * both toolbars on the sample page, and checks the blocks they leave behind.
 *
 * Needs a WordPress site with the plugin active and automatic login, which
 * WordPress Playground gives you:
 *
 *   npx @wp-playground/cli server --login --port=9400 \
 *     --mount=.:/wordpress/wp-content/plugins/hepworth
 *   (activate the plugin in Plugins, then)
 *   npm run test:e2e
 *
 * Set HEPWORTH_BASE_URL to use another site, HEPWORTH_SHOTS to a
 * folder to keep screenshots, and HEPWORTH_CHROME to use a particular
 * Chrome or Chromium. It edits the sample page but never saves it.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = (
	process.env.HEPWORTH_BASE_URL || 'http://127.0.0.1:9400'
).replace( /\/$/, '' );
const SHOTS = process.env.HEPWORTH_SHOTS;
if ( SHOTS ) {
	mkdirSync( SHOTS, { recursive: true } );
}

const browser = await chromium.launch(
	process.env.HEPWORTH_CHROME
		? { executablePath: process.env.HEPWORTH_CHROME }
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
			( document.body.className.match( /\bhw-(write|design)\b/ ) ||
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
		.locator( '.hw-popover [role=menuitemradio]', { hasText: text } )
		.first()
		.click();
	await wait( 500 );
}

console.log( `Hepworth smoke test on ${ BASE }` );
await page.goto( `${ BASE }/wp-admin/?hepworth-sample`, {
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
// A fresh site may still show the welcome guide or the pattern picker.
for ( let i = 0; i < 3; i++ ) {
	const close = page.locator(
		'.components-modal__frame button[aria-label="Close"]'
	);
	if ( ! ( await close.count() ) ) {
		break;
	}
	await close.first().click();
	await wait( 400 );
}

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
			( await page.locator( '.hw-style .hw-box__text' ).innerText() ) ===
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

await step(
	'the block icon lists the heading and what it can turn into',
	async () => {
		const toggle = page.locator( '.hw-block-menu__toggle' );
		expect( await toggle.isVisible(), 'no block icon' );
		await toggle.click();
		await wait( 300 );
		const items = await page
			.locator( '.hw-menu--blocks [role^=menuitem]' )
			.allInnerTexts();
		expect(
			items[ 0 ].trim() === 'Heading 1',
			`first item: ${ items[ 0 ] }`
		);
		expect(
			items.some( ( t ) => t.trim() === 'Paragraph' ),
			items.join( ', ' )
		);
		await shot( '01b-block-menu' );
		await page
			.locator( '.hw-menu--blocks [role=menuitem]', {
				hasText: /^Paragraph$/,
			} )
			.click();
		await wait( 500 );
		expect(
			( await selected() ).name === 'core/paragraph',
			'not a paragraph'
		);
		await page.evaluate( () =>
			window.wp.data.dispatch( 'core/editor' ).undo()
		);
		await wait( 500 );
		await canvas.locator( 'h1.wp-block-heading' ).first().click();
		await wait( 500 );
	}
);

await step(
	'Align text is in the writing toolbar, not the design one',
	async () => {
		const alignText = page.locator(
			'.block-editor-block-toolbar button[aria-label="Align text"]'
		);
		expect( await alignText.isVisible(), 'no Align text when writing' );
		await page.locator( '.hw-mode__design' ).click();
		await wait( 500 );
		expect(
			! ( await alignText.isVisible() ),
			'Align text showing when designing'
		);
		await page.locator( '.hw-mode__write' ).click();
		await wait( 500 );
	}
);

await step( 'Style turns the heading into a paragraph and back', async () => {
	await pick( '.hw-style', 'Normal' );
	expect( ( await selected() ).name === 'core/paragraph', 'not a paragraph' );
	await pick( '.hw-style', 'Subheading' );
	const s = await selected();
	expect(
		s.name === 'core/heading' && s.attrs.level === 3,
		'not a level 3 heading'
	);
} );

await step( 'A▲ goes up to the next heading level', async () => {
	await page.locator( '.hw-step' ).first().click();
	await wait( 400 );
	expect( ( await selected() ).attrs.level === 2, 'not level 2' );
} );

await step( 'Size takes a size of your own', async () => {
	await page.locator( '.hw-size' ).click();
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
	await page.locator( '.hw-font-colour' ).click();
	await wait( 300 );
	await page
		.locator( '.hw-colours .components-circular-option-picker__option' )
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
	await page.locator( '.hw-mode__design' ).click();
	await wait( 400 );
	expect( ( await mode() ) === 'design', 'not in design mode' );
	expect(
		! ( await page
			.locator( '.block-editor-block-toolbar button[aria-label="Bold"]' )
			.isVisible() ),
		'Bold still showing'
	);
	expect(
		! ( await page
			.locator(
				'.block-editor-block-toolbar .block-editor-block-parent-selector'
			)
			.isVisible() ),
		'parent selector showing'
	);
} );

await step(
	'a button opens the design toolbar, and its settings work',
	async () => {
		await select( 'core/button' );
		await wait( 600 );
		expect( ( await mode() ) === 'design', 'not in design mode' );
		await pick( '.hw-design-tools button[aria-label="Size"]', 'Large' );
		await pick( '.hw-design-tools button[aria-label="Corners"]', 'Square' );
		await page
			.locator( '.hw-design-tools button[aria-label="Full width"]' )
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
		.locator( '.hw-design-tools button[aria-label="Background"]' )
		.click();
	await wait( 300 );
	await page
		.locator( '.hw-colours .components-circular-option-picker__option' )
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

await step( 'a section has its alignment in the design toolbar', async () => {
	expect(
		await page
			.locator( '.block-editor-block-toolbar button[aria-label="Align"]' )
			.isVisible(),
		'no Align on a section'
	);
} );

await step( 'Swap sides moves the hero picture across', async () => {
	await select( 'core/columns' );
	await wait( 600 );
	const firstHasImage = () =>
		page.evaluate( () => {
			const be = window.wp.data.select( 'core/block-editor' );
			const cols = be.getBlocksByName( 'core/columns' )[ 0 ];
			return be
				.getBlock( be.getBlockOrder( cols )[ 0 ] )
				.innerBlocks.some( ( b ) => b.name === 'core/image' );
		} );
	expect( ! ( await firstHasImage() ), 'picture should start on the right' );
	await page
		.locator( '.hw-design-tools button[aria-label="Swap sides"]' )
		.click();
	await wait( 300 );
	expect( await firstHasImage(), 'picture still on the right' );
} );

await step( 'a picture can be made a circle', async () => {
	await select( 'core/image' );
	await wait( 600 );
	await pick( '.hw-design-tools button[aria-label="Shape"]', 'Circle' );
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
