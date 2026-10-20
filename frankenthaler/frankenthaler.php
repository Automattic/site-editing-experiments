<?php
/**
 * Plugin Name:       Frankenthaler (experiment)
 * Description:       Escher's two toolbars in the real editor: a Word-style writing toolbar where fonts and sizes are theme presets (block transformations underneath), and a PowerPoint-style design toolbar.
 * Version:           0.1.0
 * Requires at least: 6.8
 * Requires PHP:      7.4
 * Author:            Automattic
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       frankenthaler
 *
 * @package Frankenthaler
 */

defined( 'ABSPATH' ) || exit;

define( 'FRANKENTHALER_VERSION', '0.1.0' );
define( 'FRANKENTHALER_DIR', plugin_dir_path( __FILE__ ) );
define( 'FRANKENTHALER_URL', plugin_dir_url( __FILE__ ) );

require_once FRANKENTHALER_DIR . 'inc/sample.php';

/**
 * The toolbars: they load wherever the block editor does (post, page and site editor).
 */
function frankenthaler_enqueue_editor() {
	$file = FRANKENTHALER_DIR . 'build/index.asset.php';
	if ( ! file_exists( $file ) ) {
		return;
	}
	$asset = include $file;
	wp_enqueue_script( 'frankenthaler', FRANKENTHALER_URL . 'build/index.js', $asset['dependencies'], $asset['version'], true );
	wp_set_script_translations( 'frankenthaler', 'frankenthaler' );
	if ( file_exists( FRANKENTHALER_DIR . 'build/index.css' ) ) {
		wp_enqueue_style( 'frankenthaler', FRANKENTHALER_URL . 'build/index.css', array( 'wp-components' ), $asset['version'] );
	}
}
add_action( 'enqueue_block_editor_assets', 'frankenthaler_enqueue_editor' );
