<?php
/**
 * Pattern: Gallery: three across
 *
 * @package SectionSiteEditor
 */

defined( 'ABSPATH' ) || exit;

return array(
	'slug'          => 'gallery-grid',
	'title'         => __( 'Gallery: three across', 'section-site-editor' ),
	'categories'    => array( 'sse-gallery' ),
	'viewportWidth' => 1400,
	'content'       => <<<'HTML'
<!-- wp:group {"metadata":{"name":"Gallery"},"align":"full","className":"is-style-sse-lightest-1","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull is-style-sse-lightest-1"><!-- wp:heading {"textAlign":"center"} -->
<h2 class="wp-block-heading has-text-align-center">From the latest firing</h2>
<!-- /wp:heading -->
<!-- wp:columns {"align":"wide"} -->
<div class="wp-block-columns alignwide"><!-- wp:column -->
<div class="wp-block-column"><!-- wp:image {"aspectRatio":"1/1","scale":"cover","sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="{{images}}bowls.jpg" alt="Glazed bowls" style="aspect-ratio:1/1;object-fit:cover"/></figure>
<!-- /wp:image --></div>
<!-- /wp:column -->
<!-- wp:column -->
<div class="wp-block-column"><!-- wp:image {"aspectRatio":"1/1","scale":"cover","sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="{{images}}throwing.jpg" alt="Throwing a pot" style="aspect-ratio:1/1;object-fit:cover"/></figure>
<!-- /wp:image --></div>
<!-- /wp:column -->
<!-- wp:column -->
<div class="wp-block-column"><!-- wp:image {"aspectRatio":"1/1","scale":"cover","sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="{{images}}mugs-rack.jpg" alt="Mugs on a rack" style="aspect-ratio:1/1;object-fit:cover"/></figure>
<!-- /wp:image --></div>
<!-- /wp:column --></div>
<!-- /wp:columns -->
<!-- wp:columns {"align":"wide"} -->
<div class="wp-block-columns alignwide"><!-- wp:column -->
<div class="wp-block-column"><!-- wp:image {"aspectRatio":"1/1","scale":"cover","sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="{{images}}shelves.jpg" alt="Shelves of pots" style="aspect-ratio:1/1;object-fit:cover"/></figure>
<!-- /wp:image --></div>
<!-- /wp:column -->
<!-- wp:column -->
<div class="wp-block-column"><!-- wp:image {"aspectRatio":"1/1","scale":"cover","sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="{{images}}bowls-white.jpg" alt="White bowls" style="aspect-ratio:1/1;object-fit:cover"/></figure>
<!-- /wp:image --></div>
<!-- /wp:column -->
<!-- wp:column -->
<div class="wp-block-column"><!-- wp:image {"aspectRatio":"1/1","scale":"cover","sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="{{images}}wheel-studio.jpg" alt="The studio wheel" style="aspect-ratio:1/1;object-fit:cover"/></figure>
<!-- /wp:image --></div>
<!-- /wp:column --></div>
<!-- /wp:columns --></div>
<!-- /wp:group -->
HTML
,
);
