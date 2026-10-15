<?php
/**
 * Pattern: Freeform: staggered images
 *
 * @package SectionSiteEditor
 */

defined( 'ABSPATH' ) || exit;

return array(
	'slug'          => 'freeform-staggered',
	'title'         => __( 'Freeform: staggered images', 'section-site-editor' ),
	'categories'    => array( 'sse-freeform' ),
	'viewportWidth' => 1400,
	'content'       => <<<'HTML'
<!-- wp:sse/fluid-section {"rows":12,"align":"full","className":"is-style-sse-dark-1","metadata":{"name":"Freeform"}} -->
<div class="wp-block-sse-fluid-section alignfull is-style-sse-dark-1" style="--sse-rows:12"><div class="wp-block-sse-fluid-section__grid"><!-- wp:sse/fluid-item {"layout":{"c":3,"r":2,"w":20,"h":3}} -->
<div class="wp-block-sse-fluid-item" style="--sse-c:3;--sse-w:20;--sse-r:2;--sse-h:3;--sse-o:203"><div class="wp-block-sse-fluid-item__content"><!-- wp:heading -->
<h2 class="wp-block-heading">From the kiln</h2>
<!-- /wp:heading --></div></div>
<!-- /wp:sse/fluid-item -->

<!-- wp:sse/fluid-item {"layout":{"c":3,"r":5,"w":6,"h":7}} -->
<div class="wp-block-sse-fluid-item" style="--sse-c:3;--sse-w:6;--sse-r:5;--sse-h:7;--sse-o:503"><div class="wp-block-sse-fluid-item__content"><!-- wp:image {"sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="{{images}}mugs-rack.jpg" alt="Mugs on a rack"/></figure>
<!-- /wp:image --></div></div>
<!-- /wp:sse/fluid-item -->

<!-- wp:sse/fluid-item {"layout":{"c":10,"r":6,"w":6,"h":7}} -->
<div class="wp-block-sse-fluid-item" style="--sse-c:10;--sse-w:6;--sse-r:6;--sse-h:7;--sse-o:610"><div class="wp-block-sse-fluid-item__content"><!-- wp:image {"sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="{{images}}bowls-white.jpg" alt="White bowls"/></figure>
<!-- /wp:image --></div></div>
<!-- /wp:sse/fluid-item -->

<!-- wp:sse/fluid-item {"layout":{"c":17,"r":5,"w":6,"h":7}} -->
<div class="wp-block-sse-fluid-item" style="--sse-c:17;--sse-w:6;--sse-r:5;--sse-h:7;--sse-o:517"><div class="wp-block-sse-fluid-item__content"><!-- wp:image {"sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="{{images}}shelves.jpg" alt="Shelves of pots"/></figure>
<!-- /wp:image --></div></div>
<!-- /wp:sse/fluid-item --></div></div>
<!-- /wp:sse/fluid-section -->
HTML
,
);
