<?php
/**
 * Pattern: Text: single column
 *
 * @package SquarespaceStyleSiteEditor
 */

defined( 'ABSPATH' ) || exit;

return array(
	'slug'          => 'text-single',
	'title'         => __( 'Text: single column', 'squarespace-style-site-editor' ),
	'categories'    => array( 'sse-text' ),
	'viewportWidth' => 1400,
	'content'       => <<<'HTML'
<!-- wp:group {"metadata":{"name":"Text"},"align":"full","className":"is-style-sse-lightest-1","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull is-style-sse-lightest-1"><!-- wp:heading -->
<h2 class="wp-block-heading">About the studio</h2>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>The studio started in a garden shed in [year] with one wheel and a second-hand kiln. It now has six wheels, two kilns and a shop at the front.</p>
<!-- /wp:paragraph -->
<!-- wp:paragraph -->
<p>Everything is made here, from wedging the clay to the final glaze firing. We sell from the shop, at markets, and online when a firing comes out of the kiln.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group -->
HTML
,
);
