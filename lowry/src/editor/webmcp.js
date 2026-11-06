/**
 * The WebMCP layer: offers tools to the browser's agent through
 * `document.modelContext` (or the older `navigator.modelContext`) when the
 * browser has it, and always keeps its own list, so Lowry's panel and its
 * built-in agent can call the same tools in any browser.
 *
 * Every call goes through `run()`, whoever makes it, so the activity log sees
 * an agent in the browser, the panel's agent and you alike.
 */
import { log } from './activity';

export function nativeModelContext() {
	if ( typeof document !== 'undefined' && document.modelContext ) {
		return { api: document.modelContext, where: 'document.modelContext' };
	}
	if ( typeof navigator !== 'undefined' && navigator.modelContext ) {
		return { api: navigator.modelContext, where: 'navigator.modelContext' };
	}
	return null;
}

const tools = new Map(); // name → { tool, controller }
const events = new EventTarget();
let native = null;

export function init() {
	native = nativeModelContext();
	return native;
}

export function isNative() {
	return !! native;
}

export function nativeWhere() {
	return native?.where || null;
}

export function onToolChange( fn ) {
	events.addEventListener( 'toolchange', fn );
	return () => events.removeEventListener( 'toolchange', fn );
}

let changeQueued = false;
function changed() {
	if ( changeQueued ) {
		return;
	}
	changeQueued = true;
	queueMicrotask( () => {
		changeQueued = false;
		events.dispatchEvent( new Event( 'toolchange' ) );
	} );
}

/**
 * A tool's result as text for the model: strings as they are, everything
 * else as JSON.
 *
 * @param {*} value The result.
 * @return {string} The text.
 */
export function asText( value ) {
	if ( value === undefined ) {
		return 'Done.';
	}
	return typeof value === 'string' ? value : JSON.stringify( value );
}

/**
 * Calls a tool, logging it, and returns its result. Errors are logged and
 * thrown.
 *
 * @param {string} name   The tool's name.
 * @param {Object} input  Its input.
 * @param {string} source Who's calling: 'browser', 'agent' or 'you'.
 * @return {Promise<*>} The tool's result.
 */
export async function run( name, input = {}, source = 'you' ) {
	const entry = tools.get( name );
	if ( ! entry ) {
		throw new Error(
			`There's no tool called ${ name } right now. Tools change with the selection: call get_editor_context to see what's selected.`
		);
	}
	const started = Date.now();
	try {
		const result = await entry.tool.run( input || {} );
		log( { name, input, source, result, ms: Date.now() - started } );
		return result;
	} catch ( error ) {
		log( {
			name,
			input,
			source,
			error: error?.message || String( error ),
			ms: Date.now() - started,
		} );
		throw error;
	}
}

/**
 * Offers a tool. `tool` is `{ name, title, description, inputSchema,
 * readOnly, destructive, group, run( input ) }`.
 *
 * @param {Object} tool The tool.
 */
export function addTool( tool ) {
	removeTool( tool.name );
	const entry = { tool, controller: null };
	tools.set( tool.name, entry );
	if ( native ) {
		const controller = new AbortController();
		entry.controller = controller;
		try {
			const registered = native.api.registerTool(
				{
					name: tool.name,
					title: tool.title,
					description: tool.description,
					inputSchema: tool.inputSchema,
					annotations: {
						readOnlyHint: !! tool.readOnly,
						destructiveHint: !! tool.destructive,
						untrustedContentHint: !! tool.readOnly,
					},
					// Chrome replaces a thrown error with "Tool execution
					// failed", so the agent couldn't learn from it: say what
					// went wrong instead.
					execute: async ( input ) => {
						try {
							return asText(
								await run( tool.name, input, 'browser' )
							);
						} catch ( error ) {
							return `Error: ${ error?.message || error }`;
						}
					},
				},
				{ signal: controller.signal }
			);
			// Some builds return a promise that rejects when it's taken away.
			registered?.catch?.( () => {} );
		} catch ( error ) {
			// eslint-disable-next-line no-console
			console.warn( `Lowry: couldn't offer ${ tool.name }`, error );
		}
	}
	changed();
}

export function removeTool( name ) {
	const entry = tools.get( name );
	if ( ! entry ) {
		return;
	}
	tools.delete( name );
	if ( native ) {
		entry.controller?.abort( new DOMException( 'Replaced', 'AbortError' ) );
		// Earlier builds unregistered by name.
		try {
			native.api.unregisterTool?.( name );
		} catch {}
	}
	changed();
}

export function getTools() {
	return [ ...tools.values() ].map( ( e ) => e.tool );
}

export function getTool( name ) {
	return tools.get( name )?.tool;
}
