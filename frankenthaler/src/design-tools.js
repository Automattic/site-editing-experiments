/**
 * The design toolbar, like PowerPoint's: settings for how things look and
 * where they sit, rather than for the words. Moving things up and down and
 * dragging them are the editor's own controls, which show in this toolbar.
 */
import { __ } from '@wordpress/i18n';
import { useSelect, useDispatch } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { getBlockType } from '@wordpress/blocks';
import {
	ToolbarGroup,
	ToolbarItem,
	ToolbarButton,
	Dropdown,
	Button,
	MenuGroup,
	MenuItem,
} from '@wordpress/components';
import {
	chevronDown,
	check,
	stretchFullWidth,
	pullLeft,
	pullRight,
} from '@wordpress/icons';
import { usePalette } from './colour';
import { ColourBox } from './write-tools';

export const SECTION_BLOCKS = [
	'core/group',
	'core/media-text',
	'core/columns',
	'core/cover',
];

function Menu( { label, text, icon, options, current, onPick, sample } ) {
	return (
		<ToolbarItem>
			{ ( itemProps ) => (
				<Dropdown
					popoverProps={ {
						placement: 'bottom-start',
						className: 'fk-popover',
					} }
					renderToggle={ ( { isOpen, onToggle } ) => (
						<Button
							{ ...itemProps }
							className="fk-box__toggle"
							onClick={ onToggle }
							aria-expanded={ isOpen }
							label={ label }
							showTooltip
						>
							{ icon }
							<span className="fk-box__text">{ text }</span>
							<span className="fk-box__chevron">
								{ chevronDown }
							</span>
						</Button>
					) }
					renderContent={ ( { onClose } ) => (
						<div className="fk-menu">
							<MenuGroup label={ label }>
								{ options.map( ( o ) => (
									<MenuItem
										key={ o.id }
										role="menuitemradio"
										isSelected={ current === o.id }
										icon={ current === o.id ? check : null }
										info={ o.note }
										onClick={ () => {
											onPick( o );
											onClose();
										} }
									>
										{ sample ? sample( o ) : o.name }
									</MenuItem>
								) ) }
							</MenuGroup>
						</div>
					) }
				/>
			) }
		</ToolbarItem>
	);
}

function mergeStyle( style, path, value ) {
	const next = JSON.parse( JSON.stringify( style || {} ) );
	let o = next;
	path.slice( 0, -1 ).forEach( ( k ) => {
		o[ k ] = o[ k ] || {};
		o = o[ k ];
	} );
	if ( value === undefined ) {
		delete o[ path[ path.length - 1 ] ];
	} else {
		o[ path[ path.length - 1 ] ] = value;
	}
	return next;
}

// ---------- Buttons ----------

const BUTTON_STYLES = [
	{ id: 'fill', name: __( 'Filled', 'frankenthaler' ) },
	{ id: 'outline', name: __( 'Outline', 'frankenthaler' ) },
];
const BUTTON_SIZES = [
	{
		id: 's',
		name: __( 'Small', 'frankenthaler' ),
		fontSize: 'small',
		padding: { top: '0.5em', bottom: '0.5em', left: '1em', right: '1em' },
	},
	{ id: 'm', name: __( 'Medium', 'frankenthaler' ) },
	{
		id: 'l',
		name: __( 'Large', 'frankenthaler' ),
		fontSize: 'large',
		padding: {
			top: '0.9em',
			bottom: '0.9em',
			left: '1.8em',
			right: '1.8em',
		},
	},
];
const CORNERS = [
	{ id: 'round', name: __( 'Round', 'frankenthaler' ), radius: '9999px' },
	{ id: 'soft', name: __( 'Soft', 'frankenthaler' ), radius: '8px' },
	{ id: 'square', name: __( 'Square', 'frankenthaler' ), radius: '0px' },
	{ id: 'theme', name: __( 'Theme default', 'frankenthaler' ) },
];

