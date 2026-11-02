<?php
/**
 * A sample page to try Ito on: Twenty Twenty-Five patterns that have other
 * patterns with the same blocks. The Playground blueprint makes it, and
 * /wp-admin/?ito-sample opens it in the editor.
 *
 * @package Ito
 */

defined( 'ABSPATH' ) || exit;

/**
 * The patterns the sample page is made of, in order.
 *
 * @return string[]
 */
function ito_sample_patterns() {
	return array(
		'twentytwentyfive/hero-full-width-image',
		'twentytwentyfive/heading-and-paragraph-with-image',
		'twentytwentyfive/banner-cover-big-heading',
		'twentytwentyfive/cta-centered-heading',
	);
}

/**
 * The sample page's block markup. Each section's top block says which
 * pattern it is, as the inserter does, so Edit layout leaves it out.
 *
 * @return string
 */
function ito_sample_content() {
	$registry = WP_Block_Patterns_Registry::get_instance();
	$out      = array();
	foreach ( ito_sample_patterns() as $name ) {
		$pattern = $registry->get_registered( $name );
		if ( ! $pattern ) {
			continue;
		}
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
function ito_create_sample_page() {
	$existing = get_posts(
		array(
			'post_type'   => 'page',
			'post_status' => 'any',
			'meta_key'    => '_ito_sample', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_query_meta_key
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
			'post_author'  => get_current_user_id() ? get_current_user_id() : 1,
			'post_title'   => __( 'Swap a pattern', 'ito' ),
			'post_content' => ito_sample_content(),
			'meta_input'   => array( '_ito_sample' => 1 ),
		)
	);
	return is_wp_error( $id ) ? 0 : (int) $id;
}

/**
 * /wp-admin/?ito-sample opens the sample page in the editor, making it first
 * if it isn't there yet.
 */
function ito_open_sample_page() {
	if ( ! isset( $_GET['ito-sample'] ) || ! current_user_can( 'edit_pages' ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		return;
	}
	$id = ito_create_sample_page();
	if ( $id ) {
		wp_safe_redirect( admin_url( 'post.php?post=' . $id . '&action=edit' ) );
		exit;
	}
}
add_action( 'admin_init', 'ito_open_sample_page' );
