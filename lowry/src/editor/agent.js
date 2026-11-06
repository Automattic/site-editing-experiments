/**
 * A small agent in the panel, for trying the tools without an agent in the
 * browser: it sends what you ask to Claude with the tools on offer right now,
 * runs the tools it calls through the same WebMCP layer, and repeats until
 * it's done. The tool list is read afresh every turn, so when it selects a
 * block the selected-block tools it gets next are made for that block.
 *
 * It calls the Anthropic API straight from the browser with your own key,
 * kept in this browser's local storage. That's fine for a prototype on your
 * own machine; a real one would go through the site's server.
 */
import * as webmcp from './webmcp';

const API = 'https://api.anthropic.com/v1/messages';
export const DEFAULT_MODEL = 'claude-sonnet-5-5';
const MAX_TURNS = 24;

const SYSTEM = `You're helping someone edit their WordPress site in the site editor. You work through the editor's tools, which change the page live on their canvas while they watch, the same way their own clicks would.

- Start with get_editor_context. "This", "here" and "it" usually mean the selected block.
- Prefer small, precise changes, and change blocks rather than replacing whole sections.
- The selected-block tools (edit_selected_block, style_selected_block, transform_selected_block) are made for whatever's selected, with exact schemas. Select a block with select_block to get them for it. After selecting, the tool list changes on your next turn.
- Use the theme's presets for colour, size and spacing, so the page stays in keeping with the site.
- If what they mean is unclear, point_at_blocks to show what you think they mean, and ask.
- Nothing is saved until they save. Never say a change is saved or published. Every change can be undone.
- Blocks marked template: true belong to the template (header, footer); say so rather than trying to change them.
- Reply briefly, in plain words, about what changed on the page. Don't mention tool names or block ids.`;

export function getSettings() {
	try {
		return {
			apiKey: window.localStorage.getItem( 'lowry-api-key' ) || '',
			model:
				window.localStorage.getItem( 'lowry-model' ) || DEFAULT_MODEL,
		};
	} catch {
		return { apiKey: '', model: DEFAULT_MODEL };
	}
}

export function saveSettings( { apiKey, model } ) {
	try {
		if ( apiKey !== undefined ) {
			window.localStorage.setItem( 'lowry-api-key', apiKey );
		}
		if ( model !== undefined ) {
			window.localStorage.setItem( 'lowry-model', model );
		}
	} catch {}
}

function toolsForModel() {
	return webmcp.getTools().map( ( t ) => ( {
		name: t.name,
		description: t.description,
		input_schema:
			t.inputSchema?.type === 'object'
				? t.inputSchema
				: { type: 'object', properties: {} },
	} ) );
}

async function call( { apiKey, model, messages, signal } ) {
	const response = await window.fetch( API, {
		method: 'POST',
		signal,
		headers: {
			'content-type': 'application/json',
			'x-api-key': apiKey,
			'anthropic-version': '2023-06-01',
			'anthropic-dangerous-direct-browser-access': 'true',
		},
		body: JSON.stringify( {
			model,
			max_tokens: 2048,
			system: SYSTEM,
			tools: toolsForModel(),
			messages,
		} ),
	} );
	const data = await response.json().catch( () => ( {} ) );
	if ( ! response.ok ) {
		throw new Error(
			data?.error?.message || `The API said ${ response.status }.`
		);
	}
	return data;
}

/**
 * Asks the agent, running tools until it answers.
 *
 * @param {Object[]}    messages       The conversation so far, in the API's
 *                                     shape, ending with the person's message.
 * @param {Function}    onUpdate       Called with each new message.
 * @param {Object}      options        How to call the API.
 * @param {string}      options.apiKey An Anthropic API key.
 * @param {string}      options.model  The model.
 * @param {AbortSignal} options.signal Stops it.
 * @return {Promise<Object[]>} The conversation, with the agent's turns.
 */
export async function ask( messages, onUpdate, { apiKey, model, signal } ) {
	let convo = [ ...messages ];
	for ( let turn = 0; turn < MAX_TURNS; turn++ ) {
		const data = await call( { apiKey, model, messages: convo, signal } );
		const assistant = { role: 'assistant', content: data.content };
		convo = [ ...convo, assistant ];
		onUpdate( convo );
		const uses = data.content.filter( ( c ) => c.type === 'tool_use' );
		if ( data.stop_reason !== 'tool_use' || ! uses.length ) {
			return convo;
		}
		const results = [];
		for ( const use of uses ) {
			if ( signal?.aborted ) {
				throw new DOMException( 'Stopped', 'AbortError' );
			}
			try {
				const result = await webmcp.run( use.name, use.input, 'agent' );
				results.push( {
					type: 'tool_result',
					tool_use_id: use.id,
					content: webmcp.asText( result ),
				} );
			} catch ( error ) {
				results.push( {
					type: 'tool_result',
					tool_use_id: use.id,
					content: error?.message || String( error ),
					is_error: true,
				} );
			}
			// Let the editor re-render, and the selection tools catch up.
			await new Promise( ( r ) => setTimeout( r, 60 ) );
		}
		convo = [ ...convo, { role: 'user', content: results } ];
		onUpdate( convo );
	}
	return convo;
}
