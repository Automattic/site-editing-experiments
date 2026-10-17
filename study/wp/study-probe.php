<?php
/**
 * Plugin Name: Site editing user test: probe
 * Description: For the site editing user test. Reports what's on the page being edited to the study page around it, makes the study's sample page and opens it in the site editor.
 * Version:     0.1.0
 * Author:      Automattic
 * License:     GPL-2.0-or-later
 *
 * @package StudyProbe
 */

defined( 'ABSPATH' ) || exit;

/**
 * Loads the probe in the block editors. It only reports when the editor is
 * inside a frame (the study page); on its own it does nothing.
 */
function study_probe_enqueue() {
	wp_enqueue_script( 'study-probe', plugins_url( 'probe.js', __FILE__ ), array(), '0.1.0', true );
	wp_add_inline_script( 'study-probe', 'window.studyProbeReport = true;', 'before' );
}
add_action( 'enqueue_block_editor_assets', 'study_probe_enqueue' );

/**
 * The same section order as Albers, Cassatt and Degas, built from Bourgeois's
 * own section patterns, which are ordinary core blocks. With Bourgeois active
 * they're Bourgeois sections; without it they're the plain Gutenberg baseline.
 *
 * @return string Block markup.
 */
function study_bourgeois_content() {
	$dir = WP_PLUGIN_DIR . '/bourgeois/patterns/';
	$url = plugins_url( 'bourgeois/assets/images/' );
	// The same copy as the other prototypes, where the sections match.
	$copy = array(
		'hero-split'    => array(
			'Handmade pottery from a small studio by the river' => 'Stoneware for everyday tables',
			'Wheel-thrown tableware, fired in small batches. Visit the studio, take a class, or shop the latest firing.' => 'Bowls, mugs and plates thrown on the wheel and glazed by hand in our studio.',
			'Shop the latest firing' => 'Shop the collection',
		),
		'gallery-grid'  => array( 'From the latest firing' => 'From the studio' ),
		'pricing-three' => array( '>Classes<' => '>Classes and memberships<' ),
	);
	$out = array();
	foreach ( array( 'hero-split', 'features-three', 'gallery-grid', 'quote-three', 'pricing-three', 'faq-list', 'newsletter-split', 'cta-split', 'contact-split' ) as $slug ) {
		if ( ! file_exists( $dir . $slug . '.php' ) ) {
			continue;
		}
		$pattern = include $dir . $slug . '.php';
		if ( is_array( $pattern ) && ! empty( $pattern['content'] ) ) {
			$markup = str_replace( '{{images}}', esc_url( $url ), $pattern['content'] );
			$out[]  = isset( $copy[ $slug ] ) ? strtr( $markup, $copy[ $slug ] ) : $markup;
		}
	}
	return implode( "\n\n", $out );
}

/**
 * The sample page's content for this site's variant.
 *
 * @return string
 */
function study_page_content() {
	$variant = get_option( 'study_variant', 'gutenberg' );
	if ( 'degas' === $variant && function_exists( 'degas_sample_content' ) ) {
		return degas_sample_content();
	}
	return study_bourgeois_content();
}

/**
 * Makes the study's page, once, and returns its ID.
 *
 * @return int
 */
function study_create_page() {
	$existing = get_posts(
		array(
			'post_type'   => 'page',
			'post_status' => 'any',
			'meta_key'    => '_study_page', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_query_meta_key
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
			'post_author'  => 1,
			'post_title'   => 'Northfield Ceramics',
			'post_content' => study_page_content(),
			'meta_input'   => array( '_study_page' => 1 ),
		)
	);
	return is_wp_error( $id ) ? 0 : (int) $id;
}

/**
 * /wp-admin/?study-open opens the study's page in the site editor.
 */
function study_open_page() {
	if ( ! isset( $_GET['study-open'] ) || ! current_user_can( 'edit_pages' ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		return;
	}
	$id = study_create_page();
	if ( $id ) {
		wp_safe_redirect( admin_url( 'site-editor.php?p=' . rawurlencode( '/page/' . $id ) . '&canvas=edit' ) );
		exit;
	}
}
add_action( 'admin_init', 'study_open_page' );

