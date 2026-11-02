<?php
/**
 * Plugin Name:       Ito (experiment)
 * Description:       Swap a section for another pattern with the same blocks: the layout changes, the words and pictures stay.
 * Version:           0.1.0
 * Requires at least: 6.8
 * Requires PHP:      7.4
 * Author:            Automattic
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       ito
 *
 * @package Ito
 */

defined( 'ABSPATH' ) || exit;

define( 'ITO_VERSION', '0.1.0' );
define( 'ITO_DIR', plugin_dir_path( __FILE__ ) );
define( 'ITO_URL', plugin_dir_url( __FILE__ ) );

require_once ITO_DIR . 'inc/sample.php';

/**
 * Whether the editing UI loads on this screen: the site editor, and the post
 * editor for pages and posts.
 *
 * @return bool
 */
function ito_is_editor_screen() {
	if ( ! is_admin() || ! function_exists( 'get_current_screen' ) ) {
		return false;
	}
	$screen = get_current_screen();
	$load   = $screen && ( 'site-editor' === $screen->base || ( 'post' === $screen->base && $screen->is_block_editor() ) );

	/**
	 * Filters whether Ito's editing UI loads on the current screen.
	 *
	 * @param bool           $load   Whether to load it.
	 * @param WP_Screen|null $screen The current screen.
	 */
	return (bool) apply_filters( 'ito_load_editor_ui', $load, $screen );
}

/**
 * The editing UI: the section overlay and the Edit layout panel.
 */
function ito_enqueue_editor() {
	if ( ! ito_is_editor_screen() ) {
		return;
	}
	$asset = include ITO_DIR . 'build/editor.asset.php';
	wp_enqueue_script( 'ito-editor', ITO_URL . 'build/editor.js', $asset['dependencies'], $asset['version'], true );
	wp_set_script_translations( 'ito-editor', 'ito' );
	// The layouts panel is drawn in the editor's own window.
	wp_enqueue_style( 'ito-editor', ITO_URL . 'build/style-editor.css', array(), $asset['version'] );
}
add_action( 'enqueue_block_editor_assets', 'ito_enqueue_editor' );

/**
 * The overlay's styles, in the editor canvas only.
 */
function ito_enqueue_block_assets() {
	if ( ! is_admin() ) {
		return;
	}
	$asset = include ITO_DIR . 'build/editor.asset.php';
	wp_enqueue_style( 'ito-canvas', ITO_URL . 'build/style-editor.css', array(), $asset['version'] );
}
add_action( 'enqueue_block_assets', 'ito_enqueue_block_assets' );
