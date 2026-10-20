/**
 * The block's icon in the writing toolbar, as a menu: the block's name at the
 * top, then the names of the blocks it can turn into. It takes the place of
 * the editor's own block switcher, which the writing toolbar hides.
 */
import { __ } from '@wordpress/i18n';
import { useSelect, useDispatch } from '@wordpress/data';
import { BlockIcon, store as blockEditorStore } from '@wordpress/block-editor';
import { getBlockType, switchToBlockType } from '@wordpress/blocks';
import {
	ToolbarGroup,
	ToolbarItem,
	Dropdown,
	Button,
	MenuGroup,
	MenuItem,
} from '@wordpress/components';
import { check, chevronDown } from '@wordpress/icons';

/**
 * A block's name as people would say it ("Heading 2", not just "Heading").
 *
 * @param {Object} block Block.
 * @return {string} Name.
 */
function nameOf( block ) {
	const type = getBlockType( block.name );
	if ( block.name === 'core/heading' && block.attributes.level ) {
		return `${ type.title } ${ block.attributes.level }`;
	}
	return type ? type.title : block.name;
}

/**
 * @param {Object} props          Props.
 * @param {string} props.clientId Block.
 */
export default function BlockMenu( { clientId } ) {
	const { block, items } = useSelect(
		( select ) => {
			const be = select( blockEditorStore );
			const b = be.getBlock( clientId );
			return {
				block: b,
				items: b
					? be.getBlockTransformItems(
							[ b ],
							be.getBlockRootClientId( clientId )
						)
					: [],
			};
		},
		[ clientId ]
	);
	const { replaceBlocks } = useDispatch( blockEditorStore );
	if ( ! block ) {
		return null;
	}
	const type = getBlockType( block.name );
	const name = nameOf( block );

	return (
		<ToolbarGroup className="hw-block-menu">
			<ToolbarItem>
				{ ( itemProps ) => (
					<Dropdown
						popoverProps={ {
							placement: 'bottom-start',
							className: 'hw-popover',
						} }
						renderToggle={ ( { isOpen, onToggle } ) => (
							<Button
								{ ...itemProps }
								className="hw-block-menu__toggle"
								onClick={ onToggle }
								aria-expanded={ isOpen }
								aria-haspopup="true"
								label={ name }
								showTooltip
							>
								<BlockIcon
									icon={ type && type.icon }
									showColors
								/>
								<span className="hw-block-menu__chevron">
									{ chevronDown }
								</span>
							</Button>
						) }
						renderContent={ ( { onClose } ) => (
							<div className="hw-menu hw-menu--blocks">
								<MenuGroup>
									<MenuItem
										role="menuitemradio"
										isSelected
										icon={ check }
										className="hw-block-menu__current"
									>
										{ name }
									</MenuItem>
								</MenuGroup>
								{ !! items.length && (
									<MenuGroup
										label={ __( 'Turn into', 'hepworth' ) }
									>
										{ items.map( ( item ) => (
											<MenuItem
												key={ item.name }
												onClick={ () => {
													const next =
														switchToBlockType(
															block,
															item.name
														);
													if ( next ) {
														replaceBlocks(
															clientId,
															next
														);
													}
													onClose();
												} }
											>
												{ item.title }
											</MenuItem>
										) ) }
									</MenuGroup>
								) }
							</div>
						) }
					/>
				) }
			</ToolbarItem>
		</ToolbarGroup>
	);
}
