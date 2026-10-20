<?php
/**
 * Plugin Name:       Hepworth (experiment)
 * Description:       Escher's two toolbars in the real editor: a Word-style writing toolbar where fonts and sizes are theme presets (block transformations underneath), and a PowerPoint-style design toolbar.
 * Version:           0.1.0
 * Requires at least: 6.8
 * Requires PHP:      7.4
 * Author:            Automattic
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       hepworth
 *
 * @package Hepworth
 */

defined( 'ABSPATH' ) || exit;

define( 'HEPWORTH_VERSION', '0.1.0' );
define( 'HEPWORTH_DIR', plugin_dir_path( __FILE__ ) );
define( 'HEPWORTH_URL', plugin_dir_url( __FILE__ ) );

require_once HEPWORTH_DIR . 'inc/sample.php';

/**
 * The toolbars: they load wherever the block editor does (post, page and site editor).
 */
function hepworth_enqueue_editor() {
	$file = HEPWORTH_DIR . 'build/index.asset.php';
	if ( ! file_exists( $file ) ) {
		return;
	}
	$asset = include $file;
	wp_enqueue_script( 'hepworth', HEPWORTH_URL . 'build/index.js', $asset['dependencies'], $asset['version'], true );
	wp_set_script_translations( 'hepworth', 'hepworth' );
	if ( file_exists( HEPWORTH_DIR . 'build/index.css' ) ) {
		wp_enqueue_style( 'hepworth', HEPWORTH_URL . 'build/index.css', array( 'wp-components' ), $asset['version'] );
	}
}
add_action( 'enqueue_block_editor_assets', 'hepworth_enqueue_editor' );
