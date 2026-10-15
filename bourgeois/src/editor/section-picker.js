/**
 * "Add a Section": section types grouped down the left (with Add Blank and
 * Saved at the top), previews on the right. Clicking a
 * preview inserts it where "Add section" was clicked.
 */
import clsx from 'clsx';
import { __ } from '@wordpress/i18n';
import { useDispatch, useSelect } from '@wordpress/data';
import { useMemo, useState } from '@wordpress/element';
import { useAsyncList } from '@wordpress/compose';
import { createBlock, parse } from '@wordpress/blocks';
import {
	BlockPreview,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { Modal, Spinner } from '@wordpress/components';
import { Icon, plus } from '@wordpress/icons';

import { STORE_NAME } from './store';
import { heart } from '../shared/icons';
import {
	GROUPS,
	SAVED,
	THEME,
	blocksForPattern,
	useSavedSections,
	useSectionPatterns,
} from './section-patterns';

function PatternCard( { pattern, onInsert } ) {
	const blocks = useMemo(
		() => parse( pattern.content, { __unstableSkipMigrationLogs: true } ),
		[ pattern.content ]
	);
	return (
		<button
			type="button"
			className="sse-picker__card"
			aria-label={ pattern.title }
			title={ pattern.title }
			onClick={ () => onInsert( pattern ) }
		>
			<span className="sse-picker__preview" aria-hidden="true">
				<BlockPreview blocks={ blocks } viewportWidth={ 1400 } />
			</span>
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

function NavItem( { name, current, onSelect, children, ...rest } ) {
	return (
		<button
			type="button"
			className={ clsx( 'sse-picker__nav-item', {
				'is-active': current === name,
			} ) }
			aria-current={ current === name ? 'true' : undefined }
			onClick={ () => onSelect( name ) }
			{ ...rest }
		>
			{ children }
		</button>
	);
}

function SectionPickerModal( { picker, onClose } ) {
	const { insertBlocks, replaceBlocks } = useDispatch( blockEditorStore );
	const { getBlock, getBlockOrder } = useSelect( blockEditorStore );
	const sectionPatterns = useSectionPatterns();
	const saved = useSavedSections();
	const [ current, setCurrent ] = useState( null );

	// Headings with the categories that have patterns.
	const groups = useMemo( () => {
		if ( ! sectionPatterns ) {
			return null;
		}
		const { categories } = sectionPatterns;
		const listed = new Set( GROUPS.flatMap( ( g ) => g.categories ) );
		const out = GROUPS.map( ( group ) => ( {
			label: group.label,
			items: group.categories
				.map( ( name ) => categories[ name ] )
				.filter( ( c ) => c?.patterns.length ),
		} ) );
		const more = Object.values( categories ).filter(
			( c ) => ! listed.has( c.name ) && c.patterns.length
		);
		if ( sectionPatterns.themePatterns.length ) {
			more.push( {
				name: THEME,
				label: __( 'From your theme', 'section-site-editor' ),
				patterns: sectionPatterns.themePatterns,
			} );
		}
		if ( more.length ) {
			out.push( {
				label: __( 'More', 'section-site-editor' ),
				items: more,
			} );
		}
		return out.filter( ( g ) => g.items.length );
	}, [ sectionPatterns ] );

	const all = groups ? groups.flatMap( ( g ) => g.items ) : [];
	const activeName = current || all[ 0 ]?.name;
	let active = all.find( ( c ) => c.name === activeName ) || null;
	if ( activeName === SAVED ) {
		active = {
			name: SAVED,
			label: __( 'Saved', 'section-site-editor' ),
			patterns: saved || [],
		};
	}

	const place = ( blocks ) => {
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

	const insert = ( pattern ) => {
		const name =
			active && active.name !== THEME && active.name !== SAVED
				? active.label
				: pattern.title;
		place( blocksForPattern( pattern, name ) );
	};

	// A blank section is an empty freeform grid.
	const addBlank = () =>
		place( [
			createBlock( 'sse/fluid-section', {
				rows: 8,
				align: 'full',
				className: 'is-style-sse-lightest-1',
				metadata: {
					name: __( 'Blank', 'section-site-editor' ),
				},
			} ),
		] );

	return (
		<Modal
			title={ __( 'Add a Section', 'section-site-editor' ) }
			onRequestClose={ onClose }
			className="sse-picker"
			overlayClassName="sse-picker-overlay"
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
							'section-site-editor'
						) }
					>
						<button
							type="button"
							className="sse-picker__nav-action"
							onClick={ addBlank }
						>
							<Icon icon={ plus } size={ 18 } />
							{ __( 'Add Blank', 'section-site-editor' ) }
						</button>
						<NavItem
							name={ SAVED }
							current={ activeName }
							onSelect={ setCurrent }
							className={ clsx(
								'sse-picker__nav-action',
								activeName === SAVED && 'is-active'
							) }
						>
							<Icon icon={ heart } size={ 18 } />
							{ __( 'Saved', 'section-site-editor' ) }
						</NavItem>
						{ groups.map( ( group ) => (
							<div
								key={ group.label }
								className="sse-picker__group"
							>
								<p className="sse-picker__group-label">
									{ group.label }
								</p>
								{ group.items.map( ( item ) => (
									<NavItem
										key={ item.name }
										name={ item.name }
										current={ activeName }
										onSelect={ setCurrent }
									>
										{ item.label }
									</NavItem>
								) ) }
							</div>
						) ) }
					</nav>
					<div className="sse-picker__content">
						{ active?.name === SAVED && ! saved && <Spinner /> }
						{ active?.name === SAVED &&
							saved &&
							saved.length === 0 && (
								<p className="sse-picker__empty">
									{ __(
										'Sections you save with the heart button in a section’s menu appear here.',
										'section-site-editor'
									) }
								</p>
							) }
						{ active && active.patterns.length > 0 && (
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