function ButtonTools( { block, palette } ) {
	const { updateBlockAttributes } = useDispatch( blockEditorStore );
	const a = block.attributes;
	const set = ( attrs ) => updateBlockAttributes( block.clientId, attrs );
	const outline = /\bis-style-outline\b/.test( a.className || '' );
	const size =
		a.fontSize === 'small' ? 's' : a.fontSize === 'large' ? 'l' : 'm';
	const radius = a.style && a.style.border && a.style.border.radius;
	const corner = (
		CORNERS.find( ( c ) => c.radius && c.radius === radius ) || CORNERS[ 3 ]
	).id;
	// Newer WordPress keeps a button's width in its dimensions style; older in a `width` attribute.
	const legacyWidth = !! ( getBlockType( 'core/button' ).attributes || {} )
		.width;
	const wide = legacyWidth
		? a.width === 100
		: !! (
				a.style &&
				a.style.dimensions &&
				a.style.dimensions.width === '100%'
			);
	return (
		<>
			<Menu
				label={ __( 'Button style', 'frankenthaler' ) }
				text={
					outline ? BUTTON_STYLES[ 1 ].name : BUTTON_STYLES[ 0 ].name
				}
				options={ BUTTON_STYLES }
				current={ outline ? 'outline' : 'fill' }
				sample={ ( o ) => (
					<span className="fk-btn-row">
						<span className={ `fk-btn-sample is-${ o.id }` }>
							{ __( 'Button', 'frankenthaler' ) }
						</span>
						{ o.name }
					</span>
				) }
				onPick={ ( o ) => {
					const cls = ( a.className || '' )
						.replace( /\bis-style-(fill|outline)\b/g, '' )
						.trim();
					const next = {
						className:
							[
								cls,
								o.id === 'outline' ? 'is-style-outline' : '',
							]
								.filter( Boolean )
								.join( ' ' ) || undefined,
					};
					// The button keeps its colour: as the fill, or as an outline's text and border.
					const style = {
						...( a.style || {} ),
						color: { ...( ( a.style || {} ).color || {} ) },
					};
					if ( o.id === 'outline' && ! outline ) {
						Object.assign( next, {
							textColor: a.backgroundColor,
							backgroundColor: undefined,
						} );
						style.color.text = style.color.background;
						delete style.color.background;
					} else if ( o.id === 'fill' && outline ) {
						Object.assign( next, {
							backgroundColor: a.textColor,
							textColor: undefined,
						} );
						style.color.background = style.color.text;
						delete style.color.text;
					}
					Object.keys( style.color ).forEach(
						( k ) =>
							style.color[ k ] === undefined &&
							delete style.color[ k ]
					);
					if ( ! Object.keys( style.color ).length ) {
						delete style.color;
					}
					next.style = Object.keys( style ).length
						? style
						: undefined;
					set( next );
				} }
			/>
			<ColourBox
				block={ block }
				kind={ outline ? 'outlineButton' : 'button' }
				palette={ palette }
				label={ __( 'Colour', 'frankenthaler' ) }
				design
			/>
			<Menu
				label={ __( 'Size', 'frankenthaler' ) }
				text={ BUTTON_SIZES.find( ( s ) => s.id === size ).name }
				options={ BUTTON_SIZES }
				current={ size }
				onPick={ ( o ) =>
					set( {
						fontSize: o.fontSize,
						style: mergeStyle(
							a.style,
							[ 'spacing', 'padding' ],
							o.padding
						),
					} )
				}
			/>
			<Menu
				label={ __( 'Corners', 'frankenthaler' ) }
				text={ __( 'Corners', 'frankenthaler' ) }
				options={ CORNERS }
				current={ corner }
				sample={ ( o ) => (
					<span className="fk-btn-row">
						<span
							className="fk-btn-sample is-fill"
							style={ { borderRadius: o.radius || 4 } }
						>
							{ __( 'Button', 'frankenthaler' ) }
						</span>
						{ o.name }
					</span>
				) }
				onPick={ ( o ) =>
					set( {
						style: mergeStyle(
							a.style,
							[ 'border', 'radius' ],
							o.radius
						),
					} )
				}
			/>
			<ToolbarButton
				icon={ stretchFullWidth }
				label={ __( 'Full width', 'frankenthaler' ) }
				isPressed={ wide }
				onClick={ () =>
					set(
						legacyWidth
							? { width: wide ? undefined : 100 }
							: {
									style: mergeStyle(
										a.style,
										[ 'dimensions', 'width' ],
										wide ? undefined : '100%'
									),
								}
					)
				}
			/>
		</>
	);
}

// ---------- Pictures ----------

const SHAPES = [
	{ id: 'original', name: __( 'Original', 'frankenthaler' ) },
	{ id: '4/3', name: __( 'Landscape', 'frankenthaler' ), ratio: '4/3' },
	{ id: '16/9', name: __( 'Wide', 'frankenthaler' ), ratio: '16/9' },
	{ id: '1', name: __( 'Square', 'frankenthaler' ), ratio: '1' },
	{ id: '3/4', name: __( 'Portrait', 'frankenthaler' ), ratio: '3/4' },
	{
		id: 'circle',
		name: __( 'Circle', 'frankenthaler' ),
		ratio: '1',
		radius: '9999px',
	},
	{
		id: 'arch',
		name: __( 'Arch', 'frankenthaler' ),
		ratio: '3/4',
		radius: {
			topLeft: '9999px',
			topRight: '9999px',
			bottomLeft: '0px',
			bottomRight: '0px',
		},
	},
];

function shapeOf( a ) {
	const r = a.style && a.style.border && a.style.border.radius;
	if ( r === '9999px' ) {
		return 'circle';
	}
	if ( r && typeof r === 'object' && r.topLeft === '9999px' ) {
		return 'arch';
	}
	return a.aspectRatio || 'original';
}

