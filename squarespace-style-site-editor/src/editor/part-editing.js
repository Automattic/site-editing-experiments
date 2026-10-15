/**
 * Editing the site header and footer, as in Squarespace: hover shows "Edit
 * site header" over the part; clicking it dims the rest of the page and
 * offers Add elements and Edit design (Layout and Color). Click outside the
 * part or press Escape to finish.
 */
import { __ } from '@wordpress/i18n';
import { useDispatch, useRegistry, useSelect } from '@wordpress/data';
import { useEffect, useMemo, useState } from '@wordpress/element';
import { useRefEffect } from '@wordpress/compose';
import { createBlock, parse } from '@wordpress/blocks';
import { store as coreStore } from '@wordpress/core-data';
import {
	BlockIcon,
	BlockPreview,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { Button, Dropdown, Popover, TabPanel } from '@wordpress/components';
import {
	button as buttonIcon,
	close as closeIcon,
	Icon,
	pencil,
	plus,
	search as searchIcon,
	share,
	siteLogo,
	tag,
} from '@wordpress/icons';

import { STORE_NAME } from './store';
import { getThemeFromClassName, withTheme } from './settings';
import ThemeSwatches from './theme-swatches';

const ELEMENTS = [
	{
		key: 'button',
		label: __( 'Button', 'squarespace-style-site-editor' ),
		icon: buttonIcon,
		create: () =>
			createBlock( 'core/buttons', {}, [
				createBlock( 'core/button', {
					text: __( 'Get in touch', 'squarespace-style-site-editor' ),
				} ),
			] ),
	},
	{
		key: 'social',
		label: __( 'Social links', 'squarespace-style-site-editor' ),
		icon: share,
		create: () =>
			createBlock( 'core/social-links', {}, [
				createBlock( 'core/social-link', {
					service: 'instagram',
					url: '#',
				} ),
				createBlock( 'core/social-link', {
					service: 'facebook',
					url: '#',
				} ),
			] ),
	},
	{
		key: 'search',
		label: __( 'Search', 'squarespace-style-site-editor' ),
		icon: searchIcon,
		create: () =>
			createBlock( 'core/search', {
				buttonPosition: 'button-only',
				buttonUseIcon: true,
				showLabel: false,
			} ),
	},
	{
		key: 'logo',
		label: __( 'Logo', 'squarespace-style-site-editor' ),
		icon: siteLogo,
		create: () => createBlock( 'core/site-logo' ),
	},
	{
		key: 'tagline',
		label: __( 'Tagline', 'squarespace-style-site-editor' ),
		icon: tag,
		create: () => createBlock( 'core/site-tagline' ),
	},
];

export function partArea( attributes ) {
	const area = attributes?.area || attributes?.slug || '';
	if ( area.includes( 'footer' ) ) {
		return 'footer';
	}
	if ( area.includes( 'header' ) ) {
		return 'header';
	}
	return area;
}

/**
 * Where new elements go: next to the navigation if there is one (that's the
 * row of things on the right in most headers), otherwise at the end.
 *
 * @param {(store: string) => Object} select   Registry select.
 * @param {string}                    clientId Template part block.
 * @return {{ rootClientId: string, index: number }} Insertion point.
 */
function insertionPoint( select, clientId ) {
	const be = select( blockEditorStore );
	const nav = be
		.getClientIdsOfDescendants( clientId )
		.find( ( id ) => be.getBlockName( id ) === 'core/navigation' );
	if ( nav ) {
		const rootClientId = be.getBlockRootClientId( nav );
		return {
			rootClientId,
			index: be.getBlockIndex( nav ) + 1,
		};
	}
	return { rootClientId: clientId, index: be.getBlockCount( clientId ) };
}

function AddElements( { clientId } ) {
	const { insertBlock } = useDispatch( blockEditorStore );
	const point = useSelect(
		( select ) => insertionPoint( select, clientId ),
		[ clientId ]
	);
	return (
		<Dropdown
			popoverProps={ {
				placement: 'bottom-start',
				className: 'sse-add-block-popover',
			} }
			renderToggle={ ( { isOpen, onToggle } ) => (
				<button
					type="button"
					className="sse-part-button"
					onClick={ onToggle }
					aria-expanded={ isOpen }
				>
					<Icon icon={ plus } size={ 20 } />
					{ __( 'Add elements', 'squarespace-style-site-editor' ) }
				</button>
			) }
			renderContent={ ( { onClose } ) => (
				<div className="sse-add-block">
					<p className="sse-add-block__title">
						{ __( 'Elements', 'squarespace-style-site-editor' ) }
					</p>
					<div className="sse-add-block__tiles">
						{ ELEMENTS.map( ( item ) => (
							<button
								key={ item.key }
								type="button"
								className="sse-add-block__tile"
								onClick={ () => {
									insertBlock(
										item.create(),
										point.index,
										point.rootClientId
									);
									onClose();
								} }
							>
								<BlockIcon icon={ item.icon } />
								<span>{ item.label }</span>
							</button>
						) ) }
					</div>
				</div>
			) }
		/>
	);
}

function LayoutOption( { pattern, onChoose } ) {
	const blocks = useMemo(
		() => parse( pattern.content, { __unstableSkipMigrationLogs: true } ),
		[ pattern.content ]
	);
	return (
		<button
			type="button"
			className="sse-layouts__card"
			onClick={ () => onChoose( blocks ) }
		>
			<span className="sse-layouts__preview is-part" aria-hidden="true">
				<BlockPreview blocks={ blocks } viewportWidth={ 960 } />
			</span>
			<span className="sse-layouts__title">{ pattern.title }</span>
		</button>
	);
}

function DesignPanel( { clientId, area, attributes, onClose } ) {
	const { replaceInnerBlocks, updateBlockAttributes } =
		useDispatch( blockEditorStore );
	const patterns = useSelect(
		( select ) =>
			( select( coreStore ).getBlockPatterns() || [] ).filter( ( p ) =>
				( p.block_types || p.blockTypes || [] ).includes(
					`core/template-part/${ area }`
				)
			),
		[ area ]
	);

	return (
		<div className="sse-panel">
			<TabPanel
				className="sse-panel__tabs"
				tabs={ [
					{
						name: 'design',
						title: __( 'Design', 'squarespace-style-site-editor' ),
					},
					{
						name: 'color',
						title: __( 'Color', 'squarespace-style-site-editor' ),
					},
				] }
			>
				{ ( tab ) =>
					tab.name === 'color' ? (
						<div className="sse-panel__body">
							<p className="sse-panel__help">
								{ __(
									'No theme follows the site background. Pick a colour theme to give it its own colours.',
									'squarespace-style-site-editor'
								) }
							</p>
							<ThemeSwatches
								value={ getThemeFromClassName(
									attributes.className
								) }
								onChange={ ( slug ) =>
									updateBlockAttributes( clientId, {
										className: withTheme(
											attributes.className,
											slug
										),
									} )
								}
							/>
						</div>
					) : (
						<div className="sse-panel__body">
							<p className="sse-panel__heading">
								{ __(
									'Layout',
									'squarespace-style-site-editor'
								) }
							</p>
							{ patterns.length === 0 && (
								<p className="sse-panel__help">
									{ __(
										'Your theme doesn’t offer other layouts for this.',
										'squarespace-style-site-editor'
									) }
								</p>
							) }
							<div className="sse-layouts__grid">
								{ patterns.map( ( pattern ) => (
									<LayoutOption
										key={ pattern.name }
										pattern={ pattern }
										onChoose={ ( blocks ) =>
											replaceInnerBlocks(
												clientId,
												blocks
											)
										}
									/>
								) ) }
							</div>
						</div>
					)
				}
			</TabPanel>
			<Button
				className="sse-panel__close"
				size="small"
				icon={ closeIcon }
				label={ __( 'Close', 'squarespace-style-site-editor' ) }
				onClick={ onClose }
			/>
		</div>
	);
}

/**
 * Leaves part editing on Escape or a click in the canvas outside the part
 * and its buttons. Rendered once, outside the canvas.
 */
export function PartEditingManager() {
	const editingPart = useSelect(
		( select ) => select( STORE_NAME ).getEditingPart(),
		[]
	);
	const { stopEditingPart } = useDispatch( STORE_NAME );

	useEffect( () => {
		if ( ! editingPart ) {
			return;
		}
		const canvasDoc = () =>
			document.querySelector( 'iframe[name="editor-canvas"]' )
				?.contentDocument;
		const onDown = ( event ) => {
			const target = event.target;
			if ( ! target?.closest ) {
				return;
			}
			if ( target.closest( '.is-sse-editing-part, .sse-part-chrome' ) ) {
				return;
			}
			stopEditingPart();
		};
		const onKey = ( event ) => {
			if (
				event.key === 'Escape' &&
				! document.querySelector(
					'.components-popover:not(.block-editor-block-popover)'
				)
			) {
				stopEditingPart();
			}
		};
		// Listen on the canvas window, capturing, so nothing in the editor
		// can stop the event first.
		let doc = null;
		const attach = () => {
			const next = canvasDoc();
			if ( next && next !== doc ) {
				doc?.defaultView?.removeEventListener(
					'pointerdown',
					onDown,
					true
				);
				doc?.removeEventListener( 'keydown', onKey );
				doc = next;
				doc.defaultView.addEventListener( 'pointerdown', onDown, true );
				doc.addEventListener( 'keydown', onKey );
			}
		};
		// Core draws some canvas overlays (like the insertion point between
		// blocks) outside the iframe; clicking those counts as outside too.
		const onMainDown = ( event ) => {
			if (
				event.target?.closest?.(
					'.block-editor-block-list__insertion-point'
				)
			) {
				stopEditingPart();
			}
		};
		attach();
		const timer = setInterval( attach, 1000 );
		document.addEventListener( 'keydown', onKey );
		window.addEventListener( 'pointerdown', onMainDown, true );
		return () => {
			clearInterval( timer );
			doc?.defaultView?.removeEventListener(
				'pointerdown',
				onDown,
				true
			);
			doc?.removeEventListener( 'keydown', onKey );
			document.removeEventListener( 'keydown', onKey );
			window.removeEventListener( 'pointerdown', onMainDown, true );
		};
	}, [ editingPart, stopEditingPart ] );

	return null;
}

/**
 * The header/footer chrome, rendered in the part's anchor.
 *
 * @param {Object} props
 * @param {string} props.clientId Template part block.
 * @param {Object} props.info     Section info.
 */
export function PartChrome( { clientId, info } ) {
	const registry = useRegistry();
	const isEditing = useSelect(
		( select ) => select( STORE_NAME ).getEditingPart() === clientId,
		[ clientId ]
	);
	const { startEditingPart } = useDispatch( STORE_NAME );
	const { clearSelectedBlock } = useDispatch( blockEditorStore );
	const [ designAnchor, setDesignAnchor ] = useState( null );
	const [ designOpen, setDesignOpen ] = useState( false );
	const area = partArea( info.attributes );

	// Height of the part, so the buttons can sit just below it.
	// The part's element can be replaced as the editor re-renders, so look it
	// up each time rather than observing one element.
	const measureRef = useRefEffect(
		( chrome ) => {
			const doc = chrome.ownerDocument;
			const view = doc.defaultView;
			let last = -1;
			const update = () => {
				const height =
					doc.getElementById( `block-${ clientId }` )?.offsetHeight ??
					0;
				if ( height !== last ) {
					last = height;
					chrome.style.setProperty( '--sse-part-h', `${ height }px` );
				}
			};
			update();
			const timer = view.setInterval( update, 300 );
			return () => view.clearInterval( timer );
		},
		[ clientId ]
	);

	useEffect( () => {
		if ( ! isEditing ) {
			setDesignOpen( false );
		}
	}, [ isEditing ] );

	// Template parts are locked inside a template. While this one is being
	// edited, unlock it and everything in it; edits save to the part itself.
	useEffect( () => {
		if ( ! isEditing ) {
			return;
		}
		const ids = [
			clientId,
			...registry
				.select( blockEditorStore )
				.getClientIdsOfDescendants( clientId ),
		];
		const { setBlockEditingMode, unsetBlockEditingMode } =
			registry.dispatch( blockEditorStore );
		ids.forEach( ( id ) => setBlockEditingMode( id, 'default' ) );
		return () => ids.forEach( ( id ) => unsetBlockEditingMode( id ) );
	}, [ isEditing, clientId, registry ] );

	const label =
		area === 'footer'
			? __( 'Edit site footer', 'squarespace-style-site-editor' )
			: __( 'Edit site header', 'squarespace-style-site-editor' );

	return (
		<div ref={ measureRef } className="sse-part-chrome">
			{ ! isEditing && (
				<div className="sse-part-hover">
					<button
						type="button"
						className="sse-part-button is-edit"
						onClick={ () => {
							// Deselect so the block toolbar doesn't cover
							// the part's own buttons.
							clearSelectedBlock();
							startEditingPart( clientId );
						} }
					>
						<Icon icon={ pencil } size={ 20 } />
						{ label }
					</button>
				</div>
			) }
			{ isEditing && (
				<div className="sse-part-actions">
					<AddElements clientId={ clientId } />
					<button
						type="button"
						ref={ setDesignAnchor }
						className="sse-part-button"
						aria-expanded={ designOpen }
						onClick={ () => setDesignOpen( ! designOpen ) }
					>
						<Icon icon={ pencil } size={ 20 } />
						{ __( 'Edit design', 'squarespace-style-site-editor' ) }
					</button>
				</div>
			) }
			{ isEditing && designOpen && designAnchor && (
				<Popover
					anchor={ designAnchor }
					placement="bottom-end"
					offset={ 8 }
					className="sse-panel-popover"
					onClose={ () => setDesignOpen( false ) }
				>
					<DesignPanel
						clientId={ clientId }
						area={ area }
						attributes={ info.attributes }
						onClose={ () => setDesignOpen( false ) }
					/>
				</Popover>
			) }
		</div>
	);
}
