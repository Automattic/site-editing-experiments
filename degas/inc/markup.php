<?php
/**
 * Small helpers that write core block markup, so the section types read as
 * structure rather than as walls of block comments. Each writes exactly what
 * the block's own save() would, so the blocks load as valid.
 *
 * @package Degas
 */

defined( 'ABSPATH' ) || exit;

/**
 * A block comment's attributes, or nothing when there are none.
 *
 * @param array $attrs Block attributes.
 * @return string
 */
function degas_attrs( $attrs ) {
	$attrs = array_filter(
		$attrs,
		function ( $v ) {
			return null !== $v && '' !== $v;
		}
	);
	return $attrs ? ' ' . wp_json_encode( $attrs, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) : '';
}

/**
 * A class attribute from a list of classes.
 *
 * @param string ...$classes Classes; empty ones are skipped.
 * @return string
 */
function degas_class( ...$classes ) {
	return esc_attr( trim( implode( ' ', array_filter( $classes ) ) ) );
}

/**
 * A group block.
 *
 * @param string $class_name Classes for the group.
 * @param string $inner      Inner blocks' markup.
 * @param array  $extra      Other attributes (align, tagName).
 * @return string
 */
function degas_group( $class_name, $inner, $extra = array() ) {
	$tag   = isset( $extra['tagName'] ) ? $extra['tagName'] : 'div';
	$align = isset( $extra['align'] ) ? 'align' . $extra['align'] : '';
	$attrs = array_merge( $extra, array( 'className' => $class_name, 'layout' => array( 'type' => 'default' ) ) );
	return '<!-- wp:group' . degas_attrs( $attrs ) . ' -->' . "\n"
		. '<' . $tag . ' class="' . degas_class( 'wp-block-group', $align, $class_name ) . '">' . $inner . '</' . $tag . '>' . "\n"
		. '<!-- /wp:group -->' . "\n";
}

/**
 * A paragraph.
 *
 * @param string $text       Text (may include inline HTML).
 * @param string $class_name Classes.
 * @return string
 */
function degas_p( $text, $class_name = '' ) {
	$c = $class_name ? ' class="' . degas_class( $class_name ) . '"' : '';
	return '<!-- wp:paragraph' . degas_attrs( array( 'className' => $class_name ) ) . ' -->' . "\n"
		. '<p' . $c . '>' . $text . '</p>' . "\n"
		. '<!-- /wp:paragraph -->' . "\n";
}

/**
 * A heading.
 *
 * @param string $text       Text.
 * @param int    $level      Heading level.
 * @param string $class_name Classes.
 * @return string
 */
function degas_h( $text, $level = 2, $class_name = '' ) {
	$attrs = array(
		'level'     => 2 === $level ? null : $level,
		'className' => $class_name,
	);
	return '<!-- wp:heading' . degas_attrs( $attrs ) . ' -->' . "\n"
		. '<h' . $level . ' class="' . degas_class( 'wp-block-heading', $class_name ) . '">' . $text . '</h' . $level . '>' . "\n"
		. '<!-- /wp:heading -->' . "\n";
}

/**
 * An image.
 *
 * @param string $src        Image URL.
 * @param string $alt        Alternative text.
 * @param string $class_name Classes.
 * @return string
 */
function degas_img( $src, $alt, $class_name = 'degas-media' ) {
	return '<!-- wp:image' . degas_attrs( array( 'className' => $class_name ) ) . ' -->' . "\n"
		. '<figure class="' . degas_class( 'wp-block-image', $class_name ) . '"><img src="' . esc_url( $src ) . '" alt="' . esc_attr( $alt ) . '"/></figure>' . "\n"
		. '<!-- /wp:image -->' . "\n";
}

/**
 * A row of buttons.
 *
 * @param array  $labels     Button labels; the first is the main one.
 * @param string $class_name Classes for the row.
 * @return string
 */
function degas_buttons( $labels, $class_name = '' ) {
	$inner = '';
	foreach ( (array) $labels as $i => $label ) {
		$outline = $i > 0 ? 'is-style-outline' : '';
		$inner  .= '<!-- wp:button' . degas_attrs( array( 'className' => $outline ) ) . ' -->' . "\n"
			. '<div class="' . degas_class( 'wp-block-button', $outline ) . '"><a class="wp-block-button__link wp-element-button">' . $label . '</a></div>' . "\n"
			. '<!-- /wp:button -->' . "\n";
	}
	return '<!-- wp:buttons' . degas_attrs( array( 'className' => $class_name ) ) . ' -->' . "\n"
		. '<div class="' . degas_class( 'wp-block-buttons', $class_name ) . '">' . $inner . '</div>' . "\n"
		. '<!-- /wp:buttons -->' . "\n";
}

/**
 * A section: a full-width group named after its kind, in its first layout.
 *
 * @param string $kind   Section kind, such as hero.
 * @param string $layout Starting layout.
 * @param string $inner  The section's content.
 * @param string $label  Name shown in the editor's List View.
 * @return string
 */
function degas_section( $kind, $layout, $inner, $label ) {
	$attrs = array(
		'metadata'  => array( 'name' => $label ),
		'align'     => 'full',
		'className' => 'degas-section degas-' . $kind . ' degas-layout-' . $layout,
		'layout'    => array( 'type' => 'default' ),
	);
	return '<!-- wp:group' . degas_attrs( $attrs ) . ' -->' . "\n"
		. '<div class="' . degas_class( 'wp-block-group', 'alignfull', $attrs['className'] ) . '">'
		. degas_group( 'degas-inner', $inner )
		. '</div>' . "\n"
		. '<!-- /wp:group -->';
}
