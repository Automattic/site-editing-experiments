/**
 * The writing toolbar, like Word's Home tab: Style, Font, Size, bigger and
 * smaller, and font colour. Bold, italic, links and the rest are the editor's
 * own, and stay next to these.
 */
import { __, sprintf } from '@wordpress/i18n';
import { useMemo, useState, useRef, useEffect } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';
import {
	store as blockEditorStore,
	useSettings,
} from '@wordpress/block-editor';
import {
	ToolbarGroup,
	ToolbarItem,
	ToolbarButton,
	Dropdown,
	Button,
	MenuGroup,
	MenuItem,
	ColorPalette,
} from '@wordpress/components';
import { chevronDown, check } from '@wordpress/icons';
import {
	measurePresets,
	fontsOf,
	lookOf,
	blocksForPreset,
	ownSizeAttributes,
	stepPreset,
	presetInFont,
	PRESET_BLOCKS,
} from './presets';
import { usePalette, hexOf, kindOf, setColour } from './colour';

const MIN = 8;
const MAX = 160;

function useFontSizes() {
	const [ sizes ] = useSettings( 'typography.fontSizes' );
	if ( Array.isArray( sizes ) ) {
		return sizes;
	}
	return ( sizes && ( sizes.theme || sizes.default ) ) || [];
}

/**
 * A toolbar button that opens a menu, looking like one of Word's boxes.
 * @param root0
 * @param root0.className
 * @param root0.label
 * @param root0.text
 * @param root0.style
 * @param root0.children
 * @param root0.width
 */
function Box( { className, label, text, style, children, width } ) {
	return (
		<ToolbarItem>
			{ ( itemProps ) => (
				<Dropdown
					className="fk-box"
					popoverProps={ {
						placement: 'bottom-start',
						className: 'fk-popover',
					} }
					renderToggle={ ( { isOpen, onToggle } ) => (
						<Button
							{ ...itemProps }
							className={ `fk-box__toggle ${ className || '' }` }
							onClick={ onToggle }
							aria-expanded={ isOpen }
							label={ label }
							showTooltip
							style={ { width } }
						>
							<span className="fk-box__text" style={ style }>
								{ text }
							</span>
							<span className="fk-box__chevron">
								{ chevronDown }
							</span>
						</Button>
					) }
					renderContent={ children }
				/>
			) }
		</ToolbarItem>
	);
}

