<?php
/**
 * Pattern: About: text with image
 *
 * @package SectionSiteEditor
 */

defined( 'ABSPATH' ) || exit;

return array(
	'slug'          => 'text-image',
	'title'         => __( 'About: text with image', 'section-site-editor' ),
	'categories'    => array( 'sse-text' ),
	'viewportWidth' => 1400,
	'content'       => <<<'HTML'
<!-- wp:group {"metadata":{"name":"About"},"align":"full","className":"is-style-sse-lightest-1","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull is-style-sse-lightest-1"><!-- wp:columns {"verticalAlignment":"center","align":"wide"} -->
<div class="wp-block-columns alignwide are-vertically-aligned-center"><!-- wp:column {"verticalAlignment":"center"} -->
<div class="wp-block-column is-vertically-aligned-center"><!-- wp:heading -->
<h2 class="wp-block-heading">Meet the potter</h2>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>[Name] trained in [place] and has been throwing pots for [number] years. Most days you will find them at the wheel nearest the window.</p>
<!-- /wp:paragraph -->
<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button">Read more</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:column -->
<!-- wp:column {"verticalAlignment":"center"} -->
<div class="wp-block-column is-vertically-aligned-center"><!-- wp:image {"aspectRatio":"4/5","scale":"cover","sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="{{images}}wheel-studio.jpg" alt="The studio wheel by the window" style="aspect-ratio:4/5;object-fit:cover"/></figure>
<!-- /wp:image --></div>
<!-- /wp:column --></div>
<!-- /wp:columns --></div>
<!-- /wp:group -->
HTML
,
);
