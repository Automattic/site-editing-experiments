/**
 * The panel opens from the block toolbar, not by itself: a pencil in every
 * block's toolbar shows it, and it stays open from block to block until you
 * close it, with × or the pencil again.
 *
 * The toolbar by the block keeps only the basics: the drag handle and the
 * movers, just left of the block; the block's icon and name; formatting text;
 * and the pencil. Everything else is in the panel, which has the whole
 * toolbar along its top while it's open.
 */
import {
	createReduxStore,
	register,
	useSelect,
	useDispatch,
} from '@wordpress/data';
import { BlockControls, BlockTitle } from '@wordpress/block-editor';
import { ToolbarButton, SVG, Path } from '@wordpress/components';
import { createHigherOrderComponent } from '@wordpress/compose';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

// Whether the panel is open. Not saved: every visit starts with it closed.
export const store = createReduxStore( 'nevelson', {
	reducer( state = { open: false }, action ) {
		return action.type === 'SET_OPEN' ? { open: action.open } : state;
	},
	actions: {
		setOpen: ( open ) => ( { type: 'SET_OPEN', open } ),
	},
	selectors: {
		isOpen: ( state ) => state.open,
	},
} );
register( store );

// A pencil: edit this block.
const pencilIcon = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Path d="m19 7-3-3-8.5 8.5-1 4 4-1L19 7Zm-7 11.5H5V20h7v-1.5Z" />
	</SVG>
);

function SettingsButton( { clientId } ) {
	const open = useSelect( ( select ) => select( store ).isOpen(), [] );
	const { setOpen } = useDispatch( store );
	return (
		<>
			{ /* The block's name, after its icon. A section's toolbar only has
			   the "other" group, so the name is there too, shown only when
			   the first isn't. */ }
			<BlockControls group="parent">
				<span className="nevelson-block-name is-first">
					<BlockTitle clientId={ clientId } />
				</span>
			</BlockControls>
			{ /* Marks the toolbar's formatting group (bold, italic, link), the
			   only one that stays by the block: the rest are in the panel. */ }
			<BlockControls group="inline">
				<span className="nevelson-inline-marker" hidden />
			</BlockControls>
			<BlockControls group="other">
				<span className="nevelson-block-name is-fallback">
					<BlockTitle clientId={ clientId } />
				</span>
				<ToolbarButton
					className="nevelson-toolbar-button"
					icon={ pencilIcon }
					label={ __( 'Block settings', 'nevelson' ) }
					isPressed={ open }
					aria-expanded={ open }
					onClick={ () => setOpen( ! open ) }
				/>
			</BlockControls>
		</>
	);
}

addFilter(
	'editor.BlockEdit',
	'nevelson/settings-button',
	createHigherOrderComponent(
		( BlockEdit ) => ( props ) => (
			<>
				<BlockEdit { ...props } />
				{ props.isSelected && (
					<SettingsButton clientId={ props.clientId } />
				) }
			</>
		),
		'withNevelsonSettingsButton'
	)
);
