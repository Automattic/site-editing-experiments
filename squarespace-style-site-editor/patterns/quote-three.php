<?php
/**
 * Pattern: Testimonials: three quotes
 *
 * @package SquarespaceStyleSiteEditor
 */

defined( 'ABSPATH' ) || exit;

return array(
	'slug'          => 'quote-three',
	'title'         => __( 'Testimonials: three quotes', 'squarespace-style-site-editor' ),
	'categories'    => array( 'sse-quote' ),
	'viewportWidth' => 1400,
	'content'       => <<<'HTML'
<!-- wp:group {"metadata":{"name":"Testimonials"},"align":"full","className":"is-style-sse-light-2","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull is-style-sse-light-2"><!-- wp:heading {"textAlign":"center"} -->
<h2 class="wp-block-heading has-text-align-center">What customers say</h2>
<!-- /wp:heading -->
<!-- wp:columns {"align":"wide"} -->
<div class="wp-block-columns alignwide"><!-- wp:column -->
<div class="wp-block-column"><!-- wp:quote -->
<blockquote class="wp-block-quote"><!-- wp:paragraph -->
<p>Our everyday plates. Five years on, not a chip.</p>
<!-- /wp:paragraph --><cite>[Customer name]</cite></blockquote>
<!-- /wp:quote --></div>
<!-- /wp:column -->
<!-- wp:column -->
<div class="wp-block-column"><!-- wp:quote -->
<blockquote class="wp-block-quote"><!-- wp:paragraph -->
<p>The beginner course was the best evening of my week.</p>
<!-- /wp:paragraph --><cite>[Customer name]</cite></blockquote>
<!-- /wp:quote --></div>
<!-- /wp:column -->
<!-- wp:column -->
<div class="wp-block-column"><!-- wp:quote -->
<blockquote class="wp-block-quote"><!-- wp:paragraph -->
<p>They made a hundred mugs for our café, and every one is a little different.</p>
<!-- /wp:paragraph --><cite>[Customer name]</cite></blockquote>
<!-- /wp:quote --></div>
<!-- /wp:column --></div>
<!-- /wp:columns --></div>
<!-- /wp:group -->
HTML
,
);
