<?php
/**
 * A sample page to try the toolbars on: a few sections of ordinary core
 * blocks. The Playground blueprint makes it, and
 * /wp-admin/?hepworth-sample opens it in the editor.
 *
 * @package Hepworth
 */

defined( 'ABSPATH' ) || exit;

/**
 * The sample page's block markup.
 *
 * @return string
 */
function hepworth_sample_content() {
	$img = HEPWORTH_URL . 'assets/images/';
	$pad = '{"top":"var:preset|spacing|60","bottom":"var:preset|spacing|60"}';
	$sty = 'padding-top:var(--wp--preset--spacing--60);padding-bottom:var(--wp--preset--spacing--60)';

	return <<<HTML
<!-- wp:media-text {"align":"full","mediaPosition":"right","mediaType":"image","mediaUrl":"{$img}throwing.jpg","mediaAlt":"Hands shaping clay on a spinning wheel"} -->
<div class="wp-block-media-text alignfull has-media-on-the-right is-stacked-on-mobile"><div class="wp-block-media-text__content"><!-- wp:heading {"level":4} -->
<h4 class="wp-block-heading">Handmade in small batches</h4>
<!-- /wp:heading -->

<!-- wp:heading {"level":1} -->
<h1 class="wp-block-heading">Stoneware for everyday tables</h1>
<!-- /wp:heading -->

<!-- wp:paragraph {"fontSize":"large"} -->
<p class="has-large-font-size">Bowls, mugs and plates thrown on the wheel and glazed by hand in our studio.</p>
<!-- /wp:paragraph -->

<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button">Shop the collection</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div><figure class="wp-block-media-text__media"><img src="{$img}throwing.jpg" alt="Hands shaping clay on a spinning wheel"/></figure></div>
<!-- /wp:media-text -->

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{$pad}}},"backgroundColor":"accent-5","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull has-accent-5-background-color has-background" style="{$sty}"><!-- wp:columns -->
<div class="wp-block-columns"><!-- wp:column -->
<div class="wp-block-column"><!-- wp:heading -->
<h2 class="wp-block-heading">A small studio with a big kiln</h2>
<!-- /wp:heading --></div>
<!-- /wp:column -->

<!-- wp:column -->
<div class="wp-block-column"><!-- wp:paragraph -->
<p>We started with one wheel in a garden shed. Now there are six of us, sharing a converted dairy at the edge of town and firing every Friday.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Every piece is made from local clay and finished in glazes we mix ourselves, so no two batches are quite the same.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph {"fontSize":"small"} -->
<p class="has-small-font-size">Seconds are sold at the studio door on the first Saturday of each month.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:column --></div>
<!-- /wp:columns --></div>
<!-- /wp:group -->

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{$pad}}},"backgroundColor":"contrast","textColor":"base","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull has-base-color has-contrast-background-color has-text-color has-background" style="{$sty}"><!-- wp:pullquote -->
<figure class="wp-block-pullquote"><blockquote><p>Every piece is a little different, and that’s the point.</p><cite>[Name], founder</cite></blockquote></figure>
<!-- /wp:pullquote --></div>
<!-- /wp:group -->

<!-- wp:media-text {"align":"full","mediaType":"image","mediaUrl":"{$img}wheel-studio.jpg","mediaAlt":"A potter’s wheel surrounded by finished pots in a studio"} -->
<div class="wp-block-media-text alignfull is-stacked-on-mobile"><figure class="wp-block-media-text__media"><img src="{$img}wheel-studio.jpg" alt="A potter’s wheel surrounded by finished pots in a studio"/></figure><div class="wp-block-media-text__content"><!-- wp:heading -->
<h2 class="wp-block-heading">Learn to throw</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>Small classes for complete beginners and people who’ve been away from the wheel for a while.</p>
<!-- /wp:paragraph -->

<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button {"className":"is-style-outline"} -->
<div class="wp-block-button is-style-outline"><a class="wp-block-button__link wp-element-button">See class dates</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div></div>
<!-- /wp:media-text -->

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{$pad}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull" style="{$sty}"><!-- wp:heading {"textAlign":"center"} -->
<h2 class="wp-block-heading has-text-align-center">Visit the studio</h2>
<!-- /wp:heading -->

<!-- wp:paragraph {"align":"center"} -->
<p class="has-text-align-center">[Address line], [Town], [Postcode]. Open Thursday to Sunday, 10am to 5pm.</p>
<!-- /wp:paragraph -->

<!-- wp:image {"sizeSlug":"large","align":"center"} -->
<figure class="wp-block-image aligncenter size-large"><img src="{$img}bowls.jpg" alt="Assorted stoneware bowls on a brown surface"/></figure>
<!-- /wp:image -->

<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button">Get directions</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:group -->
HTML;
}

/**
 * Makes the sample page, once, and returns its ID.
 *
 * @return int Page ID, or 0 if it couldn't be made.
 */
function hepworth_create_sample_page() {
	$existing = get_posts(
		array(
			'post_type'   => 'page',
			'post_status' => 'any',
			'meta_key'    => '_hepworth_sample', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_query_meta_key
			'numberposts' => 1,
			'fields'      => 'ids',
		)
	);
	if ( $existing ) {
		return (int) $existing[0];
	}
	$id = wp_insert_post(
		array(
			'post_type'    => 'page',
			'post_status'  => 'publish',
			'post_author'  => get_current_user_id() ? get_current_user_id() : 1,
			'post_title'   => __( 'Northfield Ceramics', 'hepworth' ),
			'post_content' => wp_slash( hepworth_sample_content() ),
			'meta_input'   => array( '_hepworth_sample' => 1 ),
		)
	);
	return is_wp_error( $id ) ? 0 : (int) $id;
}

/**
 * /wp-admin/?hepworth-sample opens the sample page in the editor, making
 * it first if it isn't there yet.
 */
function hepworth_open_sample_page() {
	if ( ! isset( $_GET['hepworth-sample'] ) || ! current_user_can( 'edit_pages' ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		return;
	}
	$id = hepworth_create_sample_page();
	if ( $id ) {
		wp_safe_redirect( admin_url( 'post.php?post=' . $id . '&action=edit' ) );
		exit;
	}
}
add_action( 'admin_init', 'hepworth_open_sample_page' );
