/**
 * Lowry: the site editor as WebMCP tools. An agent in the browser, or the
 * one in Lowry's panel, edits the page through the editor itself, so every
 * change is live on the canvas, can be undone, and isn't saved until you
 * save. The tools for the selected block are made from its block type and
 * change with the selection.
 */
import { registerPlugin } from '@wordpress/plugins';
import { dispatch, subscribe } from '@wordpress/data';
import { store as noticesStore } from '@wordpress/notices';
import { PluginSidebar, PluginSidebarMoreMenuItem } from '@wordpress/editor';

import * as webmcp from './webmcp';
import * as host from './host';
import * as activity from './activity';
import { editorTools } from './tools/editor';
import {
	SELECTION_TOOLS,
	selectionState,
	selectionTools,
} from './tools/selection';
import { Panel } from './panel';
import './style.scss';

const ICON = (
	<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
		<path d="M12 3.5 13.9 9l5.6 1.9-5.6 1.9L12 18.5l-1.9-5.7-5.6-1.9L10.1 9 12 3.5Zm6.5 11 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
	</svg>
);

let started = false;
let selectionKey = null;

function followSelection() {
	const state = selectionState();
	const key = state?.key || null;
	if ( key === selectionKey ) {
		return;
	}
	selectionKey = key;
	const tools = selectionTools( state );
	const keep = new Set( tools.map( ( t ) => t.name ) );
	host.undefine( SELECTION_TOOLS.filter( ( n ) => ! keep.has( n ) ) );
	host.define( tools );
}

async function start() {
	if ( started ) {
		return;
	}
	started = true;
	webmcp.init();
	await host.start();
	host.define( editorTools() );
	followSelection();
	let queued = false;
	subscribe( () => {
		if ( queued ) {
			return;
		}
		queued = true;
		window.requestAnimationFrame( () => {
			queued = false;
			followSelection();
		} );
	} );

	// When an agent in the browser changes something, say so.
	let last = 0;
	activity.subscribe( () => {
		const entries = activity.getEntries();
		const entry = entries[ entries.length - 1 ];
		if ( ! entry || entry.id === last ) {
			return;
		}
		last = entry.id;
		if (
			entry.source === 'browser' &&
			! webmcp.getTool( entry.name )?.readOnly
		) {
			dispatch( noticesStore ).createNotice(
				entry.error ? 'error' : 'info',
				`Agent: ${ webmcp.getTool( entry.name )?.title || entry.name }${ entry.error ? ` didn’t work: ${ entry.error }` : '' }`,
				{ type: 'snackbar', id: `lowry-${ entry.id }` }
			);
		}
	} );

	// For the console and tests.
	window.lowry = {
		tools: () => webmcp.getTools().map( ( t ) => t.name ),
		tool: webmcp.getTool,
		run: ( name, input ) => webmcp.run( name, input, 'you' ),
		activity: activity.getEntries,
		native: webmcp.nativeWhere,
		mode: host.getMode,
	};
	window.dispatchEvent( new Event( 'lowry-ready' ) );
}

// /wp-admin/?lowry-sample opens the panel, with ?lowry-panel.
function openPanelIfAsked() {
	if ( new URLSearchParams( window.location.search ).has( 'lowry-panel' ) ) {
		dispatch( 'core/interface' ).enableComplementaryArea(
			'core',
			'lowry/lowry'
		);
	}
}

function Lowry() {
	if ( ! started ) {
		start();
		window.setTimeout( openPanelIfAsked, 0 );
	}
	return (
		<>
			<PluginSidebarMoreMenuItem target="lowry" icon={ ICON }>
				Agent
			</PluginSidebarMoreMenuItem>
			<PluginSidebar name="lowry" title="Agent" icon={ ICON }>
				<Panel />
			</PluginSidebar>
		</>
	);
}

registerPlugin( 'lowry', { render: Lowry } );
