<?php
/**
 * A sample page to try Nevelson on: narrow blocks with room beside them, and
 * full-width sections without. The Playground blueprint makes it, and
 * /wp-admin/?nevelson-sample opens it in the editor.
 *
 * @package Nevelson
 */

defined( 'ABSPATH' ) || exit;

/**
 * The sample page's block markup: a few blocks in the content width, then
 * Twenty Twenty-Five patterns that fill the page, each a section.
 *
 * @return string
 */
function nevelson_sample_content() {
	$intro = <<<'HTML'
<!-- wp:heading {"level":1} -->
<h1 class="wp-block-heading">One panel for the block</h1>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>Select any block on this page and press the settings button (two sliders) in its toolbar. The toolbar and the block’s settings become one floating panel, pinned to the right, which stays open from block to block until you press the button again. The page’s own settings are under the Settings button at the top.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>The panel is as tall as the block’s controls. The sections below are patterns: click anything in one, and the panel has that block’s settings, not the pattern’s.</p>
<!-- /wp:paragraph -->

<!-- wp:list -->
<ul class="wp-block-list"><!-- wp:list-item -->
<li>A list item has few settings, so its panel is short.</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li>Full-width sections go under the panel, which floats over them.</li>
<!-- /wp:list-item --></ul>
<!-- /wp:list -->

<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button">Book a visit</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons -->
HTML;

	$out      = array( $intro );
	$registry = WP_Block_Patterns_Registry::get_instance();
	foreach ( array( 'twentytwentyfive/hero-full-width-image', 'twentytwentyfive/services-3-col', 'twentytwentyfive/cta-centered-heading' ) as $name ) {
		$pattern = $registry->get_registered( $name );
		if ( ! $pattern ) {
			continue;
		}
		// Each pattern says which it is, as the inserter does, which makes it
		// a section in WordPress 7.
		$blocks = array_values(
			array_filter(
				parse_blocks( $pattern['content'] ),
				function ( $block ) {
					return ! empty( $block['blockName'] );
				}
			)
		);
		if ( 1 === count( $blocks ) ) {
			$blocks[0]['attrs']['metadata'] = array_merge(
				isset( $blocks[0]['attrs']['metadata'] ) ? (array) $blocks[0]['attrs']['metadata'] : array(),
				array( 'patternName' => $name )
			);
		}
		$out[] = serialize_blocks( $blocks );
	}
	return implode( "\n\n", $out );
}

/**
 * Makes the sample page, once, and returns its ID.
 *
 * @return int Page ID, or 0 if it couldn't be made.
 */
function nevelson_create_sample_page() {
	$existing = get_posts(
		array(
			'post_type'   => 'page',
			'post_status' => 'any',
			'meta_key'    => '_nevelson_sample', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_query_meta_key
			'numberposts' => 1,
			'fields'      => 'ids',
		)
	);
	if ( $existing ) {
		return (int) $existing[0];
	}
	$id = wp_insert_post(
		array(
			'post_type'    => 'page',
			'post_status'  => 'publish',
			'post_title'   => 'Nevelson',
			'post_content' => nevelson_sample_content(),
			'meta_input'   => array( '_nevelson_sample' => 1 ),
		)
	);
	return is_wp_error( $id ) ? 0 : (int) $id;
}

/**
 * /wp-admin/?nevelson-sample: makes the sample page and opens it in the editor.
 */
function nevelson_open_sample() {
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Opens a page, changes nothing a visitor couldn't.
	if ( ! isset( $_GET['nevelson-sample'] ) || ! current_user_can( 'edit_pages' ) ) {
		return;
	}
	$id = nevelson_create_sample_page();
	if ( $id ) {
		wp_safe_redirect( admin_url( 'post.php?post=' . $id . '&action=edit' ) );
		exit;
	}
}
add_action( 'admin_init', 'nevelson_open_sample' );
