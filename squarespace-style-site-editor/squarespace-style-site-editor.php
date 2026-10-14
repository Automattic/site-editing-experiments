<?php
/**
 * Plugin Name:       Squarespace-style Site Editor (experiment)
 * Description:       Makes the site editor look and work like the Squarespace editor: section-by-section editing with "Add section" lines, colour themes per section, a Site Styles panel, and freeform grid sections you drag and resize like Fluid Engine.
 * Version:           0.1.0
 * Requires at least: 6.8
 * Requires PHP:      7.4
 * Author:            Automattic
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       squarespace-style-site-editor
 *
 * @package SquarespaceStyleSiteEditor
 */

defined( 'ABSPATH' ) || exit;

define( 'SSE_VERSION', '0.1.0' );
define( 'SSE_FILE', __FILE__ );
define( 'SSE_DIR', plugin_dir_path( __FILE__ ) );
define( 'SSE_URL', plugin_dir_url( __FILE__ ) );

require_once SSE_DIR . 'inc/section-themes.php';
require_once SSE_DIR . 'inc/patterns.php';

/**
 * Whether the current admin screen is the site editor.
 *
 * @return bool
 */
function sse_is_site_editor() {
	if ( ! is_admin() || ! function_exists( 'get_current_screen' ) ) {
		return false;
	}
	$screen = get_current_screen();
	$is_site_editor = $screen && 'site-editor' === $screen->base;

	/**
	 * Filters whether the Squarespace-style editor UI loads on the current screen.
	 *
	 * Return true to also load it in the post editor, for example.
	 *
	 * @param bool           $is_site_editor Whether this is the site editor.
	 * @param WP_Screen|null $screen         The current screen.
	 */
	return (bool) apply_filters( 'sse_load_editor_ui', $is_site_editor, $screen );
}

/**
 * Registers the freeform (Fluid Engine style) grid blocks.
 */
function sse_register_blocks() {
	register_block_type( SSE_DIR . 'build/fluid-section' );
	register_block_type( SSE_DIR . 'build/fluid-item' );
}
add_action( 'init', 'sse_register_blocks' );

/**
 * Loads the editor UI: chrome, section controls, section picker and Site Styles.
 */
function sse_enqueue_editor_ui() {
	if ( ! sse_is_site_editor() ) {
		return;
	}

	$asset = include SSE_DIR . 'build/editor.asset.php';

	wp_enqueue_script(
		'sse-editor',
		SSE_URL . 'build/editor.js',
		$asset['dependencies'],
		$asset['version'],
		true
	);
	wp_set_script_translations( 'sse-editor', 'squarespace-style-site-editor' );

	wp_add_inline_script(
		'sse-editor',
		'window.sseEditorSettings = ' . wp_json_encode(
			array(
				'sectionThemes' => sse_section_themes(),
				'palettes'      => sse_palette_presets(),
			)
		) . ';',
		'before'
	);

	wp_enqueue_style(
		'sse-editor',
		SSE_URL . 'build/style-editor.css',
		array( 'wp-components' ),
		$asset['version']
	);
}
add_action( 'enqueue_block_editor_assets', 'sse_enqueue_editor_ui' );

/**
 * Styles the section controls that live inside the editor canvas iframe.
 */
function sse_enqueue_canvas_styles() {
	if ( ! sse_is_site_editor() ) {
		return;
	}
	$asset = include SSE_DIR . 'build/canvas.asset.php';
	wp_enqueue_style(
		'sse-canvas',
		SSE_URL . 'build/style-canvas.css',
		array(),
		$asset['version']
	);
}
add_action( 'enqueue_block_assets', 'sse_enqueue_canvas_styles' );

/**
 * Marks the site editor so the chrome styles only apply there.
 *
 * @param string $classes Admin body classes.
 * @return string
 */
function sse_admin_body_class( $classes ) {
	if ( sse_is_site_editor() ) {
		$classes .= ' sse-studio';
	}
	return $classes;
}
add_filter( 'admin_body_class', 'sse_admin_body_class' );
