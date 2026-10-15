import clsx from 'clsx';
import { __ } from '@wordpress/i18n';

import { getSectionThemes, readableOn, useSitePalette } from './settings';

/**
 * The section colour themes as a list of rows: each row is
 * drawn in its theme, with "Aa" in the heading colour and the theme's name.
 *
 * @param {Object}                      props
 * @param {string}                      props.value     Selected theme slug.
 * @param {(slug: string|null) => void} props.onChange  Called with a slug, or null for none.
 * @param {boolean}                     props.allowNone Whether to offer "None".
 * @param {string[]}                    props.only      Limit to these slugs.
 * @param {string}                      props.label     Accessible name for the list.
 */
export default function ThemeSwatches( {
	value,
	onChange,
	allowNone = true,
	only,
	label = __( 'Section colour themes', 'section-site-editor' ),
} ) {
	const palette = useSitePalette();
	const themes = getSectionThemes().filter(
		( theme ) => ! only || only.includes( theme.slug )
	);

	return (
		<div className="sse-theme-list" role="listbox" aria-label={ label }>
			{ allowNone && (
				<button
					type="button"
					role="option"
					aria-selected={ ! value }
					className={ clsx( 'sse-theme-row is-none', {
						'is-selected': ! value,
					} ) }
					onClick={ () => onChange( null ) }
				>
					<span className="sse-theme-row__aa" aria-hidden="true">
						Aa
					</span>
					<span className="sse-theme-row__name">
						{ __( 'No theme', 'section-site-editor' ) }
					</span>
				</button>
			) }
			{ themes.map( ( theme ) => (
				<button
					key={ theme.slug }
					type="button"
					role="option"
					aria-selected={ value === theme.slug }
					className={ clsx( 'sse-theme-row', {
						'is-selected': value === theme.slug,
					} ) }
					style={ {
						background: palette[ theme.background ],
						color: palette[ theme.text ],
					} }
					onClick={ () => onChange( theme.slug ) }
				>
					<span
						className="sse-theme-row__aa"
						aria-hidden="true"
						style={ { color: palette[ theme.heading ] } }
					>
						Aa
					</span>
					<span
						className="sse-theme-row__name"
						style={ {
							color: readableOn(
								palette[ theme.background ],
								palette[ theme.text ]
							),
						} }
					>
						{ theme.label }
					</span>
					<span
						className="sse-theme-row__button"
						style={ { background: palette[ theme.buttonBg ] } }
						aria-hidden="true"
					/>
				</button>
			) ) }
		</div>
	);
}
