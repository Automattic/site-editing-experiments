<?php
/**
 * Pattern: Quote: dark band
 *
 * @package SectionSiteEditor
 */

defined( 'ABSPATH' ) || exit;

return array(
	'slug'          => 'quote-band',
	'title'         => __( 'Quote: dark band', 'section-site-editor' ),
	'categories'    => array( 'sse-quote' ),
	'viewportWidth' => 1400,
	'content'       => <<<'HTML'
<!-- wp:group {"metadata":{"name":"Testimonials"},"align":"full","className":"is-style-sse-dark-1","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull is-style-sse-dark-1"><!-- wp:quote -->
<blockquote class="wp-block-quote"><!-- wp:paragraph -->
<p>The bowls we bought five years ago are still the ones everyone reaches for first.</p>
<!-- /wp:paragraph --><cite>[Customer name]</cite></blockquote>
<!-- /wp:quote --></div>
<!-- /wp:group -->
HTML
,
);
