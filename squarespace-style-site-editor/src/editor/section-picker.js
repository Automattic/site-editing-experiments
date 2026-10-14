/**
 * The "Add section" picker: section types down the left, previews on the
 * right. Clicking a preview inserts it where "Add section" was clicked.
 */
import clsx from 'clsx';
import { __ } from '@wordpress/i18n';
import { useDispatch, useSelect } from '@wordpress/data';
import { useMemo, useState } from '@wordpress/element';
import { useAsyncList } from '@wordpress/compose';
import { parse } from '@wordpress/blocks';
import { store as coreStore } from '@wordpress/core-data';
import {
	BlockPreview,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { Modal, Spinner } from '@wordpress/components';

import { STORE_NAME } from './store';

const OURS = 'sse-';
const THEME = '__theme';

function PatternCard( { pattern, onInsert } ) {
	const blocks = useMemo(
		() => parse( pattern.content, { __unstableSkipMigrationLogs: true } ),
		[ pattern.content ]
	);
	return (
		<button
			type="button"
			className="sse-picker__card"
			onClick={ () => onInsert( pattern ) }
		>
			<span className="sse-picker__preview" aria-hidden="true">
				<BlockPreview blocks={ blocks } viewportWidth={ 1400 } />
			</span>
			<span className="sse-picker__card-title">{ pattern.title }</span>
		</button>
	);
}

function PatternGrid( { patterns, onInsert } ) {
	const shown = useAsyncList( patterns, { step: 2 } );
	return (
		<div className="sse-picker__grid">
			{ shown.map( ( pattern ) => (
				<PatternCard
					key={ pattern.name }
					pattern={ pattern }
					onInsert={ onInsert }
				/>
			) ) }
		</div>
	);
}

function SectionPickerModal( { picker, onClose } ) {
	const { insertBlocks, replaceBlocks } = useDispatch( blockEditorStore );
	const { getBlock, getBlockOrder } = useSelect( blockEditorStore );
	const { patterns, categories } = useSelect(
		( select ) => ( {
			patterns: select( coreStore ).getBlockPatterns(),
			categories: select( coreStore ).getBlockPatternCategories(),
		} ),
		[]
	);

	const groups = useMemo( () => {
		if ( ! patterns || ! categories ) {
			return null;
		}
		const usable = patterns.filter(
			( p ) =>
				p.inserter !== false &&
				! ( p.block_types || p.blockTypes || [] ).some( ( t ) =>
					t.startsWith( 'core/template-part' )
				)
		);
		const ours = categories
			.filter( ( c ) => c.name.startsWith( OURS ) )
			.map( ( c ) => ( {
				name: c.name,
				label: c.label,
				patterns: usable.filter( ( p ) =>
					( p.categories || [] ).includes( c.name )
				),
			} ) )
			.filter( ( g ) => g.patterns.length );
		const theme = usable.filter(
			( p ) =>
				! ( p.categories || [] ).some( ( c ) => c.startsWith( OURS ) )
		);
		if ( theme.length ) {
			ours.push( {
				name: THEME,
				label: __( 'From your theme', 'squarespace-style-site-editor' ),
				patterns: theme,
			} );
		}
		return ours;
	}, [ patterns, categories ] );

	const [ current, setCurrent ] = useState( null );
	const active =
		groups?.find( ( g ) => g.name === current ) || groups?.[ 0 ] || null;

	const insert = ( pattern ) => {
		const blocks = parse( pattern.content );
		// Name single-block sections so their tab reads "Hero", not "Group".
		if ( blocks.length === 1 && ! blocks[ 0 ].attributes.metadata?.name ) {
			blocks[ 0 ].attributes = {
				...blocks[ 0 ].attributes,
				metadata: {
					...( blocks[ 0 ].attributes.metadata || {} ),
					name:
						active && active.name !== THEME
							? active.label
							: pattern.title,
				},
			};
		}
		const rootClientId = picker.rootClientId || undefined;
		// Replace the empty paragraph a new page starts with.
		const order = getBlockOrder( rootClientId );
		const only = order.length === 1 ? getBlock( order[ 0 ] ) : null;
		if (
			only?.name === 'core/paragraph' &&
			( only.attributes.content?.toString?.() ?? '' ) === ''
		) {
			replaceBlocks( only.clientId, blocks );
		} else {
			insertBlocks( blocks, picker.index, rootClientId, true );
		}
		onClose();
	};

	return (
		<Modal
			title={ __( 'Add section', 'squarespace-style-site-editor' ) }
			onRequestClose={ onClose }
			className="sse-picker"
			size="fill"
		>
			{ ! groups ? (
				<div className="sse-picker__loading">
					<Spinner />
				</div>
			) : (
				<div className="sse-picker__layout">
					<nav
						className="sse-picker__nav"
						aria-label={ __(
							'Section types',
							'squarespace-style-site-editor'
						) }
					>
						{ groups.map( ( group ) => (
							<button
								key={ group.name }
								type="button"
								className={ clsx( 'sse-picker__nav-item', {
									'is-active': active?.name === group.name,
								} ) }
								aria-current={
									active?.name === group.name
										? 'true'
										: undefined
								}
								onClick={ () => setCurrent( group.name ) }
							>
								{ group.label }
								<span className="sse-picker__count">
									{ group.patterns.length }
								</span>
							</button>
						) ) }
					</nav>
					<div className="sse-picker__content">
						{ active && (
							<PatternGrid
								key={ active.name }
								patterns={ active.patterns }
								onInsert={ insert }
							/>
						) }
					</div>
				</div>
			) }
		</Modal>
	);
}

export default function SectionPicker() {
	const picker = useSelect(
		( select ) => select( STORE_NAME ).getSectionPicker(),
		[]
	);
	const { closeSectionPicker } = useDispatch( STORE_NAME );
	if ( ! picker ) {
		return null;
	}
	return (
		<SectionPickerModal picker={ picker } onClose={ closeSectionPicker } />
	);
}