export default function WriteTools( { clientId } ) {
	const fontSizes = useFontSizes();
	const palette = usePalette();
	const { block, targetId } = useSelect(
		( select ) => {
			const be = select( blockEditorStore );
			// Inside a quote, the quote is what has the look.
			const parent = be.getBlockRootClientId( clientId );
			const id =
				parent &&
				be.getBlockName( parent ) === 'core/quote' &&
				be.getBlockName( clientId ) === 'core/paragraph'
					? parent
					: clientId;
			return { block: be.getBlock( id ), targetId: id };
		},
		[ clientId ]
	);
	const { replaceBlocks, updateBlockAttributes } =
		useDispatch( blockEditorStore );
	const [ version, setVersion ] = useState( 0 );

	const presets = useMemo(
		() => measurePresets( fontSizes ),
		[ fontSizes, version ]
	);
	const remeasure = () => setVersion( ( v ) => v + 1 );

	if ( ! block ) {
		return null;
	}
	const hasPresets = PRESET_BLOCKS.includes( block.name ) && presets.length;
	const look = hasPresets
		? lookOf( block, presets )
		: { preset: undefined, custom: null };
	const fonts = fontsOf( presets );
	const kind = kindOf( block.name );

	const apply = ( preset, keepPx = null ) => {
		if (
			look.preset &&
			preset.id === look.preset.id &&
			! look.custom &&
			! keepPx
		) {
			return;
		}
		const next = blocksForPreset( block, preset, keepPx );
		if ( ! next ) {
			return;
		}
		if ( next.length === 1 && next[ 0 ].clientId === block.clientId ) {
			updateBlockAttributes( targetId, next[ 0 ].attributes );
		} else {
			replaceBlocks( targetId, next );
		}
	};
	const setOwnSize = ( px ) => {
		if ( ! Number.isFinite( px ) ) {
			return;
		}
		const n = Math.round( Math.min( MAX, Math.max( MIN, px ) ) );
		const family = look.preset ? look.preset.family : null;
		const same = presets.find(
			( p ) => ! p.hidden && p.family === family && p.px === n
		);
		if ( same ) {
			apply( same );
		} else {
			updateBlockAttributes( targetId, ownSizeAttributes( block, n ) );
		}
	};
	const sizeNow = look.custom || ( look.preset && look.preset.px );
	const bigger = stepPreset( presets, look, 1 );
	const smaller = stepPreset( presets, look, -1 );

	return (
		<ToolbarGroup className="fk-tools fk-write-tools">
			{ hasPresets && look.preset && (
				<>
					<Box
						className="fk-style"
						label={ __( 'Style', 'frankenthaler' ) }
						text={ look.preset.name }
						style={ { fontFamily: look.preset.css } }
						width={ 140 }
					>
						{ ( { onClose } ) => (
							<div
								className="fk-menu fk-menu--styles"
								onFocus={ remeasure }
							>
								{ fonts.map( ( font ) => (
									<MenuGroup
										key={ font.family }
										label={ font.family }
									>
										{ presets
											.filter(
												( p ) =>
													! p.hidden &&
													p.family === font.family
											)
											.map( ( p ) => (
												<MenuItem
													key={ p.id }
													role="menuitemradio"
													isSelected={
														look.preset.id === p.id
													}
													icon={
														look.preset.id === p.id
															? check
															: null
													}
													suffix={
														<span className="fk-px">
															{ p.px }
														</span>
													}
													onClick={ () => {
														apply( p );
														onClose();
													} }
												>
													<span
														className="fk-sample"
														style={ {
															fontFamily: p.css,
															fontSize: Math.min(
																p.px,
																30
															),
														} }
													>
														{ p.name }
													</span>
												</MenuItem>
											) ) }
									</MenuGroup>
								) ) }
								<p className="fk-menu__foot">
									{ __(
										'These are the styles your theme offers. Change them for the whole site in Styles.',
										'frankenthaler'
									) }
								</p>
							</div>
						) }
					</Box>
					<Box
						className="fk-font"
						label={ __( 'Font', 'frankenthaler' ) }
						text={ look.preset.family }
						style={ { fontFamily: look.preset.css } }
						width={ 150 }
					>
						{ ( { onClose } ) => (
							<div className="fk-menu">
								<MenuGroup>
									{ fonts.map( ( font ) => (
										<MenuItem
											key={ font.family }
											role="menuitemradio"
											isSelected={
												look.preset.family ===
												font.family
											}
											icon={
												look.preset.family ===
												font.family
													? check
													: null
											}
											onClick={ () => {
												const p = presetInFont(
													presets,
													look,
													font.family
												);
												if ( p ) {
													apply( p, look.custom );
												}
												onClose();
											} }
										>
											<span
												className="fk-sample"
												style={ {
													fontFamily: font.css,
													fontSize: 18,
												} }
											>
												{ font.family }
											</span>
										</MenuItem>
									) ) }
								</MenuGroup>
								<p className="fk-menu__foot">
									{ __(
										'Your theme’s fonts. Each comes in a few sizes.',
										'frankenthaler'
									) }
								</p>
							</div>
						) }
					</Box>
					<Box
						className={ `fk-size${ look.custom ? ' is-custom' : '' }` }
						label={
							look.custom
								? __( 'Size: your own', 'frankenthaler' )
								: __( 'Size', 'frankenthaler' )
						}
						text={ sizeNow }
						width={ 78 }
					>
						{ ( { onClose } ) => (
							<SizeMenu
								presets={ presets }
								look={ look }
								onPick={ ( p ) => apply( p ) }
								onOwn={ setOwnSize }
								onClose={ onClose }
							/>
						) }
					</Box>
					<ToolbarButton
						className="fk-step"
						label={ __( 'Bigger text', 'frankenthaler' ) }
						disabled={ ! bigger }
						onClick={ () => bigger && apply( bigger ) }
					>
						<span className="fk-aa">
							A<small>▲</small>
						</span>
					</ToolbarButton>
					<ToolbarButton
						className="fk-step"
						label={ __( 'Smaller text', 'frankenthaler' ) }
						disabled={ ! smaller }
						onClick={ () => smaller && apply( smaller ) }
					>
						<span className="fk-aa fk-aa--small">
							A<small>▼</small>
						</span>
					</ToolbarButton>
				</>
			) }
			{ kind && (
				<ColourBox block={ block } kind={ kind } palette={ palette } />
			) }
		</ToolbarGroup>
	);
}

