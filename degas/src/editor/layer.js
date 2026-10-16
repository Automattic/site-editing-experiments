/**
 * The section overlay, drawn in the editor canvas over the page.
 *
 * Hover a section for its outline, its name, an Add menu, the three modes
 * (Edit layout, Edit content, Freeform) and a toolbar to move, duplicate and
 * delete it. Only one section is in a mode at a time. Outside a mode the
 * page's blocks can't be edited directly, as in Albers: you choose how.
 */
import { __, sprintf } from '@wordpress/i18n';
import { useDispatch, useRegistry, useSelect } from '@wordpress/data';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from '@wordpress/element';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { cloneBlock, parse } from '@wordpress/blocks';
import { store as noticesStore } from '@wordpress/notices';

import {
	ADDABLE,
	SECTIONS,
	SETTINGS,
	eachBlock,
	findByClass,
	findSectionRoot,
	isContentBlock,
	itemsOf,
	kindOf,
	layoutOf,
	layoutsFor,
	paletteOf,
	sectionTitle,
	withClassValue,
} from './model';
import { ADD_LABELS, ICONS, Mini, newItem } from './pieces';
import { Freeform, cleanFree } from './freeform';

const MODES = {
	layout: { label: __( 'Edit layout', 'degas' ), desc: __( 'Pick a preset arrangement, and remove items', 'degas' ), hint: '' },
	content: { label: __( 'Edit content', 'degas' ), desc: __( 'Change text and images; positions stay put', 'degas' ), hint: __( 'Click text to edit · Replace images from the toolbar · Positions are locked', 'degas' ) },
	free: { label: __( 'Freeform', 'degas' ), desc: __( 'Move and resize items; text and images are locked', 'degas' ), hint: __( 'Drag to move · Select an item and drag its handles to resize · Text and images are locked', 'degas' ) },
};

const PICKER_THUMBS = {
	hero: [ [ 7, 12, 26, 5, 1 ], [ 7, 21, 22, 3, 2 ], [ 7, 26, 18, 3, 2 ], [ 7, 33, 12, 5, 3 ], [ 40, 8, 26, 32, 4 ] ],
	features: [ [ 6, 6, 30, 4, 1 ], [ 6, 15, 18, 14, 4 ], [ 27, 15, 18, 14, 4 ], [ 48, 15, 18, 14, 4 ], [ 6, 32, 14, 3, 2 ], [ 27, 32, 14, 3, 2 ], [ 48, 32, 14, 3, 2 ] ],
	cta: [ [ 6, 8, 60, 32, 5 ], [ 20, 14, 32, 5, 1 ], [ 24, 22, 24, 3, 2 ], [ 30, 29, 12, 6, 3 ] ],
	text: [ [ 8, 7, 30, 5, 1 ], [ 8, 17, 44, 3, 2 ], [ 8, 22, 40, 3, 2 ], [ 8, 27, 44, 3, 2 ], [ 8, 35, 36, 3, 2 ] ],
	image: [ [ 8, 6, 56, 28, 4 ], [ 8, 38, 26, 3, 2 ] ],
	gallery: [ [ 6, 5, 26, 4, 1 ], [ 6, 13, 18, 13, 4 ], [ 27, 13, 18, 13, 4 ], [ 48, 13, 18, 13, 4 ], [ 6, 29, 18, 13, 4 ], [ 27, 29, 18, 13, 4 ], [ 48, 29, 18, 13, 4 ] ],
	quote: [ [ 10, 10, 52, 5, 1 ], [ 14, 18, 44, 5, 1 ], [ 26, 30, 20, 3, 2 ] ],
	contact: [ [ 7, 9, 24, 5, 1 ], [ 7, 18, 22, 3, 2 ], [ 7, 23, 18, 3, 2 ], [ 7, 31, 14, 5, 3 ], [ 38, 8, 28, 32, 4 ] ],
	faq: [ [ 8, 5, 26, 5, 1 ], [ 8, 14, 56, 9, 5 ], [ 8, 25, 56, 9, 5 ], [ 8, 36, 56, 9, 5 ] ],
	team: [ [ 6, 5, 26, 4, 1 ], [ 9, 14, 14, 14, 4 ], [ 29, 14, 14, 14, 4 ], [ 49, 14, 14, 14, 4 ], [ 8, 32, 16, 3, 1 ], [ 28, 32, 16, 3, 1 ], [ 48, 32, 16, 3, 1 ] ],
	newsletter: [ [ 18, 8, 36, 5, 1 ], [ 14, 17, 44, 3, 2 ], [ 14, 27, 30, 8, 5 ], [ 46, 27, 12, 8, 3 ] ],
	pricing: [ [ 6, 4, 26, 4, 1 ], [ 6, 12, 18, 30, 5 ], [ 27, 12, 18, 30, 5 ], [ 48, 12, 18, 30, 5 ], [ 9, 34, 12, 4, 3 ], [ 30, 34, 12, 4, 3 ], [ 51, 34, 12, 4, 3 ] ],
};

