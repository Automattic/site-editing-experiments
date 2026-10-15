<?php
/**
 * Pattern: FAQ: questions and answers
 *
 * @package SquarespaceStyleSiteEditor
 */

defined( 'ABSPATH' ) || exit;

return array(
	'slug'          => 'faq-list',
	'title'         => __( 'FAQ: questions and answers', 'squarespace-style-site-editor' ),
	'categories'    => array( 'sse-faq' ),
	'viewportWidth' => 1400,
	'content'       => <<<'HTML'
<!-- wp:group {"metadata":{"name":"FAQs"},"align":"full","className":"is-style-sse-lightest-1","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull is-style-sse-lightest-1"><!-- wp:heading -->
<h2 class="wp-block-heading">Questions</h2>
<!-- /wp:heading -->
<!-- wp:details -->
<details class="wp-block-details"><summary>Are the pots dishwasher safe?</summary><!-- wp:paragraph -->
<p>Yes. Everything we make is high-fired stoneware with food-safe glazes.</p>
<!-- /wp:paragraph --></details>
<!-- /wp:details -->
<!-- wp:details -->
<details class="wp-block-details"><summary>Do you ship?</summary><!-- wp:paragraph -->
<p>We ship within the UK. Pots are packed in recycled paper and card.</p>
<!-- /wp:paragraph --></details>
<!-- /wp:details -->
<!-- wp:details -->
<details class="wp-block-details"><summary>Do I need experience for a class?</summary><!-- wp:paragraph -->
<p>No. Beginner courses start from scratch, and all materials are included.</p>
<!-- /wp:paragraph --></details>
<!-- /wp:details -->
<!-- wp:details -->
<details class="wp-block-details"><summary>Can I commission a set?</summary><!-- wp:paragraph -->
<p>Yes. Email us with what you have in mind and we will send a quote.</p>
<!-- /wp:paragraph --></details>
<!-- /wp:details --></div>
<!-- /wp:group -->
HTML
,
);
