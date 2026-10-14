import clsx from 'clsx';
import { __ } from '@wordpress/i18n';

import { getSectionThemes, useSitePalette } from './settings';

/**
 * A grid of the ten section colour themes, each drawn in the site palette:
 * background, a heading in the heading colour, a line of text and a button.
 *
 * @param {Object}   props
 * @param {string}   props.value     Selected theme slug.
 * @param {Function} props.onChange  Called with a slug, or null for none.
 * @param {boolean}  props.allowNone Whether to offer "None".
 */
export default function ThemeSwatches( { value, onChange, allowNone = true } ) {
	const palette = useSitePalette();

	return (
		<div
			className="sse-theme-swatches"
			role="listbox"
			aria-label={ __(
				'Section colours',
				'squarespace-style-site-editor'
			) }
		>
			{ allowNone && (
				<button
					type="button"
					role="option"
					aria-selected={ ! value }
					className={ clsx( 'sse-theme-swatch is-none', {
						'is-selected': ! value,
					} ) }
					onClick={ () => onChange( null ) }
				>
					<span className="sse-theme-swatch__label">
						{ __( 'None', 'squarespace-style-site-editor' ) }
					</span>
				</button>
			) }
			{ getSectionThemes().map( ( theme ) => (
				<button
					key={ theme.slug }
					type="button"
					role="option"
					aria-selected={ value === theme.slug }
					className={ clsx( 'sse-theme-swatch', {
						'is-selected': value === theme.slug,
					} ) }
					style={ { background: palette[ theme.background ] } }
					onClick={ () => onChange( theme.slug ) }
				>
					<span
						className="sse-theme-swatch__heading"
						style={ { color: palette[ theme.heading ] } }
					>
						Aa
					</span>
					<span
						className="sse-theme-swatch__text"
						style={ { background: palette[ theme.text ] } }
					/>
					<span
						className="sse-theme-swatch__button"
						style={ { background: palette[ theme.buttonBg ] } }
					/>
					<span
						className="sse-theme-swatch__name"
						style={ { color: palette[ theme.text ] } }
					>
						{ theme.label }
					</span>
				</button>
			) ) }
		</div>
	);
}
