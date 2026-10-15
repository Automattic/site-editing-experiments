<?php
/**
 * Site palette and section colour themes.
 *
 * Like Squarespace, the site has one five-colour palette (lightest, light,
 * accent, dark, darkest) and every section picks one of ten colour themes
 * that assign those colours to background, text, headings, links and buttons.
 *
 * @package SquarespaceStyleSiteEditor
 */

defined( 'ABSPATH' ) || exit;

/**
 * The five palette roles, in order.
 *
 * @return array<string,string> Slug => label.
 */
function sse_palette_roles() {
	return array(
		'sse-lightest' => __( 'Lightest', 'squarespace-style-site-editor' ),
		'sse-light'    => __( 'Light', 'squarespace-style-site-editor' ),
		'sse-accent'   => __( 'Accent', 'squarespace-style-site-editor' ),
		'sse-dark'     => __( 'Dark', 'squarespace-style-site-editor' ),
		'sse-darkest'  => __( 'Darkest', 'squarespace-style-site-editor' ),
	);
}

/**
 * Curated palettes offered in Site Styles. Colours run lightest to darkest,
 * with the accent in the middle.
 *
 * @return array[]
 */
function sse_palette_presets() {
	return array(
		array( 'name' => __( 'Paper', 'squarespace-style-site-editor' ), 'colors' => array( '#FFFFFF', '#F4F2EE', '#3858E9', '#3A3A3A', '#1A1A1A' ) ),
		array( 'name' => __( 'Sand', 'squarespace-style-site-editor' ), 'colors' => array( '#FBF7F0', '#EADFCC', '#B5653A', '#5B4636', '#2B2118' ) ),
		array( 'name' => __( 'Sage', 'squarespace-style-site-editor' ), 'colors' => array( '#F6F8F3', '#DCE5D3', '#4F7A4A', '#2F4A35', '#16241A' ) ),
		array( 'name' => __( 'Sky', 'squarespace-style-site-editor' ), 'colors' => array( '#F5F9FC', '#D7E7F3', '#2D7DD2', '#21405E', '#0F1E2E' ) ),
		array( 'name' => __( 'Clay', 'squarespace-style-site-editor' ), 'colors' => array( '#FDF6F2', '#F2D6C9', '#C2502E', '#6B2E1F', '#2E1510' ) ),
		array( 'name' => __( 'Citrus', 'squarespace-style-site-editor' ), 'colors' => array( '#FFFDF5', '#FFF0B8', '#E8A100', '#3D3A2E', '#141310' ) ),
		array( 'name' => __( 'Mono', 'squarespace-style-site-editor' ), 'colors' => array( '#FFFFFF', '#EDEDED', '#000000', '#444444', '#111111' ) ),
		array( 'name' => __( 'Night', 'squarespace-style-site-editor' ), 'colors' => array( '#F2F0FF', '#B9B2E8', '#8C7BFF', '#26214A', '#100D24' ) ),
	);
}

/**
 * The ten section colour themes. Each value is a palette role slug.
 *
 * @return array[]
 */
function sse_section_themes() {
	$themes = array(
		'lightest-1' => array( __( 'Lightest 1', 'squarespace-style-site-editor' ), 'lightest', 'darkest', 'darkest', 'accent', 'accent', 'lightest' ),
		'lightest-2' => array( __( 'Lightest 2', 'squarespace-style-site-editor' ), 'lightest', 'dark', 'accent', 'accent', 'darkest', 'lightest' ),
		'light-1'    => array( __( 'Light 1', 'squarespace-style-site-editor' ), 'light', 'darkest', 'darkest', 'accent', 'accent', 'lightest' ),
		'light-2'    => array( __( 'Light 2', 'squarespace-style-site-editor' ), 'light', 'dark', 'accent', 'darkest', 'darkest', 'light' ),
		'bright-1'   => array( __( 'Bright 1', 'squarespace-style-site-editor' ), 'accent', 'lightest', 'lightest', 'lightest', 'lightest', 'accent' ),
		'bright-2'   => array( __( 'Bright 2', 'squarespace-style-site-editor' ), 'accent', 'darkest', 'darkest', 'darkest', 'darkest', 'lightest' ),
		'dark-1'     => array( __( 'Dark 1', 'squarespace-style-site-editor' ), 'dark', 'lightest', 'lightest', 'light', 'accent', 'lightest' ),
		'dark-2'     => array( __( 'Dark 2', 'squarespace-style-site-editor' ), 'dark', 'light', 'accent', 'lightest', 'lightest', 'dark' ),
		'darkest-1'  => array( __( 'Darkest 1', 'squarespace-style-site-editor' ), 'darkest', 'lightest', 'lightest', 'accent', 'accent', 'lightest' ),
		'darkest-2'  => array( __( 'Darkest 2', 'squarespace-style-site-editor' ), 'darkest', 'light', 'accent', 'lightest', 'lightest', 'darkest' ),
	);

	$out = array();
	foreach ( $themes as $slug => $t ) {
		$out[] = array(
			'slug'       => $slug,
			'label'      => $t[0],
			'background' => $t[1],
			'text'       => $t[2],
			'heading'    => $t[3],
			'link'       => $t[4],
			'buttonBg'   => $t[5],
			'buttonText' => $t[6],
		);
	}
	return $out;
}

