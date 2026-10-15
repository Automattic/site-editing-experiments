<?php
/**
 * Pattern: Features: cards
 *
 * @package SectionSiteEditor
 */

defined( 'ABSPATH' ) || exit;

return array(
	'slug'          => 'features-cards',
	'title'         => __( 'Features: cards', 'section-site-editor' ),
	'categories'    => array( 'sse-features' ),
	'viewportWidth' => 1400,
	'content'       => <<<'HTML'
<!-- wp:group {"metadata":{"name":"Features"},"align":"full","className":"is-style-sse-light-2","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull is-style-sse-light-2"><!-- wp:heading {"textAlign":"center"} -->
<h2 class="wp-block-heading has-text-align-center">Why people come back</h2>
<!-- /wp:heading -->
<!-- wp:columns {"align":"wide"} -->
<div class="wp-block-columns alignwide"><!-- wp:column -->
<div class="wp-block-column"><!-- wp:group {"className":"is-style-sse-lightest-1","layout":{"type":"constrained"},"style":{"spacing":{"padding":{"top":"2rem","bottom":"2rem","left":"2rem","right":"2rem"}}}} -->
<div class="wp-block-group is-style-sse-lightest-1" style="padding-top:2rem;padding-right:2rem;padding-bottom:2rem;padding-left:2rem"><!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">Small batches</h3>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>Each firing is a few dozen pieces, so glazes vary and nothing is mass produced.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group --></div>
<!-- /wp:column -->
<!-- wp:column -->
<div class="wp-block-column"><!-- wp:group {"className":"is-style-sse-lightest-1","layout":{"type":"constrained"},"style":{"spacing":{"padding":{"top":"2rem","bottom":"2rem","left":"2rem","right":"2rem"}}}} -->
<div class="wp-block-group is-style-sse-lightest-1" style="padding-top:2rem;padding-right:2rem;padding-bottom:2rem;padding-left:2rem"><!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">Made to use</h3>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>High-fired stoneware that goes in the dishwasher and the oven.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group --></div>
<!-- /wp:column --></div>
<!-- /wp:columns -->
<!-- wp:columns {"align":"wide"} -->
<div class="wp-block-columns alignwide"><!-- wp:column -->
<div class="wp-block-column"><!-- wp:group {"className":"is-style-sse-lightest-1","layout":{"type":"constrained"},"style":{"spacing":{"padding":{"top":"2rem","bottom":"2rem","left":"2rem","right":"2rem"}}}} -->
<div class="wp-block-group is-style-sse-lightest-1" style="padding-top:2rem;padding-right:2rem;padding-bottom:2rem;padding-left:2rem"><!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">Local clay</h3>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>Our clay comes from a pit twenty miles up the river.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group --></div>
<!-- /wp:column -->
<!-- wp:column -->
<div class="wp-block-column"><!-- wp:group {"className":"is-style-sse-lightest-1","layout":{"type":"constrained"},"style":{"spacing":{"padding":{"top":"2rem","bottom":"2rem","left":"2rem","right":"2rem"}}}} -->
<div class="wp-block-group is-style-sse-lightest-1" style="padding-top:2rem;padding-right:2rem;padding-bottom:2rem;padding-left:2rem"><!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">Repairs</h3>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>Chipped something? Bring it in and we will see what we can do.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group --></div>
<!-- /wp:column --></div>
<!-- /wp:columns --></div>
<!-- /wp:group -->
HTML
,
);