/** Keeps re-rendering the layer as the canvas scrolls, resizes or changes. */
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
			if ( list.some( ( m ) => ! m.target.closest?.( '.dg-layer' ) ) ) {
				bump();
			}
		} );
		mo.observe( doc.body, { subtree: true, childList: true, attributes: true, attributeFilter: [ 'class', 'style', 'src' ] } );
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

export function Layer( { doc, layerEl } ) {
	const registry = useRegistry();
	const be = useDispatch( blockEditorStore );
	const { createNotice } = useDispatch( noticesStore );
	const tick = useCanvasTick( doc );

	const { rootId, sections } = useSelect( ( select ) => {
		const s = select( blockEditorStore );
		const root = findSectionRoot( s );
		return {
			rootId: root,
			sections: s.getBlockOrder( root ).map( ( id ) => s.getBlock( id ) ).filter( Boolean ),
		};
	}, [] );

	const [ active, setActive ] = useState( null ); // { id, mode }
	const [ hover, setHover ] = useState( null );
	const [ selected, setSelected ] = useState( null );
	const [ menu, setMenu ] = useState( null ); // section id whose Add menu is open
	const [ picker, setPicker ] = useState( null ); // index the picker inserts at
	const [ grid, setGrid ] = useState( true );
	const [ snap, setSnap ] = useState( true );
	const removed = useRef( [] ); // { sectionId, block, rootClientId, index }
	const session = useRef( null ); // what Edit layout's Reset goes back to
	const [ , forceRender ] = useState( 0 );
	const setModes = useRef( new Map() ); // the editing modes Degas has set, by client ID

	const elOf = ( id ) => doc.getElementById( 'block-' + id );
	const layerRect = layerEl.getBoundingClientRect();
	const toLayer = ( r ) => ( { left: r.left - layerRect.left, top: r.top - layerRect.top, width: r.width, height: r.height } );
	const viewTop = -layerRect.top; // the top of the window, in layer coordinates
	const viewCenter = doc.documentElement.clientWidth / 2 - layerRect.left;
	const viewBottom = viewTop + doc.documentElement.clientHeight;

	// If the active section goes away (deleted, undone), leave the mode.
	useEffect( () => {
		if ( active && ! sections.some( ( s ) => s.clientId === active.id ) ) {
			setActive( null );
		}
	}, [ sections, active ] );

	// Outside a mode the page's blocks are locked; Edit content unlocks
	// just the text and images of the section being edited.
	useEffect( () => {
		const next = new Map();
		sections.forEach( ( s ) => {
			next.set( s.clientId, 'disabled' );
			if ( active?.id === s.clientId && active.mode === 'content' ) {
				eachBlock( s, ( b ) => {
					if ( b !== s && isContentBlock( b.name ) ) {
						next.set( b.clientId, 'contentOnly' );
					}
				} );
			}
		} );
		registry.batch( () => {
			setModes.current.forEach( ( mode, id ) => {
				if ( ! next.has( id ) ) {
					be.unsetBlockEditingMode( id );
				}
			} );
			next.forEach( ( mode, id ) => {
				if ( setModes.current.get( id ) !== mode ) {
					be.setBlockEditingMode( id, mode );
				}
			} );
		} );
		setModes.current = next;
	}, [ sections, active ] ); // eslint-disable-line react-hooks/exhaustive-deps

	// Hand the blocks back when the layer goes away.
	useEffect(
		() => () => {
			registry.batch( () => setModes.current.forEach( ( mode, id ) => be.unsetBlockEditingMode( id ) ) );
		},
		[] // eslint-disable-line react-hooks/exhaustive-deps
	);

	// Which section is under the pointer: worked out as it moves, and again
	// whenever the page shifts under a still pointer (scrolling, moving a section).
	const pointer = useRef( null );
	const sectionAt = ( pt ) => {
		let found = null;
		if ( pt ) {
			sections.forEach( ( s ) => {
				const r = elOf( s.clientId )?.getBoundingClientRect();
				if ( r && pt.y >= r.top && pt.y < r.bottom && pt.x >= r.left && pt.x <= r.right ) {
					found = s.clientId;
				}
			} );
		}
		return found;
	};
	useEffect( () => {
		if ( pointer.current && ! pointer.current.paused ) {
			const found = sectionAt( pointer.current );
			if ( found !== hover ) {
				setHover( found );
			}
		}
	} );
	useEffect( () => {
		const onMove = ( e ) => {
			const paused = !! e.target.closest?.( '.dg-picker, .dg-addmenu' );
			pointer.current = { x: e.clientX, y: e.clientY, paused };
			if ( ! paused ) {
				setHover( sectionAt( pointer.current ) );
			}
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

	// In Edit layout, a click anywhere except the layouts panel and the bins
	// leaves the mode, and does nothing else.
	useEffect( () => {
		if ( active?.mode !== 'layout' ) {
			return;
		}
		const onClick = ( e ) => {
			if ( e.target.closest?.( '.dg-lp, .dg-bin, .dg-tb' ) ) {
				return;
			}
			e.preventDefault();
			e.stopPropagation();
			setActive( null );
		};
		doc.addEventListener( 'click', onClick, true );
		return () => doc.removeEventListener( 'click', onClick, true );
	}, [ doc, active ] );

	// Close the Add menu and the picker on Escape or a click elsewhere.
	useEffect( () => {
		const onKey = ( e ) => {
			if ( e.key === 'Escape' ) {
				setMenu( null );
				setPicker( null );
			}
		};
		const onDown = ( e ) => {
			if ( ! e.target.closest?.( '.dg-addwrap' ) ) {
				setMenu( null );
			}
			if ( ! e.target.closest?.( '.dg-picker, .dg-ins' ) ) {
				setPicker( null );
			}
		};
		doc.addEventListener( 'keydown', onKey );
		doc.addEventListener( 'pointerdown', onDown, true );
		return () => {
			doc.removeEventListener( 'keydown', onKey );
			doc.removeEventListener( 'pointerdown', onDown, true );
		};
	}, [ doc ] );

	// ---------- Actions ----------
	/**
	 * Runs an action that the editor would refuse while blocks are locked
	 * (removing, inserting, moving): unlocks the blocks it touches, runs it,
	 * and locks them again.
	 *
	 * @param {string[]} ids Client IDs to unlock, and their ancestors.
	 * @param {Function} fn  The action.
	 */
	function unlocked( ids, fn ) {
		const s = registry.select( blockEditorStore );
		const all = new Set( [ '' ] );
		ids.filter( ( id ) => id !== undefined && id !== null ).forEach( ( id ) => {
			all.add( id );
			s.getBlockParents( id ).forEach( ( p ) => all.add( p ) );
		} );
		all.delete( '' );
		registry.batch( () => {
			all.forEach( ( id ) => be.setBlockEditingMode( id, 'default' ) );
			fn();
			all.forEach( ( id ) => {
				const mode = setModes.current.get( id );
				if ( ! s.getBlock( id ) ) {
					return;
				}
				if ( mode ) {
					be.setBlockEditingMode( id, mode );
				} else {
					be.unsetBlockEditingMode( id );
				}
			} );
		} );
	}

	function open( section, mode ) {
		setActive( { id: section.clientId, mode } );
		setSelected( null );
		setMenu( null );
		if ( mode === 'layout' ) {
			session.current = {
				id: section.clientId,
				className: section.attributes.className,
				removedFrom: removed.current.length,
			};
		}
		// Clear any block selection so the editor's own toolbar gets out of the way.
		be.clearSelectedBlock();
	}

	function done() {
		setActive( null );
		setSelected( null );
		be.clearSelectedBlock();
	}

	function setClass( section, prefix, value ) {
		be.updateBlockAttributes( section.clientId, {
			className: withClassValue( section.attributes.className, prefix, value ),
		} );
	}

	function removeItem( sectionId, clientId ) {
		const s = registry.select( blockEditorStore );
		const rootClientId = s.getBlockRootClientId( clientId );
		removed.current.push( {
			sectionId,
			block: s.getBlock( clientId ),
			rootClientId,
			index: s.getBlockIndex( clientId ),
		} );
		unlocked( [ clientId ], () => be.removeBlock( clientId, false ) );
		if ( selected === clientId ) {
			setSelected( null );
		}
		forceRender( ( n ) => n + 1 );
	}

	function restore( sectionId, from = 0 ) {
		const keep = [];
		const back = [];
		removed.current.forEach( ( r, i ) => ( r.sectionId === sectionId && i >= from ? back : keep ).push( r ) );
		back.reverse().forEach( ( r ) =>
			unlocked( [ r.rootClientId ], () => be.insertBlock( r.block, r.index, r.rootClientId, false ) )
		);
		removed.current = keep;
		forceRender( ( n ) => n + 1 );
	}

	function resetLayout( section ) {
		const snap0 = session.current;
		if ( ! snap0 || snap0.id !== section.clientId ) {
			return;
		}
		restore( section.clientId, snap0.removedFrom );
		be.updateBlockAttributes( section.clientId, { className: snap0.className } );
	}

	function resetPositions( section ) {
		const ids = itemsOf( section ).map( ( it ) => it.clientId );
		be.updateBlockAttributes( ids, { degasFree: undefined } );
	}

	function addItem( section, spec ) {
		const [ type, slotClass, where ] = spec;
		const block = newItem( type );
		const slot = findByClass( section, slotClass ) || section;
		let index;
		if ( where === 'first' ) {
			// After what's already at the top, before the first slot.
			const i = slot.innerBlocks.findIndex( ( b ) => ( b.attributes.className || '' ).includes( 'degas-slot' ) );
			index = i < 0 ? slot.innerBlocks.length : i;
		}
		unlocked( [ slot.clientId ], () => be.insertBlock( block, index, slot.clientId, false ) );
		setMenu( null );
	}

	function addSection( kind, index ) {
		const def = SECTIONS[ kind ];
		const blocks = parse( def.content );
		be.insertBlocks( blocks, index, rootId, false );
		setPicker( null );
		const win = doc.defaultView;
		win.setTimeout( () => elOf( blocks[ 0 ].clientId )?.scrollIntoView( { behavior: 'smooth', block: 'center' } ), 120 );
	}

	function deleteSection( section ) {
		const s = registry.select( blockEditorStore );
		const index = s.getBlockIndex( section.clientId );
		const saved = cloneBlock( s.getBlock( section.clientId ) );
		unlocked( [ section.clientId ], () => be.removeBlock( section.clientId, false ) );
		createNotice(
			'info',
			sprintf( /* translators: %s: section name. */ __( '%s deleted', 'degas' ), sectionTitle( section ) ),
			{
				type: 'snackbar',
				id: 'degas-deleted',
				actions: [ { label: __( 'Undo', 'degas' ), onClick: () => be.insertBlock( saved, index, rootId, false ) } ],
			}
		);
	}

	// ---------- Drawing ----------
	const shown = sections.filter( ( s ) => s.clientId === hover || s.clientId === active?.id );

	return (
		<>
			{ shown.map( ( section, n ) => {
				const el = elOf( section.clientId );
				if ( ! el ) {
					return null;
				}
				const r = toLayer( el.getBoundingClientRect() );
				const index = sections.indexOf( section );
				const isActive = active?.id === section.clientId;
				const mode = isActive ? active.mode : null;
				const kind = kindOf( section.attributes );
				const title = sectionTitle( section );
				const items = itemsOf( section );
				const nRemoved = removed.current.filter( ( x ) => x.sectionId === section.clientId ).length;
				// Tools stick to the top of the window while you scroll a tall section.
				const stickTop = ( h ) => Math.max( r.top + 12, Math.min( viewTop + 12, r.top + r.height - h - 12 ) );
				// In Edit content the editor's own text toolbar sits above the text, so the bar goes to the bottom.
				const stickBottom = ( h ) => Math.max( r.top + 12, Math.min( viewBottom - h - 12, r.top + r.height - h - 12 ) );
				const addable = ADDABLE[ kind ] || [ [ 'heading', null ], [ 'paragraph', null ], [ 'button', null ], [ 'image', null ] ];

				return (
					<div key={ section.clientId + n } className={ 'dg-sec' + ( isActive ? ' is-active' : '' ) }>
						<div className="dg-outline" style={ r } />
						<span className="dg-tab" style={ { left: r.left + 16, top: r.top } }>
							{ title }
						</span>

						{ ! isActive && (
							<div className="dg-ov" style={ r }>
								<div className="dg-ovbar" style={ { top: stickTop( 48 ) - r.top } }>
									<div className="dg-addwrap">
										<button
											type="button"
											className="dg-addtrig"
											aria-expanded={ menu === section.clientId }
											aria-haspopup="menu"
											onClick={ () => setMenu( menu === section.clientId ? null : section.clientId ) }
										>
											{ ICONS.plus }
											{ __( 'Add', 'degas' ) }
										</button>
										{ menu === section.clientId && (
											<div className="dg-addmenu" role="menu" aria-label={ sprintf( /* translators: %s: section name. */ __( 'Add to %s', 'degas' ), title ) }>
												{ addable.map( ( spec ) => (
													<button key={ spec[ 0 ] + spec[ 1 ] } role="menuitem" type="button" onClick={ () => addItem( section, spec ) }>
														{ ICONS[ spec[ 0 ] ] }
														<span>{ ADD_LABELS[ spec[ 0 ] ] }</span>
													</button>
												) ) }
											</div>
										) }
									</div>
									<div className="dg-modebar" role="group" aria-label={ __( 'Edit this section', 'degas' ) }>
										{ Object.keys( MODES ).map( ( m ) => (
											<button key={ m } type="button" className="dg-ob" title={ MODES[ m ].desc } onClick={ () => open( section, m ) }>
												{ ICONS[ m ] }
												<span>{ MODES[ m ].label }</span>
											</button>
										) ) }
									</div>
									<div className="dg-secctl" role="group" aria-label={ __( 'Section', 'degas' ) }>
										<button type="button" className="dg-sbtn" disabled={ index === 0 } aria-label={ __( 'Move section up', 'degas' ) } title={ __( 'Move up', 'degas' ) } onClick={ () => unlocked( [ section.clientId ], () => be.moveBlocksUp( [ section.clientId ], rootId ) ) }>
											{ ICONS.up }
										</button>
										<button type="button" className="dg-sbtn" disabled={ index === sections.length - 1 } aria-label={ __( 'Move section down', 'degas' ) } title={ __( 'Move down', 'degas' ) } onClick={ () => unlocked( [ section.clientId ], () => be.moveBlocksDown( [ section.clientId ], rootId ) ) }>
											{ ICONS.down }
										</button>
										<button type="button" className="dg-sbtn" aria-label={ __( 'Duplicate section', 'degas' ) } title={ __( 'Duplicate', 'degas' ) } onClick={ () => unlocked( [ section.clientId ], () => be.duplicateBlocks( [ section.clientId ], false ) ) }>
											{ ICONS.copy }
										</button>
										<button type="button" className="dg-sbtn is-danger" aria-label={ __( 'Delete section', 'degas' ) } title={ __( 'Delete section', 'degas' ) } onClick={ () => deleteSection( section ) }>
											{ ICONS.bin }
										</button>
									</div>
								</div>
								{ [ index, index + 1 ].map( ( at, k ) => (
									<div key={ k } className={ 'dg-ins ' + ( k ? 'is-bottom' : 'is-top' ) }>
										<button type="button" className="dg-insbtn" onClick={ () => setPicker( at ) }>
											{ ICONS.plus }
											{ __( 'Add section', 'degas' ) }
										</button>
									</div>
								) ) }
							</div>
						) }

						{ ( mode === 'content' || mode === 'free' ) && (
							<div className={ 'dg-tb is-' + mode } style={ { left: r.left + 16, width: Math.max( 0, r.width - 32 ), top: mode === 'content' ? stickBottom( 50 ) : stickTop( 50 ) } }>
								<span className="dg-tbl" title={ MODES[ mode ].hint }>
									{ MODES[ mode ].label }
								</span>
								<span className="dg-tbh">{ MODES[ mode ].hint }</span>
								{ mode === 'free' && (
									<>
										<button type="button" className={ 'dg-tbb' + ( grid ? ' is-on' : '' ) } aria-pressed={ grid } title={ __( 'Show the column grid', 'degas' ) } onClick={ () => setGrid( ! grid ) }>
											{ __( 'Grid', 'degas' ) }
										</button>
										<button type="button" className={ 'dg-tbb' + ( snap ? ' is-on' : '' ) } aria-pressed={ snap } title={ __( 'Snap to guides', 'degas' ) } onClick={ () => setSnap( ! snap ) }>
											{ __( 'Snap', 'degas' ) }
										</button>
										<button type="button" className="dg-tbb" title={ __( 'Reset positions and sizes', 'degas' ) } onClick={ () => resetPositions( section ) }>
											{ __( 'Reset', 'degas' ) }
										</button>
									</>
								) }
								{ nRemoved > 0 && (
									<button type="button" className="dg-tbb" title={ __( 'Bring back removed items', 'degas' ) } onClick={ () => restore( section.clientId ) }>
										{ __( 'Restore', 'degas' ) }
									</button>
								) }
								<span className="dg-spacer" />
								<button type="button" className="dg-done" onClick={ done }>
									{ __( 'Done', 'degas' ) }
								</button>
							</div>
						) }

						{ ( mode === 'layout' || mode === 'content' ) &&
							items.map( ( it ) => {
								const ir = elOf( it.clientId )?.getBoundingClientRect();
								if ( ! ir ) {
									return null;
								}
								const b = toLayer( ir );
								return (
									<span key={ it.clientId }>
										{ mode === 'layout' && <span className="dg-itemline" style={ b } /> }
										<button
											type="button"
											className="dg-bin"
											style={ { left: b.left + b.width - 14, top: b.top - 14 } }
											aria-label={ __( 'Remove this item', 'degas' ) }
											title={ __( 'Remove', 'degas' ) }
											onMouseEnter={ () => elOf( it.clientId )?.classList.add( 'dg-doomed' ) }
											onMouseLeave={ () => elOf( it.clientId )?.classList.remove( 'dg-doomed' ) }
											onClick={ () => removeItem( section.clientId, it.clientId ) }
										>
											{ ICONS.bin }
										</button>
									</span>
								);
							} ) }

						{ mode === 'layout' && (
							<LayoutPanel
								section={ section }
								element={ el }
								kind={ kind }
								top={ stickTop( 280 ) }
								center={ r.left + r.width / 2 }
								nRemoved={ nRemoved }
								changed={ session.current?.id === section.clientId && ( session.current.className !== section.attributes.className || removed.current.length > session.current.removedFrom ) }
								onLayout={ ( id ) => setClass( section, 'degas-layout-', id ) }
								onPalette={ ( id ) => setClass( section, 'degas-palette-', id === 'default' ? null : id ) }
								onRestore={ () => restore( section.clientId ) }
								onReset={ () => resetLayout( section ) }
								onDone={ done }
							/>
						) }

						{ mode === 'free' && (
							<Freeform
								doc={ doc }
								section={ section }
								items={ items }
								selected={ selected }
								onSelect={ setSelected }
								onRemove={ ( id ) => removeItem( section.clientId, id ) }
								grid={ grid }
								snap={ snap }
								toLayer={ toLayer }
								sectionRect={ r }
							/>
						) }
					</div>
				);
			} ) }

			{ picker !== null && (
				<Picker
					top={ ( () => {
						const before = sections[ picker ];
						const after = sections[ picker - 1 ];
						const ref = before ? elOf( before.clientId ) : after && elOf( after.clientId );
						if ( ! ref ) {
							return viewTop + 80;
						}
						const rr = toLayer( ref.getBoundingClientRect() );
						return before ? rr.top : rr.top + rr.height;
					} )() }
					left={ viewCenter }
					onPick={ ( kind ) => addSection( kind, picker ) }
					onCancel={ () => setPicker( null ) }
				/>
			) }

			{ sections.length === 0 && (
				<div className="dg-empty" style={ { top: viewTop + 120, left: viewCenter } }>
					<p>{ __( 'This page has no sections yet.', 'degas' ) }</p>
					<button type="button" className="dg-insbtn is-static" onClick={ () => setPicker( 0 ) }>
						{ ICONS.plus }
						{ __( 'Add section', 'degas' ) }
					</button>
				</div>
			) }
		</>
	);
}

function LayoutPanel( { section, element, kind, top, center, nRemoved, changed, onLayout, onPalette, onRestore, onReset, onDone } ) {
	const current = layoutOf( section.attributes );
	const palette = paletteOf( section.attributes );
	const layouts = layoutsFor( kind, element, current );
	// Redraw the previews when the section's content changes, not on every scroll.
	const contentVersion = useMemo( () => JSON.stringify( section ), [ section ] );
	const ref = useRef();
	const [ height, setHeight ] = useState( 0 );
	useLayoutEffect( () => {
		const h = ref.current?.offsetHeight || 0;
		if ( h !== height ) {
			setHeight( h );
		}
	} );
	return (
		<div
			ref={ ref }
			className="dg-lp"
			role="group"
			aria-label={ sprintf( /* translators: %s: section name. */ __( '%s layouts', 'degas' ), sectionTitle( section ) ) }
			style={ { top, left: center } }
		>
			<div className="dg-lphead">
				<span className="dg-lph">{ __( 'Layouts', 'degas' ) }</span>
				<div className="dg-lpactions">
					{ nRemoved > 0 && (
						<button type="button" className="dg-lpbtn" onClick={ onRestore }>
							{ sprintf( /* translators: %d: number of items. */ __( 'Restore removed (%d)', 'degas' ), nRemoved ) }
						</button>
					) }
					<button type="button" className="dg-lpbtn" disabled={ ! changed } title={ __( 'Undo changes since you opened Edit layout', 'degas' ) } onClick={ onReset }>
						{ __( 'Reset', 'degas' ) }
					</button>
					<button type="button" className="dg-done" onClick={ onDone }>
						{ __( 'Done', 'degas' ) }
					</button>
				</div>
			</div>
			{ layouts.length > 0 ? (
				<div className="dg-lpo">
					{ layouts.map( ( l ) => (
						<button
							key={ l.id }
							type="button"
							className={ 'dg-lo' + ( l.extra ? ' is-new' : '' ) }
							aria-pressed={ l.id === current }
							aria-label={ l.label }
							onClick={ () => onLayout( l.id ) }
						>
							<Mini element={ element } layout={ l.id } palette={ palette } version={ contentVersion } />
							<span>{ l.label }</span>
						</button>
					) ) }
				</div>
			) : (
				<p className="dg-lpnote">{ __( 'This section has no preset layouts. Its colours can still change.', 'degas' ) }</p>
			) }
			<div className="dg-lpsec">
				<span className="dg-lph">{ __( 'Colours', 'degas' ) }</span>
				<div className="dg-pals" role="group" aria-label={ __( 'Colour palette', 'degas' ) }>
					{ SETTINGS.palettes.map( ( p ) => (
						<button key={ p.id } type="button" className="dg-pal" aria-pressed={ p.id === palette } onClick={ () => onPalette( p.id ) }>
							<span className="dg-palsw" aria-hidden="true">
								{ p.sw.map( ( c, i ) => (
									<span key={ i } style={ { background: c } } />
								) ) }
							</span>
							{ p.label }
						</button>
					) ) }
				</div>
			</div>
		</div>
	);
}

function Picker( { top, left, onPick, onCancel } ) {
	const colours = [ null, '#ECECEC', '#A8A8A8', '#9DB2FF', 'rgba(255,255,255,0.32)', 'rgba(255,255,255,0.12)' ];
	return (
		<div className="dg-picker" role="dialog" aria-label={ __( 'Add a section', 'degas' ) } style={ { top, left } }>
			<span className="dg-pickh">{ __( 'Choose a section to add here', 'degas' ) }</span>
			<div className="dg-picko">
				{ SETTINGS.sections.map( ( s ) => (
					<button key={ s.kind } type="button" className="dg-lo" onClick={ () => onPick( s.kind ) }>
						<span className="dg-th" aria-hidden="true">
							{ ( PICKER_THUMBS[ s.kind ] || [] ).map( ( [ x, y, w, h, c ], i ) => (
								<span key={ i } style={ { left: x, top: y, width: w, height: h, background: colours[ c ] } } />
							) ) }
						</span>
						<span>{ s.title }</span>
					</button>
				) ) }
			</div>
			<button type="button" className="dg-pickx" onClick={ onCancel }>
				{ __( 'Cancel', 'degas' ) }
			</button>
		</div>
	);
}

export { cleanFree };
