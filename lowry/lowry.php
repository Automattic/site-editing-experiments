<?php
/**
 * Plugin Name:       Lowry (experiment)
 * Description:       The site editor as WebMCP tools: an agent in the browser edits the page through the editor itself, live on the canvas, undoable, and unsaved until you save.
 * Version:           0.1.0
 * Requires at least: 6.8
 * Requires PHP:      7.4
 * Author:            Automattic
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       lowry
 *
 * @package Lowry
 */

defined( 'ABSPATH' ) || exit;

define( 'LOWRY_VERSION', '0.1.0' );
define( 'LOWRY_DIR', plugin_dir_path( __FILE__ ) );
define( 'LOWRY_URL', plugin_dir_url( __FILE__ ) );

require_once LOWRY_DIR . 'inc/sample.php';

/**
 * Whether Lowry loads on this screen: the site editor, and the post editor
 * for pages and posts.
 *
 * @return bool
 */
function lowry_is_editor_screen() {
	if ( ! is_admin() || ! function_exists( 'get_current_screen' ) ) {
		return false;
	}
	$screen = get_current_screen();
	$load   = $screen && ( 'site-editor' === $screen->base || ( 'post' === $screen->base && $screen->is_block_editor() ) );

	/**
	 * Filters whether Lowry loads on the current screen.
	 *
	 * @param bool           $load   Whether to load it.
	 * @param WP_Screen|null $screen The current screen.
	 */
	return (bool) apply_filters( 'lowry_load_editor_ui', $load, $screen );
}

/**
 * The editor script: the tools, the WebMCP layer and the panel.
 */
function lowry_enqueue_editor() {
	if ( ! lowry_is_editor_screen() ) {
		return;
	}
	$asset = include LOWRY_DIR . 'build/editor.asset.php';
	wp_enqueue_script( 'lowry-editor', LOWRY_URL . 'build/editor.js', $asset['dependencies'], $asset['version'], true );
	wp_enqueue_style( 'lowry-editor', LOWRY_URL . 'build/style-editor.css', array( 'wp-components' ), $asset['version'] );
}
add_action( 'enqueue_block_editor_assets', 'lowry_enqueue_editor' );

/**
 * The Abilities API's client is a script module (WordPress 7.0 and later),
 * which a classic script can't import. A tiny module imports it and hands it
 * to the editor script. Its imports are dynamic, so on a WordPress without
 * the client it loads and says so, and Lowry offers its tools to WebMCP
 * directly instead.
 */
function lowry_enqueue_abilities_module() {
	if ( ! function_exists( 'wp_enqueue_script_module' ) || ! lowry_is_editor_screen() ) {
		return;
	}
	wp_enqueue_script_module(
		'lowry-abilities',
		LOWRY_URL . 'modules/abilities.js',
		array(
			array(
				'id'     => '@wordpress/abilities',
				'import' => 'dynamic',
			),
			array(
				'id'     => '@wordpress/core-abilities',
				'import' => 'dynamic',
			),
		),
		LOWRY_VERSION
	);
}
add_action( 'admin_enqueue_scripts', 'lowry_enqueue_abilities_module' );
