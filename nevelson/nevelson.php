<?php
/**
 * Plugin Name:       Nevelson (experiment)
 * Description:       The block inspector as a floating panel beside the selected block, as in Judd, and the page's settings in a card from the Settings button.
 * Version:           0.1.0
 * Requires at least: 7.0
 * Requires PHP:      7.4
 * Author:            Automattic
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       nevelson
 *
 * @package Nevelson
 */

defined( 'ABSPATH' ) || exit;

define( 'NEVELSON_VERSION', '0.1.0' );
define( 'NEVELSON_DIR', plugin_dir_path( __FILE__ ) );
define( 'NEVELSON_URL', plugin_dir_url( __FILE__ ) );

require_once NEVELSON_DIR . 'inc/sample.php';

/**
 * Whether the floating panel loads on this screen: the site editor, and the
 * post editor.
 *
 * @return bool
 */
function nevelson_is_editor_screen() {
	if ( ! is_admin() || ! function_exists( 'get_current_screen' ) ) {
		return false;
	}
	$screen = get_current_screen();
	$load   = $screen && ( 'site-editor' === $screen->base || ( 'post' === $screen->base && $screen->is_block_editor() ) );

	/**
	 * Filters whether Nevelson's floating panel loads on the current screen.
	 *
	 * @param bool           $load   Whether to load it.
	 * @param WP_Screen|null $screen The current screen.
	 */
	return (bool) apply_filters( 'nevelson_load_editor_ui', $load, $screen );
}

/**
 * The floating panel, in the editor's own window.
 */
function nevelson_enqueue_editor() {
	if ( ! nevelson_is_editor_screen() ) {
		return;
	}
	$asset = include NEVELSON_DIR . 'build/editor.asset.php';
	wp_enqueue_script( 'nevelson-editor', NEVELSON_URL . 'build/editor.js', $asset['dependencies'], $asset['version'], true );
	wp_set_script_translations( 'nevelson-editor', 'nevelson' );
	wp_enqueue_style( 'nevelson-editor', NEVELSON_URL . 'build/style-editor.css', array( 'wp-components' ), $asset['version'] );
}
add_action( 'enqueue_block_editor_assets', 'nevelson_enqueue_editor' );

/**
 * Patterns and template parts are editable straight away, like any other
 * blocks: no content-only sections, and no Edit or Exit pattern button.
 *
 * @param array $settings The block editor's settings.
 * @return array
 */
function nevelson_unlock_patterns( $settings ) {
	if ( ! nevelson_is_editor_screen() ) {
		return $settings;
	}
	$settings['disableContentOnlyForUnsyncedPatterns'] = true;
	$settings['disableContentOnlyForTemplateParts']    = true;
	return $settings;
}
add_filter( 'block_editor_settings_all', 'nevelson_unlock_patterns' );

/**
 * A click on a block in a template part goes straight to that block, as in
 * a pattern, rather than selecting the template part first.
 *
 * @param array  $args The block type's arguments.
 * @param string $name The block type's name.
 * @return array
 */
function nevelson_no_template_part_overlay( $args, $name ) {
	if ( 'core/template-part' === $name ) {
		$args['supports'] = array_merge(
			$args['supports'] ?? array(),
			array( '__experimentalDisableBlockOverlay' => true )
		);
	}
	return $args;
}
add_filter( 'register_block_type_args', 'nevelson_no_template_part_overlay', 10, 2 );
