<?php
/**
 * Pattern: Features: image beside list
 *
 * @package SquarespaceStyleSiteEditor
 */

defined( 'ABSPATH' ) || exit;

return array(
	'slug'          => 'features-list',
	'title'         => __( 'Features: image beside list', 'squarespace-style-site-editor' ),
	'categories'    => array( 'sse-features' ),
	'viewportWidth' => 1400,
	'content'       => <<<'HTML'
<!-- wp:group {"metadata":{"name":"Features"},"align":"full","className":"is-style-sse-lightest-2","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull is-style-sse-lightest-2"><!-- wp:columns {"verticalAlignment":"center","align":"wide"} -->
<div class="wp-block-columns alignwide are-vertically-aligned-center"><!-- wp:column {"verticalAlignment":"center"} -->
<div class="wp-block-column is-vertically-aligned-center"><!-- wp:image {"aspectRatio":"1/1","scale":"cover","sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="{{images}}bowls-white.jpg" alt="White bowls on a table" style="aspect-ratio:1/1;object-fit:cover"/></figure>
<!-- /wp:image --></div>
<!-- /wp:column -->
<!-- wp:column {"verticalAlignment":"center"} -->
<div class="wp-block-column is-vertically-aligned-center"><!-- wp:heading -->
<h2 class="wp-block-heading">Why our pots last</h2>
<!-- /wp:heading -->
<!-- wp:list -->
<ul class="wp-block-list"><!-- wp:list-item -->
<li>High-fired stoneware, chip resistant</li>
<!-- /wp:list-item -->
<!-- wp:list-item -->
<li>Food-safe glazes, mixed in the studio</li>
<!-- /wp:list-item -->
<!-- wp:list-item -->
<li>Every piece checked before it leaves</li>
<!-- /wp:list-item -->
<!-- wp:list-item -->
<li>Free repairs in the first year</li>
<!-- /wp:list-item --></ul>
<!-- /wp:list -->
<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button">Read about our process</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:column --></div>
<!-- /wp:columns --></div>
<!-- /wp:group -->
HTML
,
);
