/**
 * Where tools are defined, and how they reach WebMCP.
 *
 * With the Abilities API's client (WordPress 7.0 and later), Lowry's tools are
 * registered as client-side abilities, and every ability on the client,
 * Lowry's and any other plugin's or WordPress' own, is offered to WebMCP: the
 * abilities are the one list, and WebMCP is one way to reach them. Without
 * the client, Lowry offers its tools to WebMCP directly.
 */
import * as webmcp from './webmcp';
import { abilityNameForTool, toolNameForAbility } from './schema';

const CATEGORY = 'site-editor';
let abilities = null; // The client's module, once it's here.
let mode = 'direct';
const own = new Map(); // tool name → tool definition

export function getMode() {
	return mode;
}

/**
 * Waits briefly for the abilities module to say whether the client is here.
 *
 * @param {number} ms How long to wait.
 * @return {Promise<Object|null>} The client, or null.
 */
function waitForAbilities( ms = 4000 ) {
	return new Promise( ( resolve ) => {
		const take = ( detail ) => resolve( detail?.available ? detail : null );
		if ( window.lowryAbilities ) {
			take( window.lowryAbilities );
			return;
		}
		const timer = setTimeout( () => resolve( null ), ms );
		window.addEventListener(
			'lowry-abilities',
			( e ) => {
				clearTimeout( timer );
				take( e.detail );
			},
			{ once: true }
		);
	} );
}

function toAbility( tool ) {
	return {
		name: abilityNameForTool( tool.name ),
		label: tool.title,
		description: tool.description,
		category: CATEGORY,
		input_schema: tool.inputSchema,
		callback: ( input ) => tool.run( input || {} ),
		meta: {
			annotations: {
				readonly: !! tool.readOnly,
				destructive: !! tool.destructive,
			},
			lowry: { group: tool.group, follows: tool.follows },
		},
	};
}

/**
 * Offers every ability on the client to WebMCP, and takes away any that's
 * gone. Lowry's own keep their group; everything else is "WordPress".
 */
function sync() {
	const api = abilities.abilities;
	const list = api.getAbilities();
	const wanted = new Map();
	list.forEach( ( ability ) => {
		const name = toolNameForAbility( ability.name );
		const lowry = ability.meta?.lowry || own.get( name );
		wanted.set( name, {
			name,
			title: ability.label,
			description: ability.description,
			inputSchema: ability.input_schema || {
				type: 'object',
				properties: {},
			},
			readOnly: !! ability.meta?.annotations?.readonly,
			destructive: !! ability.meta?.annotations?.destructive,
			group: lowry?.group || 'WordPress',
			follows: lowry?.follows,
			ability: ability.name,
			run: ( input ) => api.executeAbility( ability.name, input || {} ),
		} );
	} );
	webmcp.getTools().forEach( ( tool ) => {
		if ( ! wanted.has( tool.name ) ) {
			webmcp.removeTool( tool.name );
		}
	} );
	wanted.forEach( ( tool, name ) => {
		const had = webmcp.getTool( name );
		// Selection tools are new objects each time, with new schemas.
		if (
			! had ||
			had.ability !== tool.ability ||
			had.description !== tool.description ||
			tool.follows
		) {
			webmcp.addTool( tool );
		}
	} );
}

export async function start() {
	const client = await waitForAbilities();
	if ( client ) {
		try {
			const api = client.abilities;
			if ( ! api.getAbilityCategory( CATEGORY ) ) {
				api.registerAbilityCategory( CATEGORY, {
					label: 'Site editor',
					description:
						'Read and change what is open in the site editor.',
				} );
			}
			abilities = client;
			mode = 'abilities';
		} catch ( error ) {
			// eslint-disable-next-line no-console
			console.warn( 'Lowry: using WebMCP directly', error );
		}
	}
	if ( abilities ) {
		// The server's abilities arrive once they've been fetched.
		Promise.resolve( abilities.ready )
			.catch( () => {} )
			.then( () => sync() );
	}
	return mode;
}

/**
 * Defines tools, replacing any with the same name.
 *
 * @param {Object[]} tools Tool definitions.
 */
export function define( tools ) {
	tools.forEach( ( tool ) => {
		own.set( tool.name, tool );
		if ( mode === 'abilities' ) {
			const api = abilities.abilities;
			const name = abilityNameForTool( tool.name );
			if ( api.getAbility( name ) ) {
				api.unregisterAbility( name );
			}
			api.registerAbility( toAbility( tool ) );
		} else {
			webmcp.addTool( tool );
		}
	} );
	if ( mode === 'abilities' ) {
		sync();
	}
}

export function undefine( names ) {
	names.forEach( ( name ) => {
		if ( ! own.has( name ) ) {
			return;
		}
		own.delete( name );
		if ( mode === 'abilities' ) {
			const ability = abilityNameForTool( name );
			if ( abilities.abilities.getAbility( ability ) ) {
				abilities.abilities.unregisterAbility( ability );
			}
		} else {
			webmcp.removeTool( name );
		}
	} );
	if ( mode === 'abilities' ) {
		sync();
	}
}
