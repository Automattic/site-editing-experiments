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
import { createPortal, useEffect, useRef, useState } from '@wordpress/element';
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

const chevronDown = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Path d="M17.5 11.6 12 16l-5.5-4.4.9-1.2L12 14l4.5-3.6 1 1.2z" />
	</SVG>
);

/**
 * The block's name, and a chevron, in the toolbar's block switcher, after the
 * block's icon: the whole thing is one button that opens the list of blocks
 * to turn it into, below it. Blocks that can't be turned into others have an
 * icon that isn't a button, and get the name without the chevron.
 *
 * It's put into core's button from outside, as core has no place for it.
 *
 * @param {Object} props
 * @param {string} props.clientId The block.
 */
function NameInSwitcher( { clientId } ) {
	const anchor = useRef();
	const [ button, setButton ] = useState( null );
	useEffect( () => {
		const find = () => {
			const toolbar = anchor.current?.closest(
				'.block-editor-block-toolbar'
			);
			const found = toolbar?.querySelector(
				'.block-editor-block-switcher > .components-dropdown-menu__toggle, .block-editor-block-toolbar__block-icon-button'
			);
			setButton( ( prev ) => ( prev === found ? prev : found || null ) );
		};
		find();
		const t = setInterval( find, 300 );
		return () => clearInterval( t );
	}, [ clientId ] );
	const canSwitch = !! button?.closest( '.block-editor-block-switcher' );

	// The list opens downward, just below the button, whatever room there
	// is: core would flip it above when it's taller than the room below.
	// Nevelson keeps where in CSS variables, so the styles place it.
	useEffect( () => {
		if ( ! button ) {
			return;
		}
		let frame;
		const place = () => {
			frame = window.requestAnimationFrame( place );
			if ( button.getAttribute( 'aria-expanded' ) !== 'true' ) {
				return;
			}
			const r = button.getBoundingClientRect();
			const body = document.body.style;
			body.setProperty(
				'--nevelson-switcher-left',
				`${ Math.round( r.left ) }px`
			);
			body.setProperty(
				'--nevelson-switcher-top',
				`${ Math.round( r.bottom + 8 ) }px`
			);
		};
		place();
		return () => window.cancelAnimationFrame( frame );
	}, [ button ] );
	return (
		<>
			<span ref={ anchor } hidden />
			{ button &&
				createPortal(
					// React sends clicks on this to Nevelson's component, not
					// to core's button it's in: pass them on.
					// eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
					<span
						className="nevelson-switcher-label"
						onClick={ ( event ) => {
							event.stopPropagation();
							button.click();
						} }
					>
						<BlockTitle clientId={ clientId } />
						{ canSwitch && chevronDown }
					</span>,
					button
				) }
		</>
	);
}

function SettingsButton( { clientId } ) {
	const open = useSelect( ( select ) => select( store ).isOpen(), [] );
	const { setOpen } = useDispatch( store );
	return (
		<>
			{ /* Marks the toolbar's formatting group (bold, italic, link), the
			   only one that stays by the block: the rest are in the panel. */ }
			<BlockControls group="inline">
				<span className="nevelson-inline-marker" hidden />
			</BlockControls>
			<BlockControls group="other">
				<NameInSwitcher clientId={ clientId } />
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
