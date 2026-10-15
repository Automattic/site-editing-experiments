<?php
/**
 * Pattern: Call to action: centred
 *
 * @package SectionSiteEditor
 */

defined( 'ABSPATH' ) || exit;

return array(
	'slug'          => 'cta-centred',
	'title'         => __( 'Call to action: centred', 'section-site-editor' ),
	'categories'    => array( 'sse-cta' ),
	'viewportWidth' => 1400,
	'content'       => <<<'HTML'
<!-- wp:group {"metadata":{"name":"Call to action"},"align":"full","className":"is-style-sse-bright-1","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull is-style-sse-bright-1"><!-- wp:heading {"textAlign":"center"} -->
<h2 class="wp-block-heading has-text-align-center">The spring firing is ready</h2>
<!-- /wp:heading -->
<!-- wp:paragraph {"align":"center"} -->
<p class="has-text-align-center">Forty new pieces, glazed in sage and clay. When they are gone, they are gone.</p>
<!-- /wp:paragraph -->
<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button">Shop now</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:group -->
HTML
,
);
