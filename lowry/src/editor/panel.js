/**
 * The Agent panel: ask the built-in agent, see and run the tools on offer
 * right now (which change with the selection), and the activity log of every
 * call, whoever made it.
 */
import {
	Button,
	ExternalLink,
	Notice,
	TextControl,
	TextareaControl,
} from '@wordpress/components';
import {
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from '@wordpress/element';

import * as activity from './activity';
import * as webmcp from './webmcp';
import { getMode } from './host';
import { mark } from './highlight';
import { ask, DEFAULT_MODEL, getSettings, saveSettings } from './agent';

const GROUPS = [ 'Selected block', 'Read', 'Show', 'Change', 'WordPress' ];
const SOURCES = { you: 'You', agent: 'Panel agent', browser: 'Browser agent' };

function useTools() {
	const [ tools, setTools ] = useState( webmcp.getTools );
	useEffect(
		() => webmcp.onToolChange( () => setTools( webmcp.getTools() ) ),
		[]
	);
	return tools;
}

function useActivity() {
	return useSyncExternalStore( activity.subscribe, activity.getEntries );
}

// Block ids in a tool's input, to show them again from the log.
function idsIn( input = {} ) {
	return [
		input.clientId,
		...( Array.isArray( input.clientIds ) ? input.clientIds : [] ),
		input.relativeTo,
	].filter( ( v ) => typeof v === 'string' );
}

function short( value, max = 160 ) {
	const text = typeof value === 'string' ? value : JSON.stringify( value );
	return text && text.length > max ? `${ text.slice( 0, max - 1 ) }…` : text;
}

// An input to start from: each required field, with an enum's first value.
function exampleInput( schema ) {
	const out = {};
	( schema?.required || [] ).forEach( ( key ) => {
		const p = schema.properties?.[ key ] || {};
		if ( p.enum ) {
			out[ key ] = p.enum.find( ( v ) => v !== 'default' ) ?? p.enum[ 0 ];
		} else if ( p.type === 'array' ) {
			out[ key ] = [];
		} else if ( p.type === 'object' ) {
			out[ key ] = {};
		} else {
			out[ key ] = '';
		}
	} );
	return JSON.stringify( out, null, 2 );
}

function Status( { tools } ) {
	const where = webmcp.nativeWhere();
	return (
		<div className="lowry-status">
			<p>
				<span className={ `lowry-dot ${ where ? 'is-on' : '' }` } />
				{ where ? (
					<>
						WebMCP is on in this browser: an agent in the browser
						can use these { tools.length } tools (
						<code>{ where }</code>).
					</>
				) : (
					<>
						This browser doesn&rsquo;t have WebMCP, so only this
						panel can use the { tools.length } tools.{ ' ' }
						<ExternalLink href="https://developer.chrome.com/docs/ai/webmcp">
							Turn it on in Chrome
						</ExternalLink>
					</>
				) }
			</p>
			<p className="lowry-muted">
				{ getMode() === 'abilities'
					? 'The tools are abilities, from the Abilities API, so other plugins’ abilities are here too.'
					: 'This WordPress has no Abilities API client, so the tools go to WebMCP directly.' }
			</p>
		</div>
	);
}

// ---------- Ask ----------

const SUGGESTIONS = [
	"What's on this page?",
	'Make the selected block stand out more',
	'Add a short testimonial after the first section',
	'Make the headings feel calmer, site-wide',
];

function toolTitle( name ) {
	return webmcp.getTool( name )?.title || name.replace( /_/g, ' ' );
}

function Transcript( { messages, busy } ) {
	const end = useRef();
	useEffect( () => {
		end.current?.scrollIntoView( { block: 'end' } );
	}, [ messages.length, busy ] );
	// Tool results, by the call they answer.
	const results = {};
	messages.forEach( ( m ) => {
		if ( Array.isArray( m.content ) ) {
			m.content
				.filter( ( c ) => c.type === 'tool_result' )
				.forEach( ( c ) => ( results[ c.tool_use_id ] = c ) );
		}
	} );
	return (
		<div className="lowry-transcript">
			{ messages.map( ( m, i ) => {
				if ( m.role === 'user' && typeof m.content === 'string' ) {
					return (
						<p key={ i } className="lowry-msg is-you">
							{ m.content }
						</p>
					);
				}
				if ( m.role !== 'assistant' ) {
					return null;
				}
				return m.content.map( ( c, j ) => {
					if ( c.type === 'text' && c.text.trim() ) {
						return (
							<p
								key={ `${ i }-${ j }` }
								className="lowry-msg is-agent"
							>
								{ c.text }
							</p>
						);
					}
					if ( c.type === 'tool_use' ) {
						const r = results[ c.id ];
						let state = 'is-done';
						if ( ! r ) {
							state = 'is-running';
						} else if ( r.is_error ) {
							state = 'is-error';
						}
						return (
							<button
								type="button"
								key={ c.id }
								className={ `lowry-call ${ state }` }
								onClick={ () => {
									const ids = idsIn( c.input );
									if ( ids.length ) {
										mark( ids, {
											label: toolTitle( c.name ),
										} );
									}
								} }
								title={
									r?.is_error
										? r.content
										: short( c.input, 400 )
								}
							>
								{ toolTitle( c.name ) }
								{ r?.is_error && (
									<span> — { short( r.content, 90 ) }</span>
								) }
							</button>
						);
					}
					return null;
				} );
			} ) }
			{ busy && <p className="lowry-msg is-thinking">Working on it…</p> }
			<div ref={ end } />
		</div>
	);
}

function Ask() {
	const [ settings, setSettings ] = useState( getSettings );
	const [ editingKey, setEditingKey ] = useState( ! getSettings().apiKey );
	const [ messages, setMessages ] = useState( [] );
	const [ text, setText ] = useState( '' );
	const [ busy, setBusy ] = useState( false );
	const [ error, setError ] = useState( null );
	const controller = useRef( null );

	const send = async ( value ) => {
		const prompt = ( value ?? text ).trim();
		if ( ! prompt || busy ) {
			return;
		}
		setText( '' );
		setError( null );
		setBusy( true );
		const next = [ ...messages, { role: 'user', content: prompt } ];
		setMessages( next );
		controller.current = new AbortController();
		try {
			const done = await ask( next, setMessages, {
				...settings,
				signal: controller.current.signal,
			} );
			setMessages( done );
		} catch ( e ) {
			if ( e?.name !== 'AbortError' ) {
				setError( e?.message || String( e ) );
			}
			// Keep the conversation valid for the next question: drop a
			// last turn whose tool calls have no results.
			setMessages( ( m ) => {
				const last = m[ m.length - 1 ];
				return last?.role === 'assistant' &&
					last.content.some( ( c ) => c.type === 'tool_use' )
					? m.slice( 0, -1 )
					: m;
			} );
		} finally {
			setBusy( false );
		}
	};

	if ( editingKey ) {
		return (
			<div className="lowry-key">
				<p>
					The panel&rsquo;s agent is Claude, called from this browser
					with your own API key. The key stays in this browser.
				</p>
				<TextControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					label="Anthropic API key"
					type="password"
					value={ settings.apiKey }
					onChange={ ( apiKey ) =>
						setSettings( { ...settings, apiKey } )
					}
				/>
				<TextControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					label="Model"
					value={ settings.model }
					placeholder={ DEFAULT_MODEL }
					onChange={ ( model ) =>
						setSettings( { ...settings, model } )
					}
				/>
				<Button
					variant="primary"
					disabled={ ! settings.apiKey }
					onClick={ () => {
						saveSettings( settings );
						setEditingKey( false );
					} }
				>
					Save
				</Button>
				<p className="lowry-muted">
					Or skip this and use an agent in the browser, or run the
					tools yourself in Tools.
				</p>
			</div>
		);
	}

	return (
		<div className="lowry-ask">
			{ messages.length ? (
				<Transcript messages={ messages } busy={ busy } />
			) : (
				<div className="lowry-suggest">
					<p className="lowry-muted">
						Ask for a change. It happens on the page as you watch,
						and nothing is saved until you save.
					</p>
					{ SUGGESTIONS.map( ( s ) => (
						<Button
							key={ s }
							variant="secondary"
							size="compact"
							onClick={ () => send( s ) }
						>
							{ s }
						</Button>
					) ) }
				</div>
			) }
			{ error && (
				<Notice
					status="error"
					isDismissible
					onRemove={ () => setError( null ) }
				>
					{ error }
				</Notice>
			) }
			<div className="lowry-compose">
				<TextareaControl
					__nextHasNoMarginBottom
					label="Ask"
					hideLabelFromVision
					rows={ 3 }
					value={ text }
					placeholder="Make this section feel calmer…"
					onChange={ setText }
					onKeyDown={ ( e ) => {
						if ( e.key === 'Enter' && ! e.shiftKey ) {
							e.preventDefault();
							send();
						}
					} }
				/>
				<div className="lowry-row">
					{ busy ? (
						<Button
							variant="secondary"
							onClick={ () => controller.current?.abort() }
						>
							Stop
						</Button>
					) : (
						<Button
							variant="primary"
							disabled={ ! text.trim() }
							onClick={ () => send() }
						>
							Send
						</Button>
					) }
					{ !! messages.length && ! busy && (
						<Button
							variant="tertiary"
							onClick={ () => setMessages( [] ) }
						>
							New conversation
						</Button>
					) }
					<Button
						variant="link"
						className="lowry-right"
						onClick={ () => setEditingKey( true ) }
					>
						Key
					</Button>
				</div>
			</div>
		</div>
	);
}

// ---------- Tools ----------

function ToolItem( { tool, fresh } ) {
	const [ open, setOpen ] = useState( false );
	const [ input, setInput ] = useState( () =>
		exampleInput( tool.inputSchema )
	);
	const [ result, setResult ] = useState( null );
	useEffect( () => {
		setInput( exampleInput( tool.inputSchema ) );
		setResult( null );
	}, [ tool ] );
	const runIt = async () => {
		let parsed;
		try {
			parsed = input.trim() ? JSON.parse( input ) : {};
		} catch {
			setResult( { error: 'That input isn’t valid JSON.' } );
			return;
		}
		try {
			setResult( { ok: await webmcp.run( tool.name, parsed, 'you' ) } );
		} catch ( e ) {
			setResult( { error: e?.message || String( e ) } );
		}
	};
	return (
		<li className={ `lowry-tool ${ fresh ? 'is-fresh' : '' }` }>
			<button
				type="button"
				className="lowry-tool__head"
				aria-expanded={ open }
				onClick={ () => setOpen( ! open ) }
			>
				<code>{ tool.name }</code>
				<span>{ tool.title }</span>
			</button>
			{ open && (
				<div className="lowry-tool__body">
					<p>{ tool.description }</p>
					<details>
						<summary>Input schema</summary>
						<pre>
							{ JSON.stringify( tool.inputSchema, null, 2 ) }
						</pre>
					</details>
					<TextareaControl
						__nextHasNoMarginBottom
						label="Input"
						className="lowry-mono"
						rows={ Math.min( 8, input.split( '\n' ).length + 1 ) }
						value={ input }
						onChange={ setInput }
					/>
					<Button
						variant="secondary"
						size="compact"
						onClick={ runIt }
					>
						Run
					</Button>
					{ result && (
						<pre className={ result.error ? 'is-error' : '' }>
							{ result.error ||
								JSON.stringify( result.ok, null, 2 ) }
						</pre>
					) }
				</div>
			) }
		</li>
	);
}

function Tools( { tools } ) {
	// Tools that just arrived, to show the list changing with the selection.
	const seen = useRef( new Map() );
	const [ fresh, setFresh ] = useState( new Set() );
	useEffect( () => {
		const now = new Set();
		tools.forEach( ( t ) => {
			if ( seen.current.size && seen.current.get( t.name ) !== t ) {
				now.add( t.name );
			}
		} );
		seen.current = new Map( tools.map( ( t ) => [ t.name, t ] ) );
		if ( now.size ) {
			setFresh( now );
			const timer = setTimeout( () => setFresh( new Set() ), 1600 );
			return () => clearTimeout( timer );
		}
	}, [ tools ] );
	const groups = useMemo( () => {
		const by = {};
		tools.forEach( ( t ) =>
			( by[ t.group || 'WordPress' ] ||= [] ).push( t )
		);
		return GROUPS.filter( ( g ) => by[ g ] ).map( ( g ) => [ g, by[ g ] ] );
	}, [ tools ] );
	const selected = tools.find( ( t ) => t.follows );
	return (
		<div className="lowry-tools">
			{ ! selected && (
				<p className="lowry-muted lowry-hint">
					Select a block for tools made for it.
				</p>
			) }
			{ groups.map( ( [ group, list ] ) => (
				<section key={ group }>
					<h3>
						{ group }
						{ group === 'Selected block' && selected && (
							<span className="lowry-muted">
								{ ' ' }
								· made for{ ' ' }
								{ selected.title
									.replace( /^.*selected /, '' )
									.replace( '…', '' ) }
							</span>
						) }
					</h3>
					<ul>
						{ list.map( ( t ) => (
							<ToolItem
								key={ t.name }
								tool={ t }
								fresh={ fresh.has( t.name ) }
							/>
						) ) }
					</ul>
				</section>
			) ) }
		</div>
	);
}

// ---------- Activity ----------

function Activity() {
	const entries = useActivity();
	if ( ! entries.length ) {
		return (
			<p className="lowry-muted lowry-hint">
				Every tool call shows here, from the panel&rsquo;s agent, an
				agent in the browser, or you.
			</p>
		);
	}
	return (
		<div className="lowry-activity">
			<Button
				variant="tertiary"
				size="compact"
				onClick={ activity.clear }
			>
				Clear
			</Button>
			<ol>
				{ [ ...entries ].reverse().map( ( e ) => {
					const ids = idsIn( e.input );
					return (
						<li
							key={ e.id }
							className={ e.error ? 'is-error' : '' }
						>
							<div className="lowry-activity__head">
								<span
									className={ `lowry-badge is-${ e.source }` }
								>
									{ SOURCES[ e.source ] || e.source }
								</span>
								<strong>{ toolTitle( e.name ) }</strong>
								<time>{ e.at.toLocaleTimeString() }</time>
							</div>
							{ e.input && Object.keys( e.input ).length > 0 && (
								<code>{ short( e.input ) }</code>
							) }
							<div className="lowry-activity__out">
								{ e.error
									? e.error
									: short( webmcp.asText( e.result ), 220 ) }
							</div>
							{ !! ids.length && (
								<Button
									variant="link"
									onClick={ () =>
										mark( ids, {
											label: toolTitle( e.name ),
										} )
									}
								>
									Show on the page
								</Button>
							) }
						</li>
					);
				} ) }
			</ol>
		</div>
	);
}

export function Panel() {
	const tools = useTools();
	const [ tab, setTab ] = useState( 'ask' );
	const tabs = [
		[ 'ask', 'Ask', <Ask key="ask" /> ],
		[
			'tools',
			`Tools (${ tools.length })`,
			<Tools key="tools" tools={ tools } />,
		],
		[ 'activity', 'Activity', <Activity key="activity" /> ],
	];
	// All three stay mounted, so a conversation survives looking at the tools.
	return (
		<div className="lowry-panel">
			<Status tools={ tools } />
			<div className="lowry-tabs" role="tablist">
				{ tabs.map( ( [ name, title ] ) => (
					<button
						key={ name }
						type="button"
						role="tab"
						aria-selected={ tab === name }
						className={ tab === name ? 'is-active' : '' }
						onClick={ () => setTab( name ) }
					>
						{ title }
					</button>
				) ) }
			</div>
			{ tabs.map( ( [ name, , content ] ) => (
				<div
					key={ name }
					role="tabpanel"
					hidden={ tab !== name }
					className="lowry-tabpanel"
				>
					{ content }
				</div>
			) ) }
		</div>
	);
}
