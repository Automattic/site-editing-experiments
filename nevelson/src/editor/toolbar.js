/**
 * The panel opens from the block toolbar, not by itself: a settings button
 * in every block's toolbar shows it, and it stays open from block to block
 * until you close it, with × or the button again.
 */
import {
	createReduxStore,
	register,
	useSelect,
	useDispatch,
} from '@wordpress/data';
import { BlockControls } from '@wordpress/block-editor';
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

const settingsIcon = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Path d="m19 7.5h-7.628c-.3089-.87389-1.1423-1.5-2.122-1.5-.97966 0-1.81309.62611-2.12197 1.5h-2.12803v1.5h2.12803c.30888.87389 1.14231 1.5 2.12197 1.5.9797 0 1.8131-.62611 2.122-1.5h7.628z" />
		<Path d="m19 15h-2.128c-.3089-.8739-1.1423-1.5-2.122-1.5s-1.8131.6261-2.122 1.5h-7.628v1.5h7.628c.3089.8739 1.1423 1.5 2.122 1.5s1.8131-.6261 2.122-1.5h2.128z" />
	</SVG>
);

function SettingsButton() {
	const open = useSelect( ( select ) => select( store ).isOpen(), [] );
	const { setOpen } = useDispatch( store );
	return (
		<BlockControls group="other">
			<ToolbarButton
				className="nevelson-toolbar-button"
				icon={ settingsIcon }
				label={ __( 'Block settings', 'nevelson' ) }
				isPressed={ open }
				aria-expanded={ open }
				onClick={ () => setOpen( ! open ) }
			/>
		</BlockControls>
	);
}

addFilter(
	'editor.BlockEdit',
	'nevelson/settings-button',
	createHigherOrderComponent(
		( BlockEdit ) => ( props ) => (
			<>
				<BlockEdit { ...props } />
				{ props.isSelected && <SettingsButton /> }
			</>
		),
		'withNevelsonSettingsButton'
	)
);
