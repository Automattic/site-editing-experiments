<?php
/**
 * Section patterns for the "Add section" picker.
 *
 * Each category is a section type (Hero, Features, Gallery...), mirroring
 * the Albers (section editing modes) prototype. The placeholder studio, copy and photos match that prototype.
 *
 * @package SectionSiteEditor
 */

defined( 'ABSPATH' ) || exit;

/**
 * Section types, in picker order.
 *
 * @return array<string,string> Category slug => label.
 */
function sse_section_categories() {
	return array(
		'sse-hero'       => __( 'Intro', 'section-site-editor' ),
		'sse-features'   => __( 'Features', 'section-site-editor' ),
		'sse-cta'        => __( 'Call to action', 'section-site-editor' ),
		'sse-text'       => __( 'About', 'section-site-editor' ),
		'sse-image'      => __( 'Images', 'section-site-editor' ),
		'sse-gallery'    => __( 'Gallery', 'section-site-editor' ),
		'sse-quote'      => __( 'Testimonials', 'section-site-editor' ),
		'sse-contact'    => __( 'Contact', 'section-site-editor' ),
		'sse-faq'        => __( 'FAQs', 'section-site-editor' ),
		'sse-team'       => __( 'Team', 'section-site-editor' ),
		'sse-newsletter' => __( 'Newsletter', 'section-site-editor' ),
		'sse-pricing'    => __( 'Pricing', 'section-site-editor' ),
		'sse-freeform'   => __( 'Freeform', 'section-site-editor' ),
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
