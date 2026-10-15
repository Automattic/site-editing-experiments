<?php
/**
 * Pattern: Newsletter: split
 *
 * @package SectionSiteEditor
 */

defined( 'ABSPATH' ) || exit;

return array(
	'slug'          => 'newsletter-split',
	'title'         => __( 'Newsletter: split', 'section-site-editor' ),
	'categories'    => array( 'sse-newsletter' ),
	'viewportWidth' => 1400,
	'content'       => <<<'HTML'
<!-- wp:group {"metadata":{"name":"Newsletter"},"align":"full","className":"is-style-sse-bright-1","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull is-style-sse-bright-1"><!-- wp:columns {"verticalAlignment":"center","align":"wide"} -->
<div class="wp-block-columns alignwide are-vertically-aligned-center"><!-- wp:column {"verticalAlignment":"center"} -->
<div class="wp-block-column is-vertically-aligned-center"><!-- wp:heading -->
<h2 class="wp-block-heading">News from the kiln</h2>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>A short email when a firing is ready and when class dates open.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:column -->
<!-- wp:column {"verticalAlignment":"center"} -->
<div class="wp-block-column is-vertically-aligned-center"><!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button">Subscribe</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:column --></div>
<!-- /wp:columns --></div>
<!-- /wp:group -->
HTML
,
);
