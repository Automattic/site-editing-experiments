<?php
/**
 * Pattern: Pricing: three classes
 *
 * @package SquarespaceStyleSiteEditor
 */

defined( 'ABSPATH' ) || exit;

return array(
	'slug'          => 'pricing-three',
	'title'         => __( 'Pricing: three classes', 'squarespace-style-site-editor' ),
	'categories'    => array( 'sse-pricing' ),
	'viewportWidth' => 1400,
	'content'       => <<<'HTML'
<!-- wp:group {"metadata":{"name":"Pricing"},"align":"full","className":"is-style-sse-lightest-2","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull is-style-sse-lightest-2"><!-- wp:heading {"textAlign":"center"} -->
<h2 class="wp-block-heading has-text-align-center">Classes</h2>
<!-- /wp:heading -->
<!-- wp:columns {"align":"wide"} -->
<div class="wp-block-columns alignwide"><!-- wp:column -->
<div class="wp-block-column"><!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">Taster</h3>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p><strong>[£00]</strong></p>
<!-- /wp:paragraph -->
<!-- wp:list -->
<ul class="wp-block-list"><!-- wp:list-item -->
<li>One evening</li>
<!-- /wp:list-item -->
<!-- wp:list-item -->
<li>Make two pieces</li>
<!-- /wp:list-item -->
<!-- wp:list-item -->
<li>Glazing included</li>
<!-- /wp:list-item --></ul>
<!-- /wp:list -->
<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button">Book a taster</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:column -->
<!-- wp:column -->
<div class="wp-block-column"><!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">Six weeks</h3>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p><strong>[£000]</strong></p>
<!-- /wp:paragraph -->
<!-- wp:list -->
<ul class="wp-block-list"><!-- wp:list-item -->
<li>Six evenings</li>
<!-- /wp:list-item -->
<!-- wp:list-item -->
<li>All clay and firing</li>
<!-- /wp:list-item -->
<!-- wp:list-item -->
<li>Keep everything you make</li>
<!-- /wp:list-item --></ul>
<!-- /wp:list -->
<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button">Book a course</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:column -->
<!-- wp:column -->
<div class="wp-block-column"><!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">Studio membership</h3>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p><strong>[£00] a month</strong></p>
<!-- /wp:paragraph -->
<!-- wp:list -->
<ul class="wp-block-list"><!-- wp:list-item -->
<li>Open studio hours</li>
<!-- /wp:list-item -->
<!-- wp:list-item -->
<li>Shelf space</li>
<!-- /wp:list-item -->
<!-- wp:list-item -->
<li>Firing included</li>
<!-- /wp:list-item --></ul>
<!-- /wp:list -->
<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button">Join</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:column --></div>
<!-- /wp:columns --></div>
<!-- /wp:group -->
HTML
,
);
