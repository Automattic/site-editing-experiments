<?php
/**
 * Pattern: Hero: centred
 *
 * @package SectionSiteEditor
 */

defined( 'ABSPATH' ) || exit;

return array(
	'slug'          => 'hero-centred',
	'title'         => __( 'Hero: centred', 'section-site-editor' ),
	'categories'    => array( 'sse-hero' ),
	'viewportWidth' => 1400,
	'content'       => <<<'HTML'
<!-- wp:group {"metadata":{"name":"Intro"},"align":"full","className":"is-style-sse-darkest-1","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull is-style-sse-darkest-1"><!-- wp:heading {"textAlign":"center","level":1} -->
<h1 class="wp-block-heading has-text-align-center">Made slowly, made to be used</h1>
<!-- /wp:heading -->
<!-- wp:paragraph {"align":"center"} -->
<p class="has-text-align-center">Everyday pots for everyday tables, thrown and glazed by hand.</p>
<!-- /wp:paragraph -->
<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button">See the collection</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons -->
<!-- wp:image {"aspectRatio":"21/9","scale":"cover","sizeSlug":"large","linkDestination":"none","align":"wide"} -->
<figure class="wp-block-image alignwide size-large"><img src="{{images}}shelves.jpg" alt="Shelves of finished bowls and cups" style="aspect-ratio:21/9;object-fit:cover"/></figure>
<!-- /wp:image --></div>
<!-- /wp:group -->
HTML
,
);
