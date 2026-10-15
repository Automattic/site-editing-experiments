/**
 * The "Add block" panel for freeform sections, laid out like Squarespace's:
 * a search field, then the essentials as two columns of tiles. Searching also
 * finds any other block that can be inserted.
 */
import { __ } from '@wordpress/i18n';
import { useMemo, useState } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import {
	createBlock,
	hasBlockSupport,
	store as blocksStore,
} from '@wordpress/blocks';
import { BlockIcon } from '@wordpress/block-editor';
import { SearchControl } from '@wordpress/components';

import { getAddBlockItems } from './add-block-items';

const EXCLUDED = [
	'core/freeform',
	'core/missing',
	'core/block',
	'core/template-part',
	'core/post-content',
];

function Tiles( { title, items, onAdd } ) {
	if ( ! items.length ) {
		return null;
	}
	return (
		<div className="sse-add-block__group">
			<p className="sse-add-block__title">{ title }</p>
			<div className="sse-add-block__tiles">
				{ items.map( ( item ) => (
					<button
						key={ item.key }
						type="button"
						className="sse-add-block__tile"
						onClick={ () => onAdd( item ) }
					>
						<BlockIcon icon={ item.icon } />
						<span>{ item.label }</span>
					</button>
				) ) }
			</div>
		</div>
	);
}

export default function AddBlockPanel( { onAdd } ) {
	const [ search, setSearch ] = useState( '' );
	const blockTypes = useSelect(
		( select ) => select( blocksStore ).getBlockTypes(),
		[]
	);
	const essentials = useMemo( () => getAddBlockItems(), [] );
	const query = search.trim().toLowerCase();

	const matches = ( label, keywords = [] ) =>
		label.toLowerCase().includes( query ) ||
		keywords.some( ( k ) => k.toLowerCase().includes( query ) );

	const shownEssentials = query
		? essentials.filter( ( item ) => matches( item.label ) )
		: essentials;

	const more = useMemo( () => {
		if ( ! query ) {
			return [];
		}
		const essentialLabels = new Set(
			essentials.map( ( item ) => item.label.toLowerCase() )
		);
		return blockTypes
			.filter(
				( type ) =>
					! type.name.startsWith( 'sse/' ) &&
					! EXCLUDED.includes( type.name ) &&
					! type.parent &&
					! type.ancestor &&
					hasBlockSupport( type, 'inserter', true ) &&
					! essentialLabels.has( type.title.toLowerCase() ) &&
					( type.title.toLowerCase().includes( query ) ||
						( type.keywords || [] ).some( ( k ) =>
							k.toLowerCase().includes( query )
						) )
			)
			.slice( 0, 24 )
			.map( ( type ) => ( {
				key: type.name,
				label: type.title,
				icon: type.icon?.src ?? type.icon,
				w: 10,
				h: 4,
				create: () => createBlock( type.name ),
			} ) );
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ query, blockTypes ] );

	return (
		<div className="sse-add-block">
			<SearchControl
				__nextHasNoMarginBottom
				value={ search }
				onChange={ setSearch }
				placeholder={ __( 'Search', 'squarespace-style-site-editor' ) }
				label={ __( 'Search blocks', 'squarespace-style-site-editor' ) }
			/>
			<div className="sse-add-block__scroll">
				<Tiles
					title={ __(
						'Essentials',
						'squarespace-style-site-editor'
					) }
					items={ shownEssentials }
					onAdd={ onAdd }
				/>
				<Tiles
					title={ __(
						'More blocks',
						'squarespace-style-site-editor'
					) }
					items={ more }
					onAdd={ onAdd }
				/>
				{ query && ! shownEssentials.length && ! more.length && (
					<p className="sse-add-block__empty">
						{ __(
							'No blocks found.',
							'squarespace-style-site-editor'
						) }
					</p>
				) }
			</div>
		</div>
	);
}
