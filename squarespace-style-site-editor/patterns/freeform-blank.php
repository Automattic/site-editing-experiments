<?php
/**
 * Pattern: Freeform: blank
 *
 * @package SquarespaceStyleSiteEditor
 */

defined( 'ABSPATH' ) || exit;

return array(
	'slug'          => 'freeform-blank',
	'title'         => __( 'Freeform: blank', 'squarespace-style-site-editor' ),
	'categories'    => array( 'sse-freeform' ),
	'viewportWidth' => 1400,
	'content'       => <<<'HTML'
<!-- wp:sse/fluid-section {"rows":8,"align":"full","className":"is-style-sse-lightest-1","metadata":{"name":"Freeform"}} -->
<div class="wp-block-sse-fluid-section alignfull is-style-sse-lightest-1" style="--sse-rows:8"><div class="wp-block-sse-fluid-section__grid"></div></div>
<!-- /wp:sse/fluid-section -->
HTML
,
);
