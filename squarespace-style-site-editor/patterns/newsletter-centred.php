<?php
/**
 * Pattern: Newsletter: centred
 *
 * @package SquarespaceStyleSiteEditor
 */

defined( 'ABSPATH' ) || exit;

return array(
	'slug'          => 'newsletter-centred',
	'title'         => __( 'Newsletter: centred', 'squarespace-style-site-editor' ),
	'categories'    => array( 'sse-newsletter' ),
	'viewportWidth' => 1400,
	'content'       => <<<'HTML'
<!-- wp:group {"metadata":{"name":"Newsletter"},"align":"full","className":"is-style-sse-darkest-2","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull is-style-sse-darkest-2"><!-- wp:heading {"textAlign":"center"} -->
<h2 class="wp-block-heading has-text-align-center">Hear about the next firing first</h2>
<!-- /wp:heading -->
<!-- wp:paragraph {"align":"center"} -->
<p class="has-text-align-center">One short email when new pots come out of the kiln. Nothing else.</p>
<!-- /wp:paragraph -->
<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button">Subscribe</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:group -->
HTML
,
);
