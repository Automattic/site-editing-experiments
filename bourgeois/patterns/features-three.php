<?php
/**
 * Pattern: Features: three columns
 *
 * @package SectionSiteEditor
 */

defined( 'ABSPATH' ) || exit;

return array(
	'slug'          => 'features-three',
	'title'         => __( 'Features: three columns', 'section-site-editor' ),
	'categories'    => array( 'sse-features' ),
	'viewportWidth' => 1400,
	'content'       => <<<'HTML'
<!-- wp:group {"metadata":{"name":"Features"},"align":"full","className":"is-style-sse-light-1","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull is-style-sse-light-1"><!-- wp:heading {"textAlign":"center"} -->
<h2 class="wp-block-heading has-text-align-center">What we make</h2>
<!-- /wp:heading -->
<!-- wp:paragraph {"align":"center"} -->
<p class="has-text-align-center">Three things the studio does best.</p>
<!-- /wp:paragraph -->
<!-- wp:columns {"align":"wide"} -->
<div class="wp-block-columns alignwide"><!-- wp:column -->
<div class="wp-block-column"><!-- wp:image {"aspectRatio":"4/3","scale":"cover","sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="{{images}}bowls.jpg" alt="Stacked glazed bowls" style="aspect-ratio:4/3;object-fit:cover"/></figure>
<!-- /wp:image -->
<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">Tableware</h3>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>Plates, bowls and mugs in seasonal glazes, made to go in the dishwasher.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:column -->
<!-- wp:column -->
<div class="wp-block-column"><!-- wp:image {"aspectRatio":"4/3","scale":"cover","sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="{{images}}throwing.jpg" alt="Hands shaping clay on a wheel" style="aspect-ratio:4/3;object-fit:cover"/></figure>
<!-- /wp:image -->
<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">Classes</h3>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>Six-week evening courses for beginners, and drop-in sessions for returning potters.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:column -->
<!-- wp:column -->
<div class="wp-block-column"><!-- wp:image {"aspectRatio":"4/3","scale":"cover","sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="{{images}}mugs-rack.jpg" alt="Mugs drying on a rack" style="aspect-ratio:4/3;object-fit:cover"/></figure>
<!-- /wp:image -->
<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">Commissions</h3>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>Sets for restaurants and cafés, from first sketch to final firing.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:column --></div>
<!-- /wp:columns --></div>
<!-- /wp:group -->
HTML
,
);
