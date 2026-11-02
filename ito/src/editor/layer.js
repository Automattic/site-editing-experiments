/**
 * The section overlay, drawn in the editor canvas over the page.
 *
 * Hover a section for its outline, its name and Edit layout. Edit layout
 * opens a panel of the other patterns with the same content blocks, each
 * previewed with the section's own words and pictures. Picking one swaps the
 * section for it; Reset puts back the section as it was when the panel
 * opened, and Done (or a click elsewhere) closes the panel.
 *
 * The page's blocks stay editable as usual: the overlay only takes the
 * pointer on its own controls.
 */
import { __, _n, sprintf } from '@wordpress/i18n';
import { useDispatch, useSelect } from '@wordpress/data';
import {
	createPortal,
	useEffect,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';
import {
	BlockPreview,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { cloneBlock, getBlockType } from '@wordpress/blocks';
import { store as coreStore } from '@wordpress/core-data';

import { findSwaps, transferContent } from './swap';

// Keeps re-rendering the layer as the canvas scrolls, resizes or changes.
function useCanvasTick( doc ) {
	const [ tick, setTick ] = useState( 0 );
	useEffect( () => {
		const win = doc.defaultView;
		let raf = 0;
		const bump = () => {
			if ( ! raf ) {
				raf = win.requestAnimationFrame( () => {
					raf = 0;
					setTick( ( t ) => t + 1 );
				} );
			}
		};
		win.addEventListener( 'scroll', bump, true );
		win.addEventListener( 'resize', bump );
		const mo = new win.MutationObserver( ( list ) => {
			// Ignore our own layer's changes.
			if ( list.some( ( m ) => ! m.target.closest?.( '.ito-layer' ) ) ) {
				bump();
			}
		} );
		mo.observe( doc.body, {
			subtree: true,
			childList: true,
			attributes: true,
			attributeFilter: [ 'class', 'style', 'src' ],
		} );
		const ro = new win.ResizeObserver( bump );
		ro.observe( doc.body );
		doc.addEventListener( 'load', bump, true );
		return () => {
			win.removeEventListener( 'scroll', bump, true );
			win.removeEventListener( 'resize', bump );
			doc.removeEventListener( 'load', bump, true );
			mo.disconnect();
			ro.disconnect();
			win.cancelAnimationFrame( raf );
		};
	}, [ doc ] );
	return tick;
}

// The section's content in a pattern's blocks, named as that pattern.
function swapped( snapshot, pattern ) {
	const block = transferContent( snapshot, pattern.blocks[ 0 ] );
	return {
		...block,
		attributes: {
			...block.attributes,
			metadata: {
				...block.attributes.metadata,
				patternName: pattern.name,
			},
		},
	};
}

// What a section is called: its pattern's title, the name it was given, or its block's title.
function sectionTitle( section, patterns ) {
	const name = section.attributes?.metadata?.patternName;
	return (
		patterns.find( ( p ) => p.name === name )?.title ||
		section.attributes?.metadata?.name ||
		getBlockType( section.name )?.title ||
		__( 'Section', 'ito' )
	);
}

export function Layer( { doc, layerEl } ) {
	const { replaceBlock } = useDispatch( blockEditorStore );
	useCanvasTick( doc );

	const { sections, patterns } = useSelect( ( select ) => {
		const s = select( blockEditorStore );
		const [ root = '' ] = s.getBlocksByName( 'core/post-content' );
		// Asking for the patterns here loads them; the inserter would otherwise.
		select( coreStore ).getBlockPatterns();
		return {
			sections: s
				.getBlockOrder( root )
				.map( ( id ) => s.getBlock( id ) )
				.filter( Boolean ),
			patterns: s.__experimentalGetAllowedPatterns( root ) || [],
		};
	}, [] );

	const swaps = useMemo(
		() =>
			new Map(
				sections.map( ( s ) => [
					s.clientId,
					findSwaps( s, patterns ),
				] )
			),
		[ sections, patterns ]
	);

	const [ hover, setHover ] = useState( null );
	// The panel goes in the editor's own document rather than the canvas, as
	// the block previews in it need the editor's styles.
	const [ panelHost, setPanelHost ] = useState( null );
	useEffect( () => {
		const el = document.createElement( 'div' );
		el.className = 'ito-layer ito-panelhost';
		document.body.appendChild( el );
		setPanelHost( el );
		return () => el.remove();
	}, [] );
	// The section being swapped: its ID now, how it was when the panel
	// opened, the patterns it can swap to, and which one it is now.
	const [ active, setActive ] = useState( null ); // { id, snapshot, options, chosen }

	const elOf = ( id ) => doc.getElementById( 'block-' + id );
	const layerRect = layerEl.getBoundingClientRect();
	const toLayer = ( r ) => ( {
		left: r.left - layerRect.left,
		top: r.top - layerRect.top,
		width: r.width,
		height: r.height,
	} );
	const viewTop = -layerRect.top; // the top of the window, in layer coordinates

	// If the section goes away (deleted, undone), close the panel.
	useEffect( () => {
		if ( active && ! sections.some( ( s ) => s.clientId === active.id ) ) {
			setActive( null );
		}
	}, [ sections, active ] );

	// Which section is under the pointer: worked out as it moves, and again
	// whenever the page shifts under a still pointer.
	const pointer = useRef( null );
	const sectionAt = ( pt ) => {
		let found = null;
		if ( pt ) {
			sections.forEach( ( s ) => {
				const r = elOf( s.clientId )?.getBoundingClientRect();
				if (
					r &&
					pt.y >= r.top &&
					pt.y < r.bottom &&
					pt.x >= r.left &&
					pt.x <= r.right
				) {
					found = s.clientId;
				}
			} );
		}
		return found;
	};
	useEffect( () => {
		const found = sectionAt( pointer.current );
		if ( pointer.current && found !== hover ) {
			setHover( found );
		}
	} );
	useEffect( () => {
		const onMove = ( e ) => {
			pointer.current = { x: e.clientX, y: e.clientY };
			setHover( sectionAt( pointer.current ) );
		};
		const onLeave = () => {
			pointer.current = null;
			setHover( null );
		};
		doc.addEventListener( 'mousemove', onMove );
		doc.documentElement.addEventListener( 'mouseleave', onLeave );
		return () => {
			doc.removeEventListener( 'mousemove', onMove );
			doc.documentElement.removeEventListener( 'mouseleave', onLeave );
		};
	}, [ doc, sections ] ); // eslint-disable-line react-hooks/exhaustive-deps

	// While the panel is open, a click anywhere else, or Escape, closes it.
	// A click on the page does nothing else; one in the editor's own
	// controls (the sidebar, the toolbar) still does what it does.
	useEffect( () => {
		if ( ! active ) {
			return;
		}
		const onClick = ( e ) => {
			if ( e.target.closest?.( '.ito-lp' ) ) {
				return;
			}
			if ( e.target.ownerDocument === doc ) {
				e.preventDefault();
				e.stopPropagation();
			}
			setActive( null );
		};
		// The editor selects a block as the button goes down, before the click.
		const onDown = ( e ) => {
			e.preventDefault();
			e.stopPropagation();
		};
		const onKey = ( e ) => {
			if ( e.key === 'Escape' ) {
				setActive( null );
			}
		};
		const docs = [ doc, document ];
		docs.forEach( ( d ) => {
			d.addEventListener( 'click', onClick, true );
			d.addEventListener( 'keydown', onKey );
		} );
		doc.addEventListener( 'mousedown', onDown, true );
		return () => {
			docs.forEach( ( d ) => {
				d.removeEventListener( 'click', onClick, true );
				d.removeEventListener( 'keydown', onKey );
			} );
			doc.removeEventListener( 'mousedown', onDown, true );
		};
	}, [ doc, active ] );

	// ---------- Actions ----------
	const open = ( section ) =>
		setActive( {
			id: section.clientId,
			snapshot: section,
			options: swaps.get( section.clientId ) || [],
			chosen: null,
		} );

	// Swap to a pattern, or back to how the section was (null).
	const choose = ( pattern ) => {
		const next = cloneBlock(
			pattern ? swapped( active.snapshot, pattern ) : active.snapshot
		);
		replaceBlock( active.id, next );
		setActive( {
			...active,
			id: next.clientId,
			chosen: pattern ? pattern.name : null,
		} );
	};

	// ---------- Drawing ----------
	// Where the panel goes in the editor's window: centred at the top of the
	// section, and kept in view while you scroll a tall one.
	const panelPosition = ( el ) => {
		const frame = doc.defaultView.frameElement.getBoundingClientRect();
		const r = el.getBoundingClientRect();
		const h = 200;
		return {
			top:
				frame.top +
				Math.max( r.top + 12, Math.min( 12, r.bottom - h - 12 ) ),
			left: frame.left + r.left + r.width / 2,
		};
	};
	const shown = sections.filter(
		( s ) => s.clientId === hover || s.clientId === active?.id
	);

	return shown.map( ( section ) => {
		const el = elOf( section.clientId );
		if ( ! el ) {
			return null;
		}
		const r = toLayer( el.getBoundingClientRect() );
		const isActive = active?.id === section.clientId;
		const options = swaps.get( section.clientId ) || [];
		// Tools stick to the top of the window while you scroll a tall section.
		const stickTop = ( h ) =>
			Math.max(
				r.top + 12,
				Math.min( viewTop + 12, r.top + r.height - h - 12 )
			);

		return (
			<div
				key={ section.clientId }
				className={ 'ito-sec' + ( isActive ? ' is-active' : '' ) }
			>
				<div className="ito-outline" style={ r } />
				<span
					className="ito-tab"
					style={ { left: r.left + 16, top: r.top } }
				>
					{ sectionTitle( section, patterns ) }
				</span>
				{ ! isActive && (
					<div
						className="ito-bar"
						style={ {
							left: r.left + r.width / 2,
							top: stickTop( 44 ),
						} }
					>
						<button
							type="button"
							className="ito-ob"
							disabled={ ! options.length }
							title={
								options.length
									? __(
											'See this section in other patterns with the same blocks',
											'ito'
										)
									: __(
											'No other pattern has the same blocks as this section',
											'ito'
										)
							}
							onClick={ () => open( section ) }
						>
							{ __( 'Edit layout', 'ito' ) }
							<span className="ito-count">
								{ options.length
									? sprintf(
											/* translators: %d: number of other layouts. */
											_n(
												'%d other',
												'%d others',
												options.length,
												'ito'
											),
											options.length
										)
									: __( 'none', 'ito' ) }
							</span>
						</button>
					</div>
				) }
				{ isActive &&
					panelHost &&
					createPortal(
						<LayoutPanel
							{ ...panelPosition( el ) }
							snapshot={ active.snapshot }
							options={ active.options }
							chosen={ active.chosen }
							title={ sectionTitle( active.snapshot, patterns ) }
							onChoose={ choose }
							onDone={ () => setActive( null ) }
						/>,
						panelHost
					) }
			</div>
		);
	} );
}

function LayoutPanel( {
	top,
	left,
	snapshot,
	options,
	chosen,
	title,
	onChoose,
	onDone,
} ) {
	// The previews only change when the panel opens on another section.
	const previews = useMemo(
		() => [
			{
				key: '',
				label: __( 'As it was', 'ito' ),
				pattern: null,
				blocks: [ snapshot ],
			},
			...options.map( ( p ) => ( {
				key: p.name,
				label: p.title,
				pattern: p,
				blocks: [ swapped( snapshot, p ) ],
			} ) ),
		],
		[ snapshot, options ]
	);
	return (
		<div
			className="ito-lp"
			role="group"
			aria-label={ sprintf(
				/* translators: %s: section name. */ __( '%s layouts', 'ito' ),
				title
			) }
			style={ { top, left } }
		>
			<div className="ito-lphead">
				<span className="ito-lph">{ __( 'Layouts', 'ito' ) }</span>
				<span className="ito-lpnote">
					{ __(
						'Patterns with the same blocks, showing your content',
						'ito'
					) }
				</span>
				<div className="ito-lpactions">
					<button
						type="button"
						className="ito-lpbtn"
						disabled={ chosen === null }
						title={ __( 'Put the section back as it was', 'ito' ) }
						onClick={ () => onChoose( null ) }
					>
						{ __( 'Reset', 'ito' ) }
					</button>
					<button
						type="button"
						className="ito-lpbtn is-primary"
						onClick={ onDone }
					>
						{ __( 'Done', 'ito' ) }
					</button>
				</div>
			</div>
			<div className="ito-lpo">
				{ previews.map( ( item ) => (
					<button
						key={ item.key }
						type="button"
						className={
							'ito-lpi' +
							( ( chosen ?? '' ) === item.key ? ' is-on' : '' )
						}
						aria-pressed={ ( chosen ?? '' ) === item.key }
						onClick={ () => onChoose( item.pattern ) }
					>
						<span className="ito-lpthumb">
							<BlockPreview
								blocks={ item.blocks }
								viewportWidth={ 1200 }
							/>
						</span>
						<span className="ito-lpl">{ item.label }</span>
					</button>
				) ) }
			</div>
		</div>
	);
}
