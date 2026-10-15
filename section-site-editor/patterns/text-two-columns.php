<?php
/**
 * Pattern: About: heading beside text
 *
 * @package SectionSiteEditor
 */

defined( 'ABSPATH' ) || exit;

return array(
	'slug'          => 'text-two-columns',
	'title'         => __( 'About: heading beside text', 'section-site-editor' ),
	'categories'    => array( 'sse-text' ),
	'viewportWidth' => 1400,
	'content'       => <<<'HTML'
<!-- wp:group {"metadata":{"name":"About"},"align":"full","className":"is-style-sse-lightest-2","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull is-style-sse-lightest-2"><!-- wp:columns {"align":"wide"} -->
<div class="wp-block-columns alignwide"><!-- wp:column -->
<div class="wp-block-column"><!-- wp:heading -->
<h2 class="wp-block-heading">A studio by the river</h2>
<!-- /wp:heading --></div>
<!-- /wp:column -->
<!-- wp:column -->
<div class="wp-block-column"><!-- wp:paragraph -->
<p>The studio started in a garden shed in [year] with one wheel and a second-hand kiln. It now has six wheels, two kilns and a shop at the front.</p>
<!-- /wp:paragraph -->
<!-- wp:paragraph -->
<p>Everything is made here, from wedging the clay to the final glaze firing.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:column --></div>
<!-- /wp:columns --></div>
<!-- /wp:group -->
HTML
,
);