/**
 * Adds the palette and section spacing to the theme's theme.json data, so the
 * colours exist as presets (and CSS variables) before anyone opens Site Styles.
 *
 * @param WP_Theme_JSON_Data $theme_json Theme data.
 * @return WP_Theme_JSON_Data
 */
function sse_filter_theme_json( $theme_json ) {
	$data    = $theme_json->get_data();
	$palette = isset( $data['settings']['color']['palette'] ) && is_array( $data['settings']['color']['palette'] )
		? $data['settings']['color']['palette']
		: array();

	// Some versions return presets keyed by origin.
	if ( isset( $palette['theme'] ) ) {
		$palette = $palette['theme'];
	}

	$existing = wp_list_pluck( $palette, 'slug' );
	$defaults = sse_palette_presets()[0]['colors'];
	$i        = 0;
	foreach ( sse_palette_roles() as $slug => $label ) {
		if ( ! in_array( $slug, $existing, true ) ) {
			$palette[] = array(
				'slug'  => $slug,
				/* translators: %s: palette role, e.g. Accent. */
				'name'  => sprintf( __( 'Site %s', 'squarespace-style-site-editor' ), $label ),
				'color' => $defaults[ $i ],
			);
		}
		++$i;
	}

	return $theme_json->update_with(
		array(
			'version'  => 3,
			'settings' => array(
				'color'  => array( 'palette' => $palette ),
				'custom' => array(
					'sse' => array(
						'sectionPadding' => 'clamp(3rem, 8vw, 7rem)',
					),
				),
			),
		)
	);
}
add_filter( 'wp_theme_json_data_theme', 'sse_filter_theme_json' );

/**
 * Builds the CSS for the section colour themes from the theme definitions.
 *
 * @return string
 */
function sse_section_themes_css() {
	$var = static function ( $role ) {
		return 'var(--wp--preset--color--sse-' . $role . ')';
	};

	$css = '';
	foreach ( sse_section_themes() as $t ) {
		$css .= sprintf(
			'.is-style-sse-%1$s{--sse-bg:%2$s;--sse-text:%3$s;--sse-heading:%4$s;--sse-link:%5$s;--sse-btn-bg:%6$s;--sse-btn-text:%7$s;}',
			$t['slug'],
			$var( $t['background'] ),
			$var( $t['text'] ),
			$var( $t['heading'] ),
			$var( $t['link'] ),
			$var( $t['buttonBg'] ),
			$var( $t['buttonText'] )
		);
	}

	$s    = '[class*="is-style-sse-"]';
	$css .= "{$s}{background-color:var(--sse-bg);color:var(--sse-text);}";
	$css .= ":where({$s}:not(.wp-block-template-part)){padding-block:var(--wp--custom--sse--section-padding,5rem);}";
	// Coloured sections sit flush against each other, like Squarespace.
	$css .= "{$s}+{$s}{margin-block-start:0;}";
	$css .= "{$s} :is(h1,h2,h3,h4,h5,h6){color:var(--sse-heading);}";
	$css .= "{$s} a:not(.wp-element-button):not(.wp-block-button__link){color:var(--sse-link);}";
	$css .= "{$s} :is(.wp-element-button,.wp-block-button__link):not(.has-background){background-color:var(--sse-btn-bg);}";
	$css .= "{$s} :is(.wp-element-button,.wp-block-button__link):not(.has-text-color){color:var(--sse-btn-text);}";
	$css .= "{$s} .is-style-outline :is(.wp-element-button,.wp-block-button__link):not(.has-background){background-color:transparent;color:var(--sse-btn-bg);border-color:currentColor;}";

	return $css;
}

