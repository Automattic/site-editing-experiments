<?php
/**
 * Site-wide animations, chosen in Site Styles: section content fades,
 * scales, slides or unclips into place as it scrolls into view.
 *
 * The choice is stored in global styles (settings.custom.sse.animation), so
 * it saves, resets and travels with the rest of the site's styles.
 *
 * @package SectionSiteEditor
 */

defined( 'ABSPATH' ) || exit;

/**
 * The animations on offer.
 *
 * @return array<string,string> Slug => label.
 */
function sse_animations() {
	return array(
		'fade'  => __( 'Fade', 'section-site-editor' ),
		'scale' => __( 'Scale', 'section-site-editor' ),
		'slide' => __( 'Slide', 'section-site-editor' ),
		'clip'  => __( 'Clip', 'section-site-editor' ),
		'flex'  => __( 'Flex', 'section-site-editor' ),
	);
}

/**
 * The site's animation, if it has one.
 *
 * @return string Slug, or '' for none.
 */
function sse_current_animation() {
	if ( ! function_exists( 'wp_get_global_settings' ) ) {
		return '';
	}
	$value = wp_get_global_settings( array( 'custom', 'sse', 'animation' ) );
	return is_string( $value ) && isset( sse_animations()[ $value ] ) ? $value : '';
}

/**
 * CSS for the animations. Nothing is hidden until the script has marked
 * what it will animate, so the page reads fine without JavaScript, and
 * people who ask for reduced motion see everything in place.
 *
 * @return string
 */
function sse_animation_css() {
	$hidden = array(
		'fade'  => 'opacity:0;',
		'scale' => 'opacity:0;transform:scale(.9);',
		'slide' => 'opacity:0;transform:translateY(2.5rem);',
		'clip'  => 'clip-path:inset(0 0 100% 0);',
		'flex'  => 'opacity:0;transform:translateY(2rem) scale(.96);',
	);
	$css = '.sse-anim{transition:opacity .7s ease,transform .8s cubic-bezier(.2,.7,.2,1),clip-path .9s cubic-bezier(.6,0,.2,1);transition-delay:var(--sse-anim-delay,0s);}';
	// Flex overshoots a little and settles, like something on a spring.
	$css .= '.sse-animate-flex .sse-anim{transition-timing-function:ease,cubic-bezier(.3,1.6,.5,1),ease;}';
	foreach ( $hidden as $slug => $rule ) {
		$css .= sprintf( '.sse-animate-%1$s .sse-anim:not(.is-in){%2$s}', $slug, $rule );
	}
	$css .= '@media (prefers-reduced-motion:reduce){.sse-anim{transition:none !important;opacity:1 !important;transform:none !important;clip-path:none !important;}}';
	return $css;
}

/**
 * Marks section content and reveals it as it scrolls into view. Kept small
 * and dependency-free; it runs on the front end only.
 *
 * @return string
 */
function sse_animation_js() {
	return <<<'JS'
( function () {
	var root = document.querySelector( '.wp-block-post-content' ) || document.body;
	var sections = Array.prototype.slice.call( root.children );
	var targets = [];
	sections.forEach( function ( section ) {
		var parent =
			section.querySelector( ':scope > .wp-block-cover__inner-container' ) ||
			section.querySelector( ':scope > .wp-block-sse-fluid-section__grid' ) ||
			section;
		var content = function ( el ) {
			return Array.prototype.filter.call( el.children, function ( child ) {
				return ! child.matches( 'video, img.wp-block-cover__image-background, .wp-block-cover__background, style, script' );
			} );
		};
		var items = content( parent );
		// A lone wrapper (columns, a group) animates its contents instead.
		for ( var depth = 0; depth < 3 && items.length === 1; depth++ ) {
			var inner = [];
			content( items[ 0 ] ).forEach( function ( child ) {
				var grand = child.classList.contains( 'wp-block-column' ) ? content( child ) : [];
				inner = inner.concat( grand.length ? grand : [ child ] );
			} );
			if ( inner.length < 2 ) {
				break;
			}
			items = inner;
		}
		if ( parent === section && ! items.length ) {
			items = [ section ];
		}
		items.forEach( function ( el, i ) {
			el.classList.add( 'sse-anim' );
			el.style.setProperty( '--sse-anim-delay', Math.min( i * 0.08, 0.4 ) + 's' );
			targets.push( el );
		} );
	} );
	if ( ! ( 'IntersectionObserver' in window ) ) {
		targets.forEach( function ( el ) { el.classList.add( 'is-in' ); } );
		return;
	}
	var observer = new IntersectionObserver( function ( entries ) {
		entries.forEach( function ( entry ) {
			if ( entry.isIntersecting ) {
				entry.target.classList.add( 'is-in' );
				observer.unobserve( entry.target );
			}
		} );
	}, { rootMargin: '0px 0px -8% 0px' } );
	targets.forEach( function ( el ) { observer.observe( el ); } );
} )();
JS;
}

/**
 * Loads the animation on the front end, when the site has one.
 */
function sse_enqueue_animation() {
	if ( is_admin() || ! sse_current_animation() ) {
		return;
	}
	wp_register_style( 'sse-animations', false, array(), SSE_VERSION );
	wp_add_inline_style( 'sse-animations', sse_animation_css() );
	wp_enqueue_style( 'sse-animations' );

	wp_register_script( 'sse-animations', false, array(), SSE_VERSION, true );
	wp_add_inline_script( 'sse-animations', sse_animation_js() );
	wp_enqueue_script( 'sse-animations' );
}
add_action( 'wp_enqueue_scripts', 'sse_enqueue_animation' );

/**
 * Names the site's animation on the body, for the CSS.
 *
 * @param string[] $classes Body classes.
 * @return string[]
 */
function sse_animation_body_class( $classes ) {
	$animation = sse_current_animation();
	if ( $animation ) {
		$classes[] = 'sse-animate-' . $animation;
	}
	return $classes;
}
add_filter( 'body_class', 'sse_animation_body_class' );
