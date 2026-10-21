/**
 * Hepworth: Escher's two toolbars in the real editor.
 *
 * Every block's toolbar gets a Write / Design switch at the start. Writing
 * shows Word-style text tools (and the editor's own bold, italic and links);
 * designing shows PowerPoint-style settings (and the editor's own movers).
 * Each toolbar hides the other's controls. In the writing toolbar the
 * editor's block switcher becomes the block's icon as a simple menu of the
 * blocks it can turn into; the design toolbar has no parent selector.
 */
import './editor.scss';
import { __ } from '@wordpress/i18n';
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { useSelect, useDispatch } from '@wordpress/data';
import { useEffect } from '@wordpress/element';
import { registerPlugin } from '@wordpress/plugins';
import {
	BlockControls,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { ToolbarGroup, ToolbarButton } from '@wordpress/components';
import { pencil, layout } from '@wordpress/icons';
import { store, STORE, defaultMode, HAS_WORDS } from './store';
import { canvasDocument } from './presets';
import WriteTools from './write-tools';
import DesignTools from './design-tools';
import BlockMenu from './block-menu';

function useMode( clientId, name ) {
	const chosen = useSelect(
		( select ) => select( STORE ).getChosenMode( clientId ),
		[ clientId ]
	);
	return chosen || defaultMode( name );
}

function Toolbars( { clientId, name } ) {
	const mode = useMode( clientId, name );
	const { setMode } = useDispatch( store );
	const canWrite = HAS_WORDS.includes( name );
	return (
		<>
			{ mode === 'write' && (
				<BlockControls group="parent">
					<BlockMenu clientId={ clientId } />
				</BlockControls>
			) }
			<BlockControls group="parent">
				<ToolbarGroup className={ `hw-mode is-${ mode }` }>
					<ToolbarButton
						icon={ pencil }
						label={
							canWrite
								? __( 'Write', 'hepworth' )
								: __( 'Write (this has no words)', 'hepworth' )
						}
						isPressed={ mode === 'write' }
						disabled={ ! canWrite }
						className="hw-mode__write"
						onClick={ () => setMode( 'write', clientId ) }
					/>
					<ToolbarButton
						icon={ layout }
						label={ __( 'Design', 'hepworth' ) }
						isPressed={ mode === 'design' }
						className="hw-mode__design"
						onClick={ () => setMode( 'design', clientId ) }
					/>
				</ToolbarGroup>
			</BlockControls>
			<BlockControls group="parent">
				{ mode === 'write' ? (
					<WriteTools clientId={ clientId } />
				) : (
					<DesignTools clientId={ clientId } />
				) }
			</BlockControls>
			{ mode === 'design' && (
				// Bold, italic and links live in the toolbar's "inline" group, which has no class
				// of its own; this marker lands in the same group so the stylesheet can hide it.
				<BlockControls group="inline">
					<span className="hw-inline-marker" hidden />
				</BlockControls>
			) }
		</>
	);
}

const withToolbars = createHigherOrderComponent(
	( BlockEdit ) => ( props ) => {
		if ( ! props.isSelected ) {
			return <BlockEdit { ...props } />;
		}
		return (
			<>
				<BlockEdit { ...props } />
				<Toolbars clientId={ props.clientId } name={ props.name } />
			</>
		);
	},
	'withHepworthToolbars'
);
addFilter( 'editor.BlockEdit', 'hepworth/toolbars', withToolbars );

/**
 * Marks the page (and the canvas) with the toolbar in use, so the editor's own
 * controls that belong to the other toolbar can be hidden, and the selected
 * block's outline takes the toolbar's colour (Word blue, PowerPoint orange).
 */
const CANVAS_CSS = `
body.hw-write { --wp-admin-theme-color: #2B579A; --wp-admin-theme-color-darker-10: #234a85; --wp-admin-theme-color-darker-20: #1d3e70; }
body.hw-design { --wp-admin-theme-color: #C43E1C; --wp-admin-theme-color-darker-10: #ab3518; --wp-admin-theme-color-darker-20: #922d14; }
`;

/*
 * Alignment is split between the toolbars. Aligning text (left, centre,
 * right) is about the words, so it's writing; where a block sits (wide, full,
 * floated), how a row of buttons is justified and how columns line up
 * vertically are about the layout, so they're design.
 *
 * Blocks add these controls themselves and they have no class of their own,
 * so they're found by their labels, in the site's language: WordPress's own
 * translations of the same words.
 */
const ALIGN_TEXT = [ __( 'Align text' ) ];
const PLACEMENT = [
	__( 'Align' ),
	__( 'Change items justification' ),
	__( 'Change vertical alignment' ),
];

/**
 * Hides the other toolbar's alignment controls, and any group they leave empty.
 *
 * @param {string|null} mode 'write', 'design' or null.
 */
function tidyToolbar( mode ) {
	const toolbar = document.querySelector( '.block-editor-block-toolbar' );
	if ( ! toolbar ) {
		return;
	}
	toolbar
		.querySelectorAll( '.hw-hidden' )
		.forEach( ( el ) => el.classList.remove( 'hw-hidden' ) );
	let hide = [];
	if ( mode === 'write' ) {
		hide = PLACEMENT;
	} else if ( mode === 'design' ) {
		hide = ALIGN_TEXT;
	}
	toolbar.querySelectorAll( 'button[aria-label]' ).forEach( ( button ) => {
		if ( hide.includes( button.getAttribute( 'aria-label' ) ) ) {
			(
				button.closest( '.components-dropdown' ) || button
			).classList.add( 'hw-hidden' );
		}
	} );
	toolbar
		.querySelectorAll( '.components-toolbar-group' )
		.forEach( ( group ) => {
			const buttons = [ ...group.querySelectorAll( 'button' ) ];
			if (
				buttons.length &&
				buttons.every( ( b ) => b.closest( '.hw-hidden' ) )
			) {
				group.classList.add( 'hw-hidden' );
			}
		} );
}

function ModeSync() {
	const { clientId, name, chosen } = useSelect( ( select ) => {
		const be = select( blockEditorStore );
		const id = be.getSelectedBlockClientId();
		return {
			clientId: id,
			name: id ? be.getBlockName( id ) : null,
			chosen: id ? select( STORE ).getChosenMode( id ) : null,
		};
	}, [] );
	const mode = clientId ? chosen || defaultMode( name ) : null;
	useEffect( () => {
		const apply = () => {
			const docs = [ document, canvasDocument() ];
			docs.forEach( ( doc ) => {
				if ( ! doc || ! doc.body ) {
					return;
				}
				doc.body.classList.toggle( 'hw-write', mode === 'write' );
				doc.body.classList.toggle( 'hw-design', mode === 'design' );
				if (
					doc !== document &&
					! doc.getElementById( 'hw-canvas' ) &&
					doc.head
				) {
					const tag = doc.createElement( 'style' );
					tag.id = 'hw-canvas';
					tag.textContent = CANVAS_CSS;
					doc.head.appendChild( tag );
				}
			} );
		};
		apply();
		// The canvas can arrive (or be replaced) after the first paint.
		const t = setTimeout( apply, 400 );

		// The toolbar redraws as blocks and modes change; tidy it each time.
		let frame = 0;
		const tidy = () => {
			window.cancelAnimationFrame( frame );
			frame = window.requestAnimationFrame( () => tidyToolbar( mode ) );
		};
		tidy();
		const observer = new window.MutationObserver( tidy );
		observer.observe( document.body, { childList: true, subtree: true } );
		return () => {
			clearTimeout( t );
			window.cancelAnimationFrame( frame );
			observer.disconnect();
		};
	}, [ mode, clientId ] );
	return null;
}

registerPlugin( 'hepworth', { render: ModeSync } );
