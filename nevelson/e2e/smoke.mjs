/* eslint-disable no-console */
/**
 * End-to-end smoke test: drives the real editor in a headless browser through
 * Nevelson's floating panel: where it goes, following the block, changing a
 * setting, the page's settings card, blocks in patterns, dragging and
 * closing it, multiple blocks, the sheet on a narrow screen, and the site
 * editor.
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

// A block's box with its toolbar's, which the panel goes beside too.
const withToolbar = async ( clientId ) => {
	const b = await blockBox( clientId );
	const t = await toolbar();
	return t
		? {
				left: Math.min( b.left, t.left ),
				top: Math.min( b.top, t.top ),
				right: Math.max( b.right, t.right ),
				bottom: Math.max( b.bottom, t.bottom ),
		  }
		: b;
};

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

// The block toolbar's box, and the labels of the buttons you can see in it.
const toolbar = () =>
	page.evaluate( () => {
		const t = document.querySelector(
			'.block-editor-block-popover .block-editor-block-contextual-toolbar'
		);
		if ( ! t ) {
			return null;
		}
		const r = t.getBoundingClientRect();
		// What's by the block: not the tools placed in the panel.
		const labels = [ ...t.querySelectorAll( 'button' ) ]
			.filter(
				( b ) =>
					b.offsetParent !== null && ! b.closest( '.nevelson-moved' )
			)
			.map( ( b ) => b.getAttribute( 'aria-label' ) || b.textContent );
		return {
			left: r.left,
			top: r.top,
			right: r.right,
			bottom: r.bottom,
			labels,
		};
	} );
// What's kept by the block, and some of what isn't.
const KEPT = [
	'Drag',
	'Move up',
	'Move down',
	'Bold',
	'Italic',
	'Link',
	'More',
	'Block settings',
	'Options',
];
const MOVED = [ 'Align', 'Align text' ];
// The handle and movers' box, the block name shown in the toolbar, and
// whether the parent block's button shows.
const extras = () =>
	page.evaluate( () => {
		const bar = '.block-editor-block-contextual-toolbar';
		const m = document
			.querySelector( `${ bar } .block-editor-block-mover` )
			?.getBoundingClientRect();
		const name = [
			...document.querySelectorAll( `${ bar } .nevelson-switcher-label` ),
		].find( ( e ) => e.offsetParent !== null );
		return {
			mover: m && { left: m.left, right: m.right },
			name: name?.textContent || null,
			parentButton: [
				...document.querySelectorAll(
					'.block-editor-block-parent-selector'
				),
			].some( ( e ) => e.offsetParent !== null ),
		};
	} );

// Opens a tab in the block's settings, if it has tabs.
const openTab = async ( name ) => {
	const tab = page.locator(
		`${ PANEL } [role="tab"][aria-label="${ name }"]`
	);
	if ( await tab.count() ) {
		await tab.first().click();
		await wait( 300 );
	}
};

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
	'selecting a block doesn’t open the panel; its toolbar has only the basics',
	async () => {
		await canvas.locator( `#block-${ para.id }` ).click();
		await wait( 500 );
		expect( ( await panel() ) === null, 'the panel opened by itself' );
		expect( ( await pressed() ) === 'false', 'the button is pressed' );
		const t = await toolbar();
		expect(
			KEPT.every( ( l ) => t.labels.includes( l ) ),
			`the toolbar has ${ t.labels.join( ', ' ) }`
		);
		expect(
			! MOVED.some( ( l ) => t.labels.includes( l ) ),
			`the toolbar still has ${ t.labels.join( ', ' ) }`
		);
		const x = await extras();
		const b = await blockBox( para.id );
		expect( x.name === 'Paragraph', `the name is ${ x.name }` );
		expect(
			x.mover && x.mover.right <= b.left && x.mover.right <= t.left,
			'the handle and movers aren’t left of the block'
		);
		expect( ! x.parentButton, 'the parent block’s button shows' );
		await shot( '00-basics' );
	}
);

await step(
	'the block’s name opens the blocks to turn it into, below it',
	async () => {
		const inButton = await page.evaluate(
			() =>
				!! document.querySelector(
					'.block-editor-block-switcher > button .nevelson-switcher-label'
				)
		);
		expect( inButton, 'the name isn’t in the block switcher' );
		await page.locator( '.nevelson-switcher-label' ).first().click();
		await wait( 600 );
		const r = await page.evaluate( () => {
			const m = document.querySelector(
				'.block-editor-block-switcher__popover'
			);
			const b = document
				.querySelector( '.block-editor-block-switcher > button' )
				.getBoundingClientRect();
			return (
				m && { top: m.getBoundingClientRect().top, bottom: b.bottom }
			);
		} );
		expect( r, 'no list of blocks' );
		expect(
			r.top >= r.bottom && r.top - r.bottom < 20,
			'it didn’t open below'
		);
		await shot( '00b-transform' );
		await page.keyboard.press( 'Escape' );
		await wait( 300 );
	}
);

await step( 'the pencil opens it, to the right of the block', async () => {
	await page.locator( BUTTON ).first().click();
	await wait( 400 );
	const p = await panel();
	const b = await blockBox( para.id );
	expect( p, 'no panel' );
	expect( ( await pressed() ) === 'true', 'the button isn’t pressed' );
	expect( p.side === 'right', `side is ${ p.side }` );
	expect( p.left > b.right, 'panel overlaps the block' );
	expect(
		Math.abs(
			p.top - ( await expectedTop( p, await withToolbar( para.id ) ) )
		) < 2,
		'panel is not level with the block'
	);
	expect( p.title === 'Paragraph', `panel shows ${ p.title }` );
	expect( ( await area() ) === null, 'the sidebar opened' );
	await shot( '01-beside' );
} );

await step( 'it stays open for the next block', async () => {
	await canvas.locator( `#block-${ paras[ 1 ].id }` ).click();
	await wait( 400 );
	expect( await panel(), 'it closed' );
	await canvas.locator( `#block-${ para.id }` ).click();
	await wait( 400 );
} );

await step(
	'with the panel open, its header is the block, and alignment is in panels',
	async () => {
		await select( para.id );
		await wait( 600 );
		const head = await page.evaluate( () => {
			const k = document.querySelector( '.nevelson-head .nevelson-kind' );
			return {
				name: k.querySelector( '.nevelson-kind-name' )?.textContent,
				icon: !! k.querySelector( '.block-editor-block-icon' ),
				title: k.getAttribute( 'title' ),
				card: [
					...document.querySelectorAll(
						'.nevelson-body .block-editor-block-card'
					),
				].some( ( c ) => c.offsetParent !== null ),
				optionsInPanel: !! [
					...document.querySelectorAll(
						'.nevelson-panel .block-editor-block-settings-menu, .nevelson-moved .block-editor-block-settings-menu'
					),
				].find( ( e ) => e.offsetParent !== null ),
				dropdownsInBand: [
					...document.querySelectorAll( '.nevelson-moved button' ),
				]
					.filter( ( e ) => e.offsetParent !== null )
					.map( ( e ) => e.getAttribute( 'aria-label' ) ),
			};
		} );
		expect( head.name === 'Paragraph', `the header says ${ head.name }` );
		expect( head.icon, 'no icon in the header' );
		expect(
			head.title?.startsWith( 'Start with the basic building block' ),
			`the header's title is ${ head.title }`
		);
		expect( ! head.card, 'the block card is still in the settings' );
		expect( ! head.optionsInPanel, 'the options menu is in the panel' );
		expect(
			! MOVED.some( ( l ) => head.dropdownsInBand.includes( l ) ),
			`alignment dropdowns are in the band: ${ head.dropdownsInBand.join( ', ' ) }`
		);
		await openTab( 'Styles' );
		await page
			.locator( '.nevelson-text-alignment button[aria-label="Center"]' )
			.click();
		await page
			.locator( '.nevelson-alignment button[aria-label="Wide width"]' )
			.click();
		await wait( 400 );
		const a = await page.evaluate(
			( id ) =>
				window.wp.data
					.select( 'core/block-editor' )
					.getBlockAttributes( id ),
			para.id
		);
		expect(
			a.align === 'wide' && a.style?.typography?.textAlign === 'center',
			`attributes are ${ JSON.stringify( a ) }`
		);
		await shot( '01b-alignment' );
		await page.keyboard.press( 'ControlOrMeta+z' );
		await page.keyboard.press( 'ControlOrMeta+z' );
		await wait( 300 );
		// While the panel's open, the toolbar by the block shows too, and
		// the panel doesn't cover it.
		const t = await toolbar();
		const p = await panel();
		expect( t && t.labels.length, 'the toolbar by the block is hidden' );
		expect(
			! (
				p.left < t.right &&
				p.right > t.left &&
				p.top < t.bottom &&
				p.bottom > t.top
			),
			'the panel covers the toolbar'
		);
		// A paragraph has no actions, so no Settings tab: no tabs at all.
		const tabCount = await page
			.locator( `${ PANEL } [role="tablist"] [role="tab"]` )
			.count();
		expect( tabCount === 0, `the paragraph has ${ tabCount } tabs` );
	}
);

await step( 'a setting in the panel changes the block', async () => {
	await openTab( 'Styles' );
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
	const b0 = await withToolbar( list.id );
	expect(
		Math.abs( before.top - ( await expectedTop( before, b0 ) ) ) < 2,
		'panel is not level with the list'
	);
	await page.mouse.move( 300, 500 );
	await page.mouse.wheel( 0, 200 );
	await wait( 500 );
	const after = await panel();
	const b1 = await withToolbar( list.id );
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
	await openTab( 'Styles' );
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

await step( 'pop-outs from the panel open to its side', async () => {
	await openTab( 'Styles' );
	await page
		.locator(
			`${ PANEL } .block-editor-tools-panel-color-gradient-settings__dropdown`
		)
		.first()
		.click();
	await wait( 500 );
	const r = await page.evaluate( () => {
		const pop = document.querySelector( '.nevelson-side-popover' );
		if ( ! pop ) {
			return 'no pop-out';
		}
		const card = document
			.querySelector( '.nevelson-panel' )
			.getBoundingClientRect();
		const b = pop.getBoundingClientRect();
		return b.right <= card.left || b.left >= card.right
			? true
			: 'over the panel';
	} );
	expect( r === true, String( r ) );
	await page.keyboard.press( 'Escape' );
	await wait( 300 );
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
	await page.locator( `${ PANEL } button[aria-label="Close"]` ).click();
	await wait( 400 );
	const x = await extras();
	const t = await toolbar();
	expect(
		x.mover && x.mover.left >= t.left - 1 && x.mover.right <= t.right + 1,
		'with no room left of the block, the movers aren’t in the toolbar'
	);
	expect( x.name === 'Cover', `the name is ${ x.name }` );
	await page.locator( BUTTON ).first().click();
	await wait( 400 );
	expect( p.right <= b.right, 'panel is off the canvas' );
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
	await canvas.locator( `#block-${ paras[ 1 ].id }` ).click();
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

await step(
	'an image’s other tools are a list of settings, each with its name',
	async () => {
		await openTab( 'Settings' );
		await wait( 300 );
		const r = await page.evaluate( () => {
			const band = document
				.querySelector( '.nevelson-panel .nevelson-actions-slot' )
				.getBoundingClientRect();
			const rows = [
				...document.querySelectorAll( '.nevelson-moved button' ),
			].filter( ( b ) => b.offsetParent !== null );
			return {
				names: rows.map(
					( b ) => b.dataset.nevelsonLabel || b.textContent.trim()
				),
				fullWidth: rows.every(
					( b ) => b.getBoundingClientRect().width > band.width - 30
				),
				parent: rows.some( ( b ) =>
					b.closest( '.block-editor-block-parent-selector' )
				),
			};
		} );
		expect(
			[ 'Link', 'Add caption', 'Replace' ].every( ( n ) =>
				r.names.includes( n )
			),
			`the list has ${ r.names.join( ', ' ) }`
		);
		expect( r.fullWidth, 'the tools aren’t rows as wide as the panel' );
		const tabs = await page.evaluate( () =>
			[
				...document.querySelectorAll(
					'.nevelson-body .nevelson-tab-label'
				),
			].map( ( l ) => l.textContent )
		);
		expect(
			[ 'Content', 'Settings', 'Styles' ].every( ( t ) =>
				tabs.includes( t )
			),
			`the tabs say ${ tabs.join( ', ' ) }`
		);
		const width = await page.evaluate(
			() => document.querySelector( '.nevelson-panel' ).offsetWidth
		);
		expect(
			width === 360,
			`with three tabs, the panel is ${ width } wide`
		);
		await openTab( 'Styles' );
		expect(
			( await page.locator( `${ PANEL } .nevelson-alignment` ).count() ) >
				0,
			'Alignment isn’t with the styles'
		);
		await openTab( 'Settings' );
		expect( ! r.parent, 'the parent block’s button is in the list' );
		await shot( '05b-image-tools' );
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

await step( 'closed, it stays closed until the button opens it', async () => {
	await select( para.id );
	await wait( 300 );
	await page.locator( `${ PANEL } button[aria-label="Close"]` ).click();
	await wait( 300 );
	expect( ( await panel() ) === null, 'still there' );
	const t = await toolbar();
	const b = await blockBox( para.id );
	expect(
		t && ( t.bottom <= b.top + 1 || t.top >= b.bottom - 1 ),
		'the toolbar isn’t back by the block'
	);
	expect(
		! MOVED.some( ( l ) => t.labels.includes( l ) ),
		`by the block: ${ t.labels.join( ', ' ) }`
	);
	await canvas.locator( `#block-${ paras[ 1 ].id }` ).click();
	await wait( 400 );
	expect( ( await panel() ) === null, 'it came back by itself' );
	await page.locator( BUTTON ).first().click();
	await wait( 400 );
	expect( await panel(), 'the button didn’t open it' );
	await page.locator( `${ PANEL } button[aria-label="Close"]` ).click();
	await wait( 400 );
	expect( ( await panel() ) === null, 'Close didn’t close it' );
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
