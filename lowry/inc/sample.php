<?php
/**
 * A sample page to try Lowry on, made of Twenty Twenty-Five patterns, as the
 * site's home page. The Playground blueprint makes it, and
 * /wp-admin/?lowry-sample opens it in the site editor.
 *
 * @package Lowry
 */

defined( 'ABSPATH' ) || exit;

/**
 * The patterns the sample page is made of, in order.
 *
 * @return string[]
 */
function lowry_sample_patterns() {
	return array(
		'twentytwentyfive/hero-full-width-image',
		'twentytwentyfive/services-3-col',
		'twentytwentyfive/services-team-photos',
		'twentytwentyfive/cta-centered-heading',
	);
}

/**
 * The sample page's block markup. Each section's top block says which
 * pattern it is, as the inserter does.
 *
 * @return string
 */
function lowry_sample_content() {
	$registry = WP_Block_Patterns_Registry::get_instance();
	$out      = array();
	foreach ( lowry_sample_patterns() as $name ) {
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
function lowry_create_sample_page() {
	$existing = get_posts(
		array(
			'post_type'   => 'page',
			'post_status' => 'any',
			'meta_key'    => '_lowry_sample', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_query_meta_key
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
			'post_title'   => __( 'Home', 'lowry' ),
			'post_content' => lowry_sample_content(),
			'meta_input'   => array( '_lowry_sample' => 1 ),
		)
	);
	return is_wp_error( $id ) ? 0 : (int) $id;
}

/**
 * /wp-admin/?lowry-sample opens the sample page in the site editor, making it
 * first if it isn't there yet. With a classic theme, the page editor.
 */
function lowry_open_sample_page() {
	if ( ! isset( $_GET['lowry-sample'] ) || ! current_user_can( 'edit_pages' ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		return;
	}
	$id = lowry_create_sample_page();
	if ( $id ) {
		$url = wp_is_block_theme()
			? admin_url( 'site-editor.php?p=' . rawurlencode( '/page/' . $id ) . '&canvas=edit&lowry-panel' )
			: admin_url( 'post.php?post=' . $id . '&action=edit&lowry-panel' );
		wp_safe_redirect( $url );
		exit;
	}
}
add_action( 'admin_init', 'lowry_open_sample_page' );
