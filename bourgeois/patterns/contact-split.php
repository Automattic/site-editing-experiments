<?php
/**
 * Pattern: Contact: split
 *
 * @package SectionSiteEditor
 */

defined( 'ABSPATH' ) || exit;

return array(
	'slug'          => 'contact-split',
	'title'         => __( 'Contact: split', 'section-site-editor' ),
	'categories'    => array( 'sse-contact' ),
	'viewportWidth' => 1400,
	'content'       => <<<'HTML'
<!-- wp:group {"metadata":{"name":"Contact"},"align":"full","className":"is-style-sse-light-2","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull is-style-sse-light-2"><!-- wp:columns {"align":"wide"} -->
<div class="wp-block-columns alignwide"><!-- wp:column -->
<div class="wp-block-column"><!-- wp:heading -->
<h2 class="wp-block-heading">Visit the studio</h2>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>[Street address]<br>[Town, postcode]</p>
<!-- /wp:paragraph -->
<!-- wp:paragraph -->
<p>Open Thursday to Sunday, 10am to 5pm.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:column -->
<!-- wp:column -->
<div class="wp-block-column"><!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">Get in touch</h3>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>[email@example.com]<br>[Phone number]</p>
<!-- /wp:paragraph -->
<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button">Email us</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:column --></div>
<!-- /wp:columns --></div>
<!-- /wp:group -->
HTML
,
);
