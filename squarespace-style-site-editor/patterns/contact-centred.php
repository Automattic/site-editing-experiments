<?php
/**
 * Pattern: Contact: centred
 *
 * @package SquarespaceStyleSiteEditor
 */

defined( 'ABSPATH' ) || exit;

return array(
	'slug'          => 'contact-centred',
	'title'         => __( 'Contact: centred', 'squarespace-style-site-editor' ),
	'categories'    => array( 'sse-contact' ),
	'viewportWidth' => 1400,
	'content'       => <<<'HTML'
<!-- wp:group {"metadata":{"name":"Contact"},"align":"full","className":"is-style-sse-dark-1","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull is-style-sse-dark-1"><!-- wp:heading {"textAlign":"center"} -->
<h2 class="wp-block-heading has-text-align-center">Come and see us</h2>
<!-- /wp:heading -->
<!-- wp:paragraph {"align":"center"} -->
<p class="has-text-align-center">[Street address], [Town, postcode]<br>Thursday to Sunday, 10am to 5pm</p>
<!-- /wp:paragraph -->
<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button">Get directions</a></div>
<!-- /wp:button -->
<!-- wp:button {"className":"is-style-outline"} -->
<div class="wp-block-button is-style-outline"><a class="wp-block-button__link wp-element-button">Email us</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:group -->
HTML
,
);
