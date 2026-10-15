<?php
/**
 * Pattern: Team: three across
 *
 * @package SectionSiteEditor
 */

defined( 'ABSPATH' ) || exit;

return array(
	'slug'          => 'team-three',
	'title'         => __( 'Team: three across', 'section-site-editor' ),
	'categories'    => array( 'sse-team' ),
	'viewportWidth' => 1400,
	'content'       => <<<'HTML'
<!-- wp:group {"metadata":{"name":"Team"},"align":"full","className":"is-style-sse-light-1","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull is-style-sse-light-1"><!-- wp:heading {"textAlign":"center"} -->
<h2 class="wp-block-heading has-text-align-center">The people in the studio</h2>
<!-- /wp:heading -->
<!-- wp:columns {"align":"wide"} -->
<div class="wp-block-columns alignwide"><!-- wp:column -->
<div class="wp-block-column"><!-- wp:image {"aspectRatio":"1/1","scale":"cover","sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="{{images}}throwing.jpg" alt="[Name]" style="aspect-ratio:1/1;object-fit:cover"/></figure>
<!-- /wp:image -->
<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">[Name]</h3>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>[Role]</p>
<!-- /wp:paragraph --></div>
<!-- /wp:column -->
<!-- wp:column -->
<div class="wp-block-column"><!-- wp:image {"aspectRatio":"1/1","scale":"cover","sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="{{images}}wheel-studio.jpg" alt="[Name]" style="aspect-ratio:1/1;object-fit:cover"/></figure>
<!-- /wp:image -->
<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">[Name]</h3>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>[Role]</p>
<!-- /wp:paragraph --></div>
<!-- /wp:column -->
<!-- wp:column -->
<div class="wp-block-column"><!-- wp:image {"aspectRatio":"1/1","scale":"cover","sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="{{images}}bowls.jpg" alt="[Name]" style="aspect-ratio:1/1;object-fit:cover"/></figure>
<!-- /wp:image -->
<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">[Name]</h3>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>[Role]</p>
<!-- /wp:paragraph --></div>
<!-- /wp:column --></div>
<!-- /wp:columns --></div>
<!-- /wp:group -->
HTML
,
);
