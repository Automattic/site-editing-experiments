<?php
/**
 * Pattern: Image: wide with caption
 *
 * @package SquarespaceStyleSiteEditor
 */

defined( 'ABSPATH' ) || exit;

return array(
	'slug'          => 'image-wide',
	'title'         => __( 'Image: wide with caption', 'squarespace-style-site-editor' ),
	'categories'    => array( 'sse-image' ),
	'viewportWidth' => 1400,
	'content'       => <<<'HTML'
<!-- wp:group {"metadata":{"name":"Images"},"align":"full","className":"is-style-sse-lightest-1","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull is-style-sse-lightest-1"><!-- wp:image {"aspectRatio":"16/9","scale":"cover","sizeSlug":"large","linkDestination":"none","align":"wide"} -->
<figure class="wp-block-image alignwide size-large"><img src="{{images}}mugs-rack.jpg" alt="Rows of mugs drying on wooden racks" style="aspect-ratio:16/9;object-fit:cover"/><figcaption class="wp-element-caption">Mugs drying before their first firing.</figcaption></figure>
<!-- /wp:image --></div>
<!-- /wp:group -->
HTML
,
);