/**
 * Registers the section themes as block styles and outputs their CSS on the
 * front end and in the editor canvas.
 */
function sse_register_section_themes() {
	wp_register_style( 'sse-section-themes', false, array(), SSE_VERSION );
	wp_add_inline_style( 'sse-section-themes', sse_section_themes_css() . sse_divider_css() );

	foreach ( array( 'core/group', 'core/cover', 'core/columns', 'sse/fluid-section' ) as $block ) {
		foreach ( sse_section_themes() as $t ) {
			register_block_style(
				$block,
				array(
					'name'  => 'sse-' . $t['slug'],
					'label' => $t['label'],
				)
			);
		}
	}
}
add_action( 'init', 'sse_register_section_themes', 20 );

/**
 * Enqueues the section theme CSS everywhere blocks render.
 */
function sse_enqueue_section_themes() {
	wp_enqueue_style( 'sse-section-themes' );
}
add_action( 'enqueue_block_assets', 'sse_enqueue_section_themes' );

/**
 * Section divider shapes: the outline of the section's bottom edge, as an
 * SVG path in a 100 × 100 box whose filled part is what stays visible.
 *
 * @return array<string,array> Slug => [ label, path ].
 */
function sse_divider_shapes() {
	return array(
		'curve'   => array( __( 'Curve', 'squarespace-style-site-editor' ), 'M0 0H100V0Q50 200 0 0Z' ),
		'scoop'   => array( __( 'Scoop', 'squarespace-style-site-editor' ), 'M0 0H100V100Q50 -100 0 100Z' ),
		'rounded' => array( __( 'Rounded', 'squarespace-style-site-editor' ), 'M0 0H100V20Q100 100 80 100H20Q0 100 0 20Z' ),
		'slant'   => array( __( 'Slant', 'squarespace-style-site-editor' ), 'M0 0H100V0L0 100Z' ),
		'wave'    => array( __( 'Wave', 'squarespace-style-site-editor' ), 'M0 0H100V50C75 110 75 -10 50 50C25 110 25 -10 0 50Z' ),
		'peak'    => array( __( 'Peak', 'squarespace-style-site-editor' ), 'M0 0H100V0L50 100L0 0Z' ),
		'notch'   => array( __( 'Notch', 'squarespace-style-site-editor' ), 'M0 0H100V100L50 0L0 100Z' ),
	);
}

/**
 * CSS for section dividers. A section with a divider masks its bottom edge
 * to the shape and overlaps the next section by the divider's height.
 *
 * @return string
 */
function sse_divider_css() {
	$css = '[class*="sse-divider-"]{--sse-div-h:clamp(2.5rem,6vw,5rem);position:relative;z-index:1;margin-block-end:calc(-1 * var(--sse-div-h)) !important;padding-block-end:calc(var(--wp--custom--sse--section-padding,5rem) + var(--sse-div-h)) !important;-webkit-mask:linear-gradient(#000 0 0) top/100% calc(100% - var(--sse-div-h) + 1px) no-repeat,var(--sse-div-shape) bottom/100% var(--sse-div-h) no-repeat;mask:linear-gradient(#000 0 0) top/100% calc(100% - var(--sse-div-h) + 1px) no-repeat,var(--sse-div-shape) bottom/100% var(--sse-div-h) no-repeat;}';
	$css .= '.sse-divider-s{--sse-div-h:clamp(1.25rem,3vw,2.5rem);}';
	$css .= '.sse-divider-l{--sse-div-h:clamp(4rem,10vw,8rem);}';
	// The next section's content stays clear of the overlap.
	$css .= '[class*="sse-divider-"]+*{padding-block-start:calc(var(--wp--custom--sse--section-padding,5rem) + var(--sse-div-h,0px));}';
	foreach ( sse_divider_shapes() as $slug => $shape ) {
		foreach ( array( '' => '', '.sse-divider-flip' => '<g transform="translate(100 0) scale(-1 1)">' ) as $selector => $group ) {
			$svg  = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">';
			$svg .= $group . '<path d="' . $shape[1] . '"/>' . ( $group ? '</g>' : '' ) . '</svg>';
			$css .= sprintf(
				'.sse-divider-%1$s%2$s{--sse-div-shape:url("data:image/svg+xml,%3$s");}',
				$slug,
				$selector,
				rawurlencode( $svg )
			);
		}
	}
	return $css;
}
