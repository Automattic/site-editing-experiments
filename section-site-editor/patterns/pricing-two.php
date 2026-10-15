<?php
/**
 * Pattern: Pricing: two options
 *
 * @package SectionSiteEditor
 */

defined( 'ABSPATH' ) || exit;

return array(
	'slug'          => 'pricing-two',
	'title'         => __( 'Pricing: two options', 'section-site-editor' ),
	'categories'    => array( 'sse-pricing' ),
	'viewportWidth' => 1400,
	'content'       => <<<'HTML'
<!-- wp:group {"metadata":{"name":"Pricing"},"align":"full","className":"is-style-sse-light-1","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull is-style-sse-light-1"><!-- wp:heading {"textAlign":"center"} -->
<h2 class="wp-block-heading has-text-align-center">Commissions</h2>
<!-- /wp:heading -->
<!-- wp:columns {"align":"wide"} -->
<div class="wp-block-columns alignwide"><!-- wp:column -->
<div class="wp-block-column"><!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">Small set</h3>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p><strong>From [£000]</strong></p>
<!-- /wp:paragraph -->
<!-- wp:list -->
<ul class="wp-block-list"><!-- wp:list-item -->
<li>Up to 12 pieces</li>
<!-- /wp:list-item -->
<!-- wp:list-item -->
<li>Choice of three glazes</li>
<!-- /wp:list-item -->
<!-- wp:list-item -->
<li>Six weeks</li>
<!-- /wp:list-item --></ul>
<!-- /wp:list -->
<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button">Ask about a set</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:column -->
<!-- wp:column -->
<div class="wp-block-column"><!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">Restaurant</h3>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p><strong>From [£0,000]</strong></p>
<!-- /wp:paragraph -->
<!-- wp:list -->
<ul class="wp-block-list"><!-- wp:list-item -->
<li>Plates, bowls and cups</li>
<!-- /wp:list-item -->
<!-- wp:list-item -->
<li>Matched to your menu</li>
<!-- /wp:list-item -->
<!-- wp:list-item -->
<li>Replacements for a year</li>
<!-- /wp:list-item --></ul>
<!-- /wp:list -->
<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button">Start a conversation</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:column --></div>
<!-- /wp:columns --></div>
<!-- /wp:group -->
HTML
,
);
