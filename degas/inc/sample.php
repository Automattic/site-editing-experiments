<?php
/**
 * A sample page to try Degas on: the sections of Albers' Northfield Ceramics
 * page. The Playground blueprint makes it, and /wp-admin/?degas-sample opens
 * it in the editor.
 *
 * @package Degas
 */

defined( 'ABSPATH' ) || exit;

/**
 * The sample page's block markup.
 *
 * @return string
 */
function degas_sample_content() {
	$library = array();
	foreach ( degas_section_library() as $section ) {
		$library[ $section['kind'] ] = $section['content'];
	}
	// Section type, and the layout it starts in when it isn't the first.
	$plan = array(
		array( 'hero', null ),
		array( 'features', null ),
		array( 'gallery', null ),
		array( 'quote', 'dark' ),
		array( 'pricing', null ),
		array( 'faq', 'side' ),
		array( 'newsletter', 'split' ),
		array( 'cta', null ),
		array( 'contact', null ),
	);
	$out = array();
	foreach ( $plan as $step ) {
		list( $kind, $layout ) = $step;
		if ( empty( $library[ $kind ] ) ) {
			continue;
		}
		$markup = $library[ $kind ];
		if ( $layout ) {
			$markup = preg_replace( '/degas-layout-[a-z0-9]+/', 'degas-layout-' . $layout, $markup, 2 );
		}
		$out[] = $markup;
	}
	return implode( "\n\n", $out );
}

/**
 * Makes the sample page, once, and returns its ID.
 *
 * @return int Page ID, or 0 if it couldn't be made.
 */
function degas_create_sample_page() {
	$existing = get_posts(
		array(
			'post_type'   => 'page',
			'post_status' => 'any',
			'meta_key'    => '_degas_sample', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_query_meta_key
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
			'post_title'   => __( 'Northfield Ceramics', 'degas' ),
			'post_content' => degas_sample_content(),
			'meta_input'   => array( '_degas_sample' => 1 ),
		)
	);
	return is_wp_error( $id ) ? 0 : (int) $id;
}

/**
 * /wp-admin/?degas-sample opens the sample page in the editor, making it first
 * if it isn't there yet.
 */
function degas_open_sample_page() {
	if ( ! isset( $_GET['degas-sample'] ) || ! current_user_can( 'edit_pages' ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		return;
	}
	$id = degas_create_sample_page();
	if ( $id ) {
		wp_safe_redirect( admin_url( 'post.php?post=' . $id . '&action=edit' ) );
		exit;
	}
}
add_action( 'admin_init', 'degas_open_sample_page' );
