<?php
/**
 * Section patterns for the "Add section" picker.
 *
 * Each category is a section type (Hero, Features, Gallery...), mirroring
 * Squarespace's section picker and the section-editing-modes prototype. The
 * placeholder studio, copy and photos match that prototype.
 *
 * @package SquarespaceStyleSiteEditor
 */

defined( 'ABSPATH' ) || exit;

/**
 * Section types, in picker order.
 *
 * @return array<string,string> Category slug => label.
 */
function sse_section_categories() {
	return array(
		'sse-hero'       => __( 'Hero', 'squarespace-style-site-editor' ),
		'sse-features'   => __( 'Features', 'squarespace-style-site-editor' ),
		'sse-cta'        => __( 'Call to action', 'squarespace-style-site-editor' ),
		'sse-text'       => __( 'Text', 'squarespace-style-site-editor' ),
		'sse-image'      => __( 'Image', 'squarespace-style-site-editor' ),
		'sse-gallery'    => __( 'Gallery', 'squarespace-style-site-editor' ),
		'sse-quote'      => __( 'Quote', 'squarespace-style-site-editor' ),
		'sse-contact'    => __( 'Contact', 'squarespace-style-site-editor' ),
		'sse-faq'        => __( 'FAQ', 'squarespace-style-site-editor' ),
		'sse-team'       => __( 'Team', 'squarespace-style-site-editor' ),
		'sse-newsletter' => __( 'Newsletter', 'squarespace-style-site-editor' ),
		'sse-pricing'    => __( 'Pricing', 'squarespace-style-site-editor' ),
		'sse-freeform'   => __( 'Freeform', 'squarespace-style-site-editor' ),
	);
}

/**
 * Registers the section categories and patterns.
 */
function sse_register_patterns() {
	foreach ( sse_section_categories() as $slug => $label ) {
		register_block_pattern_category( $slug, array( 'label' => $label ) );
	}

	$images = SSE_URL . 'assets/images/';
	foreach ( glob( SSE_DIR . 'patterns/*.php' ) as $file ) {
		$pattern = include $file;
		if ( ! is_array( $pattern ) || empty( $pattern['slug'] ) ) {
			continue;
		}
		$slug = $pattern['slug'];
		unset( $pattern['slug'] );
		$pattern['content'] = str_replace( '{{images}}', esc_url( $images ), $pattern['content'] );
		register_block_pattern( 'sse/' . $slug, $pattern );
	}
}
add_action( 'init', 'sse_register_patterns' );
