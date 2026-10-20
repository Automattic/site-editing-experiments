/**
 * Frankenthaler: Escher's two toolbars in the real editor.
 *
 * Every block's toolbar gets a Write / Design switch at the start. Writing
 * shows Word-style text tools (and the editor's own bold, italic and links);
 * designing shows PowerPoint-style settings (and the editor's own movers).
 * Each toolbar hides the other's controls, including the block switcher in
 * the writing toolbar: there, Style, Font and Size do the transforming.
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
			<BlockControls group="parent">
				<ToolbarGroup className={ `fk-mode is-${ mode }` }>
					<ToolbarButton
						icon={ pencil }
						label={
							canWrite
								? __( 'Write', 'frankenthaler' )
								: __(
										'Write (this has no words)',
										'frankenthaler'
									)
						}
						isPressed={ mode === 'write' }
						disabled={ ! canWrite }
						className="fk-mode__write"
						onClick={ () => setMode( 'write', clientId ) }
					/>
					<ToolbarButton
						icon={ layout }
						label={ __( 'Design', 'frankenthaler' ) }
						isPressed={ mode === 'design' }
						className="fk-mode__design"
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
					<span className="fk-inline-marker" hidden />
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
	'withFrankenthalerToolbars'
);
addFilter( 'editor.BlockEdit', 'frankenthaler/toolbars', withToolbars );

/**
 * Marks the page (and the canvas) with the toolbar in use, so the editor's own
 * controls that belong to the other toolbar can be hidden, and the selected
 * block's outline takes the toolbar's colour (Word blue, PowerPoint orange).
 */
const CANVAS_CSS = `
body.fk-write { --wp-admin-theme-color: #2B579A; --wp-admin-theme-color-darker-10: #234a85; --wp-admin-theme-color-darker-20: #1d3e70; }
body.fk-design { --wp-admin-theme-color: #C43E1C; --wp-admin-theme-color-darker-10: #ab3518; --wp-admin-theme-color-darker-20: #922d14; }
`;

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
				doc.body.classList.toggle( 'fk-write', mode === 'write' );
				doc.body.classList.toggle( 'fk-design', mode === 'design' );
				if (
					doc !== document &&
					! doc.getElementById( 'fk-canvas' ) &&
					doc.head
				) {
					const tag = doc.createElement( 'style' );
					tag.id = 'fk-canvas';
					tag.textContent = CANVAS_CSS;
					doc.head.appendChild( tag );
				}
			} );
		};
		apply();
		// The canvas can arrive (or be replaced) after the first paint.
		const t = setTimeout( apply, 400 );
		return () => clearTimeout( t );
	}, [ mode, clientId ] );
	return null;
}

registerPlugin( 'frankenthaler', { render: ModeSync } );