function SizeMenu( { presets, look, onPick, onOwn, onClose } ) {
	const input = useRef();
	const now = look.custom || look.preset.px;
	const [ value, setValue ] = useState( String( now ) );
	useEffect( () => {
		if ( input.current ) {
			input.current.focus();
			input.current.select();
		}
	}, [] );
	const sizes = presets
		.filter( ( p ) => ! p.hidden && p.family === look.preset.family )
		.sort( ( a, b ) => b.px - a.px );
	return (
		<div className="fk-menu fk-menu--sizes">
			<form
				className="fk-size-form"
				onSubmit={ ( e ) => {
					e.preventDefault();
					onOwn( parseFloat( value ) );
					onClose();
				} }
			>
				<input
					ref={ input }
					type="number"
					inputMode="decimal"
					value={ value }
					onChange={ ( e ) => setValue( e.target.value ) }
					aria-label={ __( 'Font size in pixels', 'frankenthaler' ) }
				/>
				<span className="fk-unit">px</span>
				<Button variant="primary" type="submit" size="compact">
					{ __( 'Set', 'frankenthaler' ) }
				</Button>
			</form>
			<MenuGroup
				label={ sprintf(
					/* translators: %s: font name */ __(
						'%s sizes',
						'frankenthaler'
					),
					look.preset.family
				) }
			>
				{ sizes.map( ( p ) => {
					const on = ! look.custom && look.preset.id === p.id;
					return (
						<MenuItem
							key={ p.id }
							role="menuitemradio"
							isSelected={ on }
							icon={ on ? check : null }
							suffix={ <span className="fk-px">{ p.px }</span> }
							onClick={ () => {
								onPick( p );
								onClose();
							} }
						>
							<span
								className="fk-sample"
								style={ {
									fontFamily: p.css,
									fontSize: Math.min( p.px, 34 ),
								} }
							>
								{ p.name }
							</span>
						</MenuItem>
					);
				} ) }
			</MenuGroup>
			<p className="fk-menu__foot">
				{ look.custom
					? __(
							'This is your own size. Pick one of the theme’s to go back to it.',
							'frankenthaler'
						)
					: __(
							'Type any size above, or pick one of the theme’s.',
							'frankenthaler'
						) }
			</p>
		</div>
	);
}

/**
 * Word's font colour button: an A with a bar of the current colour under it.
 * @param root0
 * @param root0.block
 * @param root0.kind
 * @param root0.palette
 * @param root0.siblings
 * @param root0.label
 * @param root0.design
 */
export function ColourBox( { block, kind, palette, siblings, label, design } ) {
	const a = block.attributes;
	const isBg = kind === 'button' || kind === 'section'; // outline buttons and text use the text colour
	const hex = isBg
		? hexOf(
				a.backgroundColor,
				a.style && a.style.color && a.style.color.background,
				palette
			)
		: hexOf(
				a.textColor,
				a.style && a.style.color && a.style.color.text,
				palette
			);
	return (
		<ToolbarItem>
			{ ( itemProps ) => (
				<Dropdown
					popoverProps={ {
						placement: 'bottom-start',
						className: 'fk-popover',
					} }
					renderToggle={ ( { isOpen, onToggle } ) =>
						design ? (
							<Button
								{ ...itemProps }
								className="fk-box__toggle fk-colour-box"
								onClick={ onToggle }
								aria-expanded={ isOpen }
								label={ label }
								showTooltip
							>
								<span
									className="fk-dot"
									style={ {
										background: hex || 'transparent',
									} }
								/>
								<span className="fk-box__text">{ label }</span>
								<span className="fk-box__chevron">
									{ chevronDown }
								</span>
							</Button>
						) : (
							<Button
								{ ...itemProps }
								className="fk-font-colour"
								onClick={ onToggle }
								aria-expanded={ isOpen }
								label={ __( 'Font colour', 'frankenthaler' ) }
								showTooltip
							>
								<span className="fk-font-colour__a">A</span>
								<span
									className="fk-font-colour__bar"
									style={ {
										background: hex || 'currentColor',
									} }
								/>
							</Button>
						)
					}
					renderContent={ () => (
						<div className="fk-colours">
							<ColorPalette
								colors={ palette }
								value={ hex }
								clearable
								// Not closing on change: the custom colour picker changes as you drag.
								onChange={ ( next ) =>
									setColour(
										block.clientId,
										kind,
										next,
										palette,
										siblings
									)
								}
							/>
						</div>
					) }
				/>
			) }
		</ToolbarItem>
	);
}
