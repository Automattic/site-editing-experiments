/**
 * Alignment as panels in the block's settings, not toolbar dropdowns: the
 * toolbar's Align and Align text are out of the block's toolbar, and in the
 * panel every option can show at once.
 *
 * Each panel shows only when core's toolbar has the control for the block,
 * so it's offered where core would offer it; Nevelson hides core's dropdown
 * from the panel's band.
 */
/* eslint-disable @wordpress/no-unsafe-wp-apis -- Core's own panels use these. */
import {
	PanelBody,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOptionIcon as ToggleGroupControlOptionIcon,
} from '@wordpress/components';
/* eslint-enable @wordpress/no-unsafe-wp-apis */
import { useSelect, useDispatch } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { getBlockSupport } from '@wordpress/blocks';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	alignNone,
	positionLeft,
	positionCenter,
	positionRight,
	stretchWide,
	stretchFullWidth,
	alignLeft,
	alignCenter,
	alignRight,
	alignJustify,
} from '@wordpress/icons';

// Core's labels for its toolbar dropdowns, in core's text domain, so they
// match in any language.

export const coreAlignLabels = () => [ __( 'Align' ), __( 'Align text' ) ];

const BLOCK_ALIGNMENTS = [
	{ value: 'none', icon: alignNone, label: __( 'None', 'nevelson' ) },
	{ value: 'left', icon: positionLeft, label: __( 'Left', 'nevelson' ) },
	{
		value: 'center',
		icon: positionCenter,
		label: __( 'Center', 'nevelson' ),
	},
	{ value: 'right', icon: positionRight, label: __( 'Right', 'nevelson' ) },
	{ value: 'wide', icon: stretchWide, label: __( 'Wide width', 'nevelson' ) },
	{
		value: 'full',
		icon: stretchFullWidth,
		label: __( 'Full width', 'nevelson' ),
	},
];

const TEXT_ALIGNMENTS = [
	{ value: 'left', icon: alignLeft, label: __( 'Left', 'nevelson' ) },
	{ value: 'center', icon: alignCenter, label: __( 'Center', 'nevelson' ) },
	{ value: 'right', icon: alignRight, label: __( 'Right', 'nevelson' ) },
	{
		value: 'justify',
		icon: alignJustify,
		label: __( 'Justify', 'nevelson' ),
	},
];

// Which of core's alignment dropdowns the block toolbar has now.
function useToolbarHas() {
	const [ has, setHas ] = useState( { align: false, text: false } );
	useEffect( () => {
		const [ align, text ] = coreAlignLabels();
		const look = () => {
			const labels = [
				...document.querySelectorAll(
					'.block-editor-block-contextual-toolbar .components-dropdown-menu__toggle'
				),
			].map( ( b ) => b.getAttribute( 'aria-label' ) );
			const now = {
				align: labels.includes( align ),
				text: labels.includes( text ),
			};
			setHas( ( prev ) =>
				prev.align === now.align && prev.text === now.text ? prev : now
			);
		};
		look();
		const t = setInterval( look, 300 );
		return () => clearInterval( t );
	}, [] );
	return has;
}

// Drops empty objects, so clearing a value leaves no `style: {}` behind.
function clean( object ) {
	const out = {};
	for ( const [ key, value ] of Object.entries( object || {} ) ) {
		const v =
			value && typeof value === 'object' && ! Array.isArray( value )
				? clean( value )
				: value;
		if (
			v !== undefined &&
			! ( typeof v === 'object' && ! Object.keys( v ).length )
		) {
			out[ key ] = v;
		}
	}
	return out;
}

function Options( { label, value, options, onChange } ) {
	return (
		<ToggleGroupControl
			__next40pxDefaultSize
			__nextHasNoMarginBottom
			isBlock
			isDeselectable
			hideLabelFromVision
			label={ label }
			value={ value }
			onChange={ onChange }
		>
			{ options.map( ( o ) => (
				<ToggleGroupControlOptionIcon
					key={ o.value }
					value={ o.value }
					icon={ o.icon }
					label={ o.label }
				/>
			) ) }
		</ToggleGroupControl>
	);
}

/**
 * @param {Object} props
 * @param {string} props.clientId The selected block.
 */
export function AlignmentPanels( { clientId } ) {
	const { name, attributes } = useSelect(
		( select ) => {
			const be = select( blockEditorStore );
			return {
				name: be.getBlockName( clientId ),
				attributes: be.getBlockAttributes( clientId ) || {},
			};
		},
		[ clientId ]
	);
	const { updateBlockAttributes } = useDispatch( blockEditorStore );
	const has = useToolbarHas();
	if ( ! name ) {
		return null;
	}

	const supported = getBlockSupport( name, 'align' );
	const blockOptions =
		has.align && supported
			? BLOCK_ALIGNMENTS.filter(
					( o ) =>
						o.value === 'none' ||
						supported === true ||
						supported.includes( o.value )
				)
			: [];

	// Text alignment: the typography support, or the older attribute.
	const viaSupport = !! getBlockSupport( name, 'typography.textAlign' );
	const textAlign = viaSupport
		? attributes.style?.typography?.textAlign
		: attributes.textAlign;
	const setTextAlign = ( value ) =>
		updateBlockAttributes(
			clientId,
			viaSupport
				? {
						style: clean( {
							...attributes.style,
							typography: {
								...attributes.style?.typography,
								textAlign: value || undefined,
							},
						} ),
					}
				: { textAlign: value || undefined }
		);

	return (
		<>
			{ blockOptions.length > 1 && (
				<PanelBody
					title={ __( 'Alignment', 'nevelson' ) }
					className="nevelson-alignment"
				>
					<Options
						label={ __( 'Alignment', 'nevelson' ) }
						value={ attributes.align || 'none' }
						options={ blockOptions }
						onChange={ ( value ) =>
							updateBlockAttributes( clientId, {
								align:
									! value || value === 'none'
										? undefined
										: value,
							} )
						}
					/>
				</PanelBody>
			) }
			{ has.text && (
				<PanelBody
					title={ __( 'Text alignment', 'nevelson' ) }
					className="nevelson-text-alignment"
				>
					<Options
						label={ __( 'Text alignment', 'nevelson' ) }
						value={ textAlign }
						options={ TEXT_ALIGNMENTS }
						onChange={ setTextAlign }
					/>
				</PanelBody>
			) }
		</>
	);
}
