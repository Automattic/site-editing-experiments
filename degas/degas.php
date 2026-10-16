<?php
/**
 * Plugin Name:       Degas (experiment)
 * Description:       Albers' section editing modes on real blocks: hover a section to choose Edit layout, Edit content or Freeform.
 * Version:           0.1.0
 * Requires at least: 6.8
 * Requires PHP:      7.4
 * Author:            Automattic
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       degas
 *
 * @package Degas
 */

defined( 'ABSPATH' ) || exit;

define( 'DEGAS_VERSION', '0.1.0' );
define( 'DEGAS_DIR', plugin_dir_path( __FILE__ ) );
define( 'DEGAS_URL', plugin_dir_url( __FILE__ ) );

require_once DEGAS_DIR . 'inc/markup.php';
require_once DEGAS_DIR . 'inc/sections.php';
require_once DEGAS_DIR . 'inc/freeform.php';

/**
 * A file's version for cache busting: the plugin version and when it was built.
 *
 * @param string $file Path inside the plugin.
 * @return string
 */
function degas_asset_version( $file ) {
	$time = @filemtime( DEGAS_DIR . $file ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
	return DEGAS_VERSION . ( $time ? '.' . $time : '' );
}

/**
 * Whether the editing UI loads on this screen: the site editor, and the post
 * editor for pages and posts.
 *
 * @return bool
 */
function degas_is_editor_screen() {
	if ( ! is_admin() || ! function_exists( 'get_current_screen' ) ) {
		return false;
	}
	$screen = get_current_screen();
	$load   = $screen && ( 'site-editor' === $screen->base || ( 'post' === $screen->base && $screen->is_block_editor() ) );

	/**
	 * Filters whether Degas' editing UI loads on the current screen.
	 *
	 * @param bool           $load   Whether to load it.
	 * @param WP_Screen|null $screen The current screen.
	 */
	return (bool) apply_filters( 'degas_load_editor_ui', $load, $screen );
}

/**
 * The editing UI: the section overlay, the three modes and the section picker.
 */
function degas_enqueue_editor() {
	if ( ! degas_is_editor_screen() ) {
		return;
	}
	$asset = include DEGAS_DIR . 'build/editor.asset.php';
	wp_enqueue_script( 'degas-editor', DEGAS_URL . 'build/editor.js', $asset['dependencies'], $asset['version'], true );
	wp_set_script_translations( 'degas-editor', 'degas' );
	wp_add_inline_script(
		'degas-editor',
		'window.degasSettings = ' . wp_json_encode(
			array(
				'sections' => degas_section_library(),
				'palettes' => degas_palettes(),
				'photos'   => array_map(
					function ( $n ) {
						list( $src, $alt ) = degas_photo( $n );
						return array( 'src' => $src, 'alt' => $alt );
					},
					range( 0, 5 )
				),
			)
		) . ';',
		'before'
	);
}
add_action( 'enqueue_block_editor_assets', 'degas_enqueue_editor' );

/**
 * Section styles (layouts, palettes, freeform positions) on the site and in
 * the editor canvas, and the editing chrome in the canvas only.
 */
function degas_enqueue_block_assets() {
	wp_enqueue_style( 'degas-sections', DEGAS_URL . 'build/style-sections.css', array(), degas_asset_version( 'build/style-sections.css' ) );
	if ( is_admin() ) {
		wp_enqueue_style( 'degas-canvas', DEGAS_URL . 'build/style-canvas.css', array(), degas_asset_version( 'build/style-canvas.css' ) );
	}
}
add_action( 'enqueue_block_assets', 'degas_enqueue_block_assets' );
