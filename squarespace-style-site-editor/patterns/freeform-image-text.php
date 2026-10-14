<?php
/**
 * Pattern: Freeform: image and text
 *
 * @package SquarespaceStyleSiteEditor
 */

defined( 'ABSPATH' ) || exit;

return array(
	'slug'          => 'freeform-image-text',
	'title'         => __( 'Freeform: image and text', 'squarespace-style-site-editor' ),
	'categories'    => array( 'sse-freeform' ),
	'viewportWidth' => 1400,
	'content'       => <<<'HTML'
<!-- wp:sse/fluid-section {"rows":14,"align":"full","className":"is-style-sse-lightest-1","metadata":{"name":"Freeform"}} -->
<div class="wp-block-sse-fluid-section alignfull is-style-sse-lightest-1" style="--sse-rows:14"><div class="wp-block-sse-fluid-section__grid"><!-- wp:sse/fluid-item {"layout":{"c":1,"r":1,"w":11,"h":14}} -->
<div class="wp-block-sse-fluid-item" style="--sse-c:1;--sse-w:11;--sse-r:1;--sse-h:14;--sse-o:101"><div class="wp-block-sse-fluid-item__content"><!-- wp:image {"sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="{{images}}throwing.jpg" alt="Hands shaping clay on a wheel"/></figure>
<!-- /wp:image --></div></div>
<!-- /wp:sse/fluid-item -->

<!-- wp:sse/fluid-item {"layout":{"c":13,"r":3,"w":11,"h":3}} -->
<div class="wp-block-sse-fluid-item" style="--sse-c:13;--sse-w:11;--sse-r:3;--sse-h:3;--sse-o:313"><div class="wp-block-sse-fluid-item__content"><!-- wp:heading -->
<h2 class="wp-block-heading">Every pot starts as a lump of clay</h2>
<!-- /wp:heading --></div></div>
<!-- /wp:sse/fluid-item -->

<!-- wp:sse/fluid-item {"layout":{"c":13,"r":6,"w":9,"h":4}} -->
<div class="wp-block-sse-fluid-item" style="--sse-c:13;--sse-w:9;--sse-r:6;--sse-h:4;--sse-o:613"><div class="wp-block-sse-fluid-item__content"><!-- wp:paragraph -->
<p>Click a block and drag it anywhere, drag its edges to resize it, and click again to edit it. Blocks can overlap. Switch the preview to Mobile to arrange a separate mobile layout.</p>
<!-- /wp:paragraph --></div></div>
<!-- /wp:sse/fluid-item -->

<!-- wp:sse/fluid-item {"layout":{"c":13,"r":10,"w":6,"h":2}} -->
<div class="wp-block-sse-fluid-item" style="--sse-c:13;--sse-w:6;--sse-r:10;--sse-h:2;--sse-o:1013"><div class="wp-block-sse-fluid-item__content"><!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button">Book a class</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div></div>
<!-- /wp:sse/fluid-item -->

<!-- wp:sse/fluid-item {"layout":{"c":19,"r":9,"w":6,"h":6},"zIndex":1} -->
<div class="wp-block-sse-fluid-item" style="--sse-c:19;--sse-w:6;--sse-r:9;--sse-h:6;--sse-o:919;--sse-z:1"><div class="wp-block-sse-fluid-item__content"><!-- wp:image {"sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="{{images}}bowls.jpg" alt="Glazed bowls"/></figure>
<!-- /wp:image --></div></div>
<!-- /wp:sse/fluid-item --></div></div>
<!-- /wp:sse/fluid-section -->
HTML
,
);
