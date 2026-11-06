/* eslint-disable no-console */
/**
 * End-to-end smoke test: drives the real site editor in a headless Chromium
 * with WebMCP turned on, calling Lowry's tools the way an agent in the
 * browser does (`document.modelContext.getTools()` and `executeTool()`), then
 * the panel's agent against a scripted stand-in for the Anthropic API.
 *
 * Needs a WordPress 7.0 or later site with the plugin active, Twenty
 * Twenty-Five and automatic login, which WordPress Playground gives you:
 *
 *   npx @wp-playground/cli server --login --port=9400 \
 *     --mount=.:/wordpress/wp-content/plugins/lowry \
 *     --blueprint=e2e/blueprint.json
 *   npm run test:e2e
 *
 * Set LOWRY_BASE_URL to use another site, LOWRY_SHOTS to a folder to keep
 * screenshots, LOWRY_CHROME to use a particular Chrome or Chromium, and
 * LOWRY_NO_WEBMCP to run without WebMCP (the panel's agent still works).
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = ( process.env.LOWRY_BASE_URL || 'http://127.0.0.1:9400' ).replace(
	/\/$/,
	''
);
const SHOTS = process.env.LOWRY_SHOTS;
const NATIVE = ! process.env.LOWRY_NO_WEBMCP;
if ( SHOTS ) {
	mkdirSync( SHOTS, { recursive: true } );
}

const browser = await chromium.launch( {
	...( process.env.LOWRY_CHROME
		? { executablePath: process.env.LOWRY_CHROME }
		: {} ),
	args: NATIVE ? [ '--enable-features=WebMCP' ] : [],
} );
const page = await browser.newPage( {
	viewport: { width: 1440, height: 900 },
} );
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

// Calls a tool as an agent would: through WebMCP when it's on, else Lowry's
// own list. Results come back as text, errors as "Error: …".
const call = ( name, input = {} ) =>
	page.evaluate(
		async ( [ n, i ] ) => {
			const mc = document.modelContext;
			if ( mc ) {
				const tool = ( await mc.getTools() ).find(
					( t ) => t.name === n
				);
				if ( ! tool ) {
					return `NO TOOL ${ n }`;
				}
				return mc.executeTool( tool, i );
			}
			try {
				const r = await window.lowry.run( n, i );
				return typeof r === 'string' ? r : JSON.stringify( r );
			} catch ( e ) {
				return `Error: ${ e.message }`;
			}
		},
		[ name, input ]
	);
const json = async ( name, input ) => {
	const text = await call( name, input );
	try {
		return JSON.parse( text );
	} catch {
		throw new Error( `${ name } said: ${ text }` );
	}
};
const toolNames = () =>
	page.evaluate( async () =>
		document.modelContext
			? ( await document.modelContext.getTools() ).map( ( t ) => t.name )
			: window.lowry.tools()
	);
const allValid = () =>
	page.evaluate( () => {
		const flat = ( b ) => [ b, ...b.innerBlocks.flatMap( flat ) ];
		return window.wp.data
			.select( 'core/block-editor' )
			.getBlocks()
			.flatMap( flat )
			.every( ( b ) => b.isValid !== false );
	} );

console.log( `Lowry smoke test, ${ NATIVE ? 'with' : 'without' } WebMCP` );

await page.goto( `${ BASE }/wp-admin/?lowry-sample`, {
	waitUntil: 'domcontentloaded',
	timeout: 120000,
} );
await page.waitForFunction(
	() =>
		window.lowry &&
		window.wp.data.select( 'core/block-editor' ).getBlockCount( '' ) > 0,
	null,
	{ timeout: 120000 }
);
// The server's abilities arrive once they're fetched.
await page
	.waitForFunction(
		() => window.lowry.tools().includes( 'core_get_site_info' ),
		null,
		{ timeout: 15000 }
	)
	.catch( () => {} );

let tree;
let heading;

await step( 'offers the editor tools to WebMCP', async () => {
	const native = await page.evaluate( () => window.lowry.native() );
	expect(
		NATIVE ? native === 'document.modelContext' : native === null,
		`native is ${ native }`
	);
	const names = await toolNames();
	[
		'get_editor_context',
		'get_block_tree',
		'update_block',
		'insert_pattern',
		'set_site_style',
	].forEach( ( n ) => expect( names.includes( n ), `no ${ n }` ) );
	expect(
		! names.some( ( n ) => n.includes( 'selected' ) ),
		'selected-block tools with nothing selected'
	);
} );

await step( "offers WordPress' own abilities too", async () => {
	expect(
		( await page.evaluate( () => window.lowry.mode() ) ) === 'abilities',
		'not using the Abilities API'
	);
	const info = await json( 'core_get_site_info' );
	expect( info.url && info.version, 'no site info' );
} );

await step( 'outlines the page, with locked sections marked', async () => {
	tree = ( await json( 'get_block_tree', { depth: 3 } ) ).blocks;
	expect( tree.length === 4, `${ tree.length } sections` );
	expect(
		tree.every( ( s ) => s.layoutLocked ),
		'sections not locked'
	);
	heading = tree[ 1 ].children.find( ( c ) => c.block === 'heading' );
	expect( heading?.text === 'Our services', 'no services heading' );
} );

await step( 'selecting a block offers tools made for it', async () => {
	await page.evaluate( () => {
		window.__changes = 0;
		document.modelContext?.addEventListener(
			'toolchange',
			() => window.__changes++
		);
	} );
	await call( 'select_block', { clientId: heading.id } );
	await page.waitForTimeout( 300 );
	const names = await toolNames();
	expect(
		names.includes( 'edit_selected_block' ) &&
			names.includes( 'style_selected_block' ),
		'no selected-block tools'
	);
	const schema = await page.evaluate(
		() => window.lowry.tool( 'edit_selected_block' ).inputSchema
	);
	expect(
		schema.properties.content && schema.properties.level,
		'not a heading schema'
	);
	expect(
		! ( 'default' in schema.properties.level ),
		'schema has a default an agent would fill in'
	);
	if ( NATIVE ) {
		expect(
			( await page.evaluate( () => window.__changes ) ) > 0,
			'no toolchange'
		);
	}
} );

await step( 'edits content without opening the section', async () => {
	const r = await json( 'edit_selected_block', {
		content: 'What we <em>make</em>',
	} );
	expect(
		r.changed.join() === 'content' && ! r.openedSection,
		JSON.stringify( r )
	);
	const level = await page.evaluate(
		( id ) =>
			window.wp.data
				.select( 'core/block-editor' )
				.getBlockAttributes( id ).level,
		heading.id
	);
	expect( level === 2, `level is ${ level }` );
} );

await step(
	'changing design opens the section, as Edit section does',
	async () => {
		const r = await json( 'style_selected_block', {
			textColor: 'accent-3',
			fontSize: 'x-large',
		} );
		expect( r.openedSection?.id === tree[ 1 ].id, JSON.stringify( r ) );
		const a = await page.evaluate(
			( id ) =>
				window.wp.data
					.select( 'core/block-editor' )
					.getBlockAttributes( id ),
			heading.id
		);
		expect(
			a.textColor === 'accent-3' && a.fontSize === 'x-large',
			JSON.stringify( a )
		);
	}
);

await step( 'says why a bad input was refused', async () => {
	const text = await call( 'style_selected_block', { textColor: 'hotpink' } );
	expect( /^Error: .*accent-1/.test( text ), text );
} );

await step( 'a new kind of block gets new tools', async () => {
	const para = tree[ 1 ].children
		.flatMap( ( c ) => [ c, ...( c.children || [] ) ] )
		.find( ( c ) => c.block === 'paragraph' );
	const first = await page.evaluate(
		() => window.lowry.tool( 'edit_selected_block' ).title
	);
	await call( 'select_block', {
		clientId:
			para?.id ||
			( await page.evaluate(
				() =>
					window.wp.data
						.select( 'core/block-editor' )
						.getBlocksByName( 'core/paragraph' )[ 0 ]
			) ),
	} );
	await page.waitForTimeout( 300 );
	const next = await page.evaluate(
		() => window.lowry.tool( 'edit_selected_block' ).title
	);
	expect(
		first.includes( 'Heading' ) && next.includes( 'Paragraph' ),
		`${ first } → ${ next }`
	);
} );

await step(
	'adds a pattern and blocks at the end, leaving the open section',
	async () => {
		const found = await json( 'search_patterns', {
			search: 'testimonial',
			limit: 1,
		} );
		const r = await json( 'insert_pattern', {
			name: found.patterns[ 0 ].name,
		} );
		expect( r.added.length === 1, JSON.stringify( r ) );
		const b = await json( 'insert_blocks', {
			blocks: [
				{
					name: 'core/heading',
					attributes: { content: 'Visit us', level: 2 },
				},
			],
		} );
		const order = await page.evaluate( () =>
			window.wp.data.select( 'core/block-editor' ).getBlockOrder( '' )
		);
		expect(
			order[ order.length - 1 ] === b.added[ 0 ].id &&
				order[ order.length - 2 ] === r.added[ 0 ].id,
			'not at the end'
		);
	}
);

await step( 'moves, duplicates, transforms and removes', async () => {
	const order = () =>
		page.evaluate( () =>
			window.wp.data.select( 'core/block-editor' ).getBlockOrder( '' )
		);
	const before = await order();
	const last = before[ before.length - 1 ];
	await json( 'move_blocks', {
		clientIds: [ last ],
		relativeTo: before[ 0 ],
		where: 'after',
	} );
	expect( ( await order() )[ 1 ] === last, 'not moved' );
	const dup = await json( 'duplicate_block', { clientId: last } );
	expect( ( await order() )[ 2 ] === dup.copy.id, 'not duplicated' );
	const t = await json( 'transform_block', {
		clientId: dup.copy.id,
		to: 'core/paragraph',
	} );
	expect( t.now[ 0 ].block === 'paragraph', JSON.stringify( t ) );
	const r = await json( 'remove_blocks', { clientIds: [ t.now[ 0 ].id ] } );
	expect( r.removed.length === 1, 'not removed' );
	expect( ( await order() ).length === before.length, 'count changed' );
	expect( await allValid(), 'invalid blocks' );
} );

await step( "changes the site's styles, unsaved", async () => {
	await json( 'set_site_style', {
		path: 'elements.h2.typography.fontSize',
		value: 'font-size:x-large',
	} );
	await json( 'set_palette_color', { slug: 'accent-1', color: '#c2410c' } );
	const unsaved = ( await json( 'get_unsaved_changes' ) ).unsaved.map(
		( u ) => u.kind
	);
	expect(
		unsaved.includes( 'globalStyles' ) && unsaved.includes( 'page' ),
		unsaved.join()
	);
} );

await step( 'undo takes a change back', async () => {
	const before = await page.evaluate( () =>
		window.wp.data.select( 'core/block-editor' ).getBlockOrder( '' )
	);
	await json( 'insert_blocks', {
		blocks: [ { name: 'core/paragraph', attributes: { content: 'x' } } ],
	} );
	await call( 'undo' );
	const after = await page.evaluate( () =>
		window.wp.data.select( 'core/block-editor' ).getBlockOrder( '' )
	);
	expect(
		after.length === before.length,
		`${ before.length } → ${ after.length }`
	);
} );

// ---------- The panel ----------

// A stand-in for the API: looks at the page, selects the services heading,
// restyles it with the tool made for it, and says what it did. It records the
// tools it was offered each turn.
const offered = [];
await page.route( 'https://api.anthropic.com/v1/messages', async ( route ) => {
	const body = JSON.parse( route.request().postData() );
	const tools = body.tools.map( ( t ) => t.name );
	offered.push( tools );
	const results = body.messages
		.flatMap( ( m ) => ( Array.isArray( m.content ) ? m.content : [] ) )
		.filter( ( c ) => c.type === 'tool_result' );
	const turn = results.length;
	const use = ( name, input ) => ( {
		stop_reason: 'tool_use',
		content: [
			{ type: 'text', text: '' },
			{ type: 'tool_use', id: `t${ turn }`, name, input },
		],
	} );
	let reply;
	if ( turn === 0 ) {
		reply = use( 'get_block_tree', { depth: 3 } );
	} else if ( turn === 1 ) {
		const blocks = JSON.parse( results[ 0 ].content ).blocks;
		// The services heading, renamed earlier in this test.
		const h = blocks
			.flatMap( ( b ) => b.children || [] )
			.find(
				( c ) => c.block === 'heading' && c.text === 'What we make'
			);
		reply = use( 'select_block', { clientId: h?.id || 'missing' } );
	} else if ( turn === 2 ) {
		reply = use( 'style_selected_block', {
			fontSize: 'xx-large',
			textColor: 'contrast',
		} );
	} else {
		reply = {
			stop_reason: 'end_turn',
			content: [
				{
					type: 'text',
					text: 'Made the services heading bigger and darker, so it stands out. It isn’t saved yet.',
				},
			],
		};
	}
	await route.fulfill( {
		status: 200,
		contentType: 'application/json',
		body: JSON.stringify( { id: 'msg', role: 'assistant', ...reply } ),
	} );
} );

await step( 'opens the Agent panel', async () => {
	await page.evaluate( () =>
		window.wp.data.dispatch( 'core/block-editor' ).clearSelectedBlock()
	);
	// ?lowry-sample opens it.
	await page.locator( '.lowry-panel' ).waitFor( { timeout: 10000 } );
	await page.getByText( 'Anthropic API key' ).waitFor( { timeout: 10000 } );
	await page.getByLabel( 'Anthropic API key' ).fill( 'sk-test' );
	await page
		.getByRole( 'button', { name: 'Save', exact: true } )
		.last()
		.click();
	await page.getByText( 'Ask for a change' ).waitFor();
	await shot( '01-panel' );
} );

await step( "the panel's agent changes the page", async () => {
	await page
		.locator( '.lowry-compose textarea' )
		.fill( 'Make the services heading stand out' );
	await page
		.locator( '.lowry-compose' )
		.getByRole( 'button', { name: 'Send' } )
		.click();
	await page.getByText( /bigger and darker/ ).waitFor( { timeout: 20000 } );
	expect(
		! offered[ 0 ].includes( 'style_selected_block' ) &&
			offered[ 2 ].includes( 'style_selected_block' ),
		'the tools offered didn’t follow the selection'
	);
	const a = await page.evaluate( () => {
		const be = window.wp.data.select( 'core/block-editor' );
		return be.getBlockAttributes( be.getSelectedBlockClientId() );
	} );
	expect(
		a.fontSize === 'xx-large' && a.textColor === 'contrast',
		JSON.stringify( a )
	);
	await page.waitForTimeout( 300 );
	await shot( '02-asked' );
} );

await step( 'lists the tools, made for the selection', async () => {
	await page.getByRole( 'tab', { name: /^Tools/ } ).click();
	await page.getByText( 'made for Heading' ).waitFor();
	await page
		.locator( '.lowry-tool__head', { hasText: 'style_selected_block' } )
		.click();
	await shot( '03-tools' );
} );

await step( 'logs every call, whoever made it', async () => {
	await page.getByRole( 'tab', { name: 'Activity' } ).click();
	const badges = await page.locator( '.lowry-badge' ).allInnerTexts();
	expect( badges.includes( 'Panel agent' ), 'no agent calls' );
	expect(
		badges.includes( NATIVE ? 'Browser agent' : 'You' ),
		'no WebMCP calls'
	);
	await shot( '04-activity' );
} );

await step( 'no errors on the page', async () => {
	expect( ! pageErrors.length, pageErrors.join( ' | ' ) );
	expect( await allValid(), 'invalid blocks' );
} );

await browser.close();
console.log( failures ? `\n${ failures } failed` : '\nAll passed' );
process.exit( failures ? 1 : 0 );
