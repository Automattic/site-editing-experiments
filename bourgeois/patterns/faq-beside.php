<?php
/**
 * Pattern: FAQs: heading beside questions
 *
 * @package SectionSiteEditor
 */

defined( 'ABSPATH' ) || exit;

return array(
	'slug'          => 'faq-beside',
	'title'         => __( 'FAQs: heading beside questions', 'section-site-editor' ),
	'categories'    => array( 'sse-faq' ),
	'viewportWidth' => 1400,
	'content'       => <<<'HTML'
<!-- wp:group {"metadata":{"name":"FAQs"},"align":"full","className":"is-style-sse-light-1","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull is-style-sse-light-1"><!-- wp:columns {"align":"wide"} -->
<div class="wp-block-columns alignwide"><!-- wp:column -->
<div class="wp-block-column"><!-- wp:heading -->
<h2 class="wp-block-heading">Good to know</h2>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>Anything else? Email us and we will get back to you within a day.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:column -->
<!-- wp:column -->
<div class="wp-block-column"><!-- wp:details -->
<details class="wp-block-details"><summary>How long does a commission take?</summary><!-- wp:paragraph -->
<p>Usually six to eight weeks, depending on the next firing.</p>
<!-- /wp:paragraph --></details>
<!-- /wp:details -->
<!-- wp:details -->
<details class="wp-block-details"><summary>Can I visit without booking?</summary><!-- wp:paragraph -->
<p>Yes, the shop is open Thursday to Sunday.</p>
<!-- /wp:paragraph --></details>
<!-- /wp:details -->
<!-- wp:details -->
<details class="wp-block-details"><summary>Do you offer gift vouchers?</summary><!-- wp:paragraph -->
<p>Yes, for classes and for the shop, in any amount.</p>
<!-- /wp:paragraph --></details>
<!-- /wp:details --></div>
<!-- /wp:column --></div>
<!-- /wp:columns --></div>
<!-- /wp:group -->
HTML
,
);
