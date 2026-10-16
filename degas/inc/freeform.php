<?php
/**
 * Freeform positions on the site.
 *
 * In Freeform, an item keeps its place in the section's layout and is moved
 * and sized from there. The editor saves that as a `degasFree` attribute on
 * the block ({x, y, w, h}: x and w in percent of the section's width, y and h
 * in pixels). Here it becomes CSS custom properties on the block's outer
 * element; the section styles apply them on screens wide enough for the
 * desktop layout, and phones get the plain layout. Turn the plugin off and
 * the blocks simply sit in their layout.
 *
 * @package Degas
 */

defined( 'ABSPATH' ) || exit;

/**
 * The style declarations for a freeform position.
 *
 * @param array $free The degasFree attribute.
 * @return array{0:string[],1:string[]} Classes and declarations.
 */
function degas_free_style( $free ) {
	$classes = array();
	$decl    = array();
	$num     = function ( $v ) {
		return is_numeric( $v ) ? round( (float) $v, 3 ) : null;
	};
	$x       = isset( $free['x'] ) ? $num( $free['x'] ) : null;
	$y       = isset( $free['y'] ) ? $num( $free['y'] ) : null;
	$w       = isset( $free['w'] ) ? $num( $free['w'] ) : null;
	$h       = isset( $free['h'] ) ? $num( $free['h'] ) : null;
	if ( $x || $y ) {
		$classes[] = 'has-degas-offset';
		$decl[]    = '--degas-x:' . ( $x ? $x : 0 );
		$decl[]    = '--degas-y:' . ( $y ? $y : 0 );
	}
	if ( $w ) {
		$classes[] = 'has-degas-width';
		$decl[]    = '--degas-w:' . $w;
	}
	if ( $h ) {
		$classes[] = 'has-degas-height';
		$decl[]    = '--degas-h:' . $h;
	}
	return array( $classes, $decl );
}

/**
 * Adds a block's freeform position to its outer element.
 *
 * @param string $content Rendered block.
 * @param array  $block   Parsed block.
 * @return string
 */
function degas_render_free( $content, $block ) {
	if ( empty( $block['attrs']['degasFree'] ) || ! is_array( $block['attrs']['degasFree'] ) || '' === trim( $content ) ) {
		return $content;
	}
	list( $classes, $decl ) = degas_free_style( $block['attrs']['degasFree'] );
	if ( ! $classes ) {
		return $content;
	}
	$tags = new WP_HTML_Tag_Processor( $content );
	if ( ! $tags->next_tag() ) {
		return $content;
	}
	foreach ( $classes as $class_name ) {
		$tags->add_class( $class_name );
	}
	$style = (string) $tags->get_attribute( 'style' );
	$tags->set_attribute( 'style', rtrim( implode( ';', $decl ) . ';' . $style, ';' ) );
	return $tags->get_updated_html();
}
add_filter( 'render_block', 'degas_render_free', 10, 2 );