function ImageTools( { block } ) {
	const { updateBlockAttributes } = useDispatch( blockEditorStore );
	const a = block.attributes;
	const current = shapeOf( a );
	return (
		<Menu
			label={ __( 'Shape', 'frankenthaler' ) }
			text={
				( SHAPES.find( ( s ) => s.id === current ) || SHAPES[ 0 ] ).name
			}
			options={ SHAPES }
			current={ current }
			sample={ ( o ) => (
				<span className="fk-btn-row">
					<span
						className="fk-shape"
						style={ {
							aspectRatio: o.ratio || '4/3',
							borderRadius:
								typeof o.radius === 'string'
									? o.radius
									: o.radius
										? '999px 999px 2px 2px'
										: 2,
						} }
					/>
					{ o.name }
				</span>
			) }
			onPick={ ( o ) =>
				updateBlockAttributes( block.clientId, {
					aspectRatio: o.ratio,
					scale: o.ratio ? 'cover' : undefined,
					style: mergeStyle(
						a.style,
						[ 'border', 'radius' ],
						o.radius
					),
				} )
			}
		/>
	);
}

// ---------- Sections ----------

const SPACING = [
	{
		id: 'compact',
		name: __( 'Compact', 'frankenthaler' ),
		note: __( 'Less room above and below', 'frankenthaler' ),
		value: 'var:preset|spacing|40',
	},
	{
		id: 'comfortable',
		name: __( 'Comfortable', 'frankenthaler' ),
		note: __( 'The usual amount of room', 'frankenthaler' ),
		value: 'var:preset|spacing|60',
	},
	{
		id: 'spacious',
		name: __( 'Spacious', 'frankenthaler' ),
		note: __( 'Lots of room to breathe', 'frankenthaler' ),
		value: 'var:preset|spacing|80',
	},
];

function SectionTools( { block, palette } ) {
	const { updateBlockAttributes, replaceInnerBlocks } =
		useDispatch( blockEditorStore );
	const siblings = useSelect(
		( select ) =>
			select( blockEditorStore ).getBlockOrder(
				select( blockEditorStore ).getBlockRootClientId(
					block.clientId
				)
			),
		[ block.clientId ]
	);
	const a = block.attributes;
	const pad = a.style && a.style.spacing && a.style.spacing.padding;
	const spacing = (
		SPACING.find( ( s ) => pad && pad.top === s.value ) || {}
	).id;
	const canSwap =
		block.name === 'core/media-text' ||
		( block.name === 'core/columns' && block.innerBlocks.length === 2 );
	const mediaLeft =
		block.name === 'core/media-text' && a.mediaPosition !== 'right';
	return (
		<>
			{ block.name !== 'core/cover' && (
				<ColourBox
					block={ block }
					kind="section"
					palette={ palette }
					siblings={ siblings }
					label={ __( 'Background', 'frankenthaler' ) }
					design
				/>
			) }
			<Menu
				label={ __( 'Spacing', 'frankenthaler' ) }
				text={ __( 'Spacing', 'frankenthaler' ) }
				options={ SPACING }
				current={ spacing }
				onPick={ ( o ) =>
					updateBlockAttributes( block.clientId, {
						style: mergeStyle(
							mergeStyle(
								a.style,
								[ 'spacing', 'padding', 'top' ],
								o.value
							),
							[ 'spacing', 'padding', 'bottom' ],
							o.value
						),
					} )
				}
			/>
			{ canSwap && (
				<ToolbarButton
					icon={ mediaLeft ? pullRight : pullLeft }
					label={ __( 'Swap sides', 'frankenthaler' ) }
					onClick={ () => {
						if ( block.name === 'core/media-text' ) {
							updateBlockAttributes( block.clientId, {
								mediaPosition: mediaLeft ? 'right' : 'left',
							} );
						} else {
							replaceInnerBlocks(
								block.clientId,
								[ ...block.innerBlocks ].reverse(),
								false
							);
						}
					} }
				>
					{ __( 'Swap sides', 'frankenthaler' ) }
				</ToolbarButton>
			) }
		</>
	);
}

export default function DesignTools( { clientId } ) {
	const palette = usePalette();
	const block = useSelect(
		( select ) => select( blockEditorStore ).getBlock( clientId ),
		[ clientId ]
	);
	if ( ! block ) {
		return null;
	}
	let tools = null;
	if ( block.name === 'core/button' ) {
		tools = <ButtonTools block={ block } palette={ palette } />;
	} else if ( block.name === 'core/image' ) {
		tools = <ImageTools block={ block } />;
	} else if ( SECTION_BLOCKS.includes( block.name ) ) {
		tools = <SectionTools block={ block } palette={ palette } />;
	}
	return (
		tools && (
			<ToolbarGroup className="fk-tools fk-design-tools">
				{ tools }
			</ToolbarGroup>
		)
	);
}
