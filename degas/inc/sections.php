<?php
/**
 * The twelve section types, their layouts and the colour palettes. The same
 * definitions feed the editor's Add section picker and the block patterns in
 * the inserter.
 *
 * @package Degas
 */

defined( 'ABSPATH' ) || exit;

/**
 * A placeholder photo that ships with the plugin.
 *
 * @param int $n Photo number, wrapping round.
 * @return array{0:string,1:string} URL and alternative text.
 */
function degas_photo( $n ) {
	$photos = array(
		array( 'wheel-studio.jpg', __( 'A potter’s wheel surrounded by finished pots in a studio', 'degas' ) ),
		array( 'bowls.jpg', __( 'Assorted stoneware bowls on a brown surface', 'degas' ) ),
		array( 'mugs-rack.jpg', __( 'Glazed mugs hanging on a rack', 'degas' ) ),
		array( 'throwing.jpg', __( 'Hands shaping clay on a spinning wheel', 'degas' ) ),
		array( 'shelves.jpg', __( 'Ceramic bowls and saucers stacked on wooden shelves', 'degas' ) ),
		array( 'bowls-white.jpg', __( 'White and brown ceramic bowls', 'degas' ) ),
	);
	$p = $photos[ $n % count( $photos ) ];
	return array( DEGAS_URL . 'assets/images/' . $p[0], $p[1] );
}

/**
 * An image block with a placeholder photo.
 *
 * @param int    $n          Photo number.
 * @param string $class_name Classes.
 * @return string
 */
function degas_photo_img( $n, $class_name = 'degas-media' ) {
	list( $src, $alt ) = degas_photo( $n );
	return degas_img( $src, $alt, $class_name );
}

/**
 * The section types: name, layouts, and the markup a new one starts with.
 *
 * Layouts with a `when` only appear once the section has enough content
 * (the editor checks: count of `selector` at least `min`).
 *
 * @return array[]
 */
function degas_section_library() {
	$card = function ( $n, $title, $text ) {
		return degas_group( 'degas-card', degas_photo_img( $n ) . degas_h( $title, 3 ) . degas_p( $text ) );
	};
	$qa = function ( $q ) {
		return degas_group( 'degas-card degas-qa', degas_h( $q, 3 ) . degas_p( __( 'Answer this question here. Switch to Edit content to change it.', 'degas' ) ) );
	};
	$person = function ( $n, $name, $role ) {
		return degas_group( 'degas-card degas-person', degas_photo_img( $n, 'degas-media degas-avatar' ) . degas_h( $name, 3 ) . degas_p( $role ) );
	};
	$plan = function ( $name, $price, $text ) {
		return degas_group( 'degas-card degas-plan', degas_h( $name, 3 ) . degas_p( $price, 'degas-price' ) . degas_p( $text ) . degas_buttons( array( __( 'Choose plan', 'degas' ) ) ) );
	};

	$sections = array(
		array(
			'kind'    => 'hero',
			'title'   => __( 'Hero', 'degas' ),
			'layouts' => array(
				array( 'id' => 'split', 'label' => __( 'Split', 'degas' ) ),
				array( 'id' => 'centered', 'label' => __( 'Centered', 'degas' ) ),
				array( 'id' => 'gallery', 'label' => __( 'Image row', 'degas' ), 'when' => array( '.degas-hero__media > .wp-block-image', 2 ) ),
				array( 'id' => 'flip', 'label' => __( 'Image left', 'degas' ) ),
				array( 'id' => 'cover', 'label' => __( 'Cover', 'degas' ) ),
			),
			'content' => degas_section(
				'hero',
				'split',
				degas_group(
					'degas-slot degas-hero__text',
					degas_p( __( 'Handmade in small batches', 'degas' ), 'degas-eyebrow' )
					. degas_h( __( 'Stoneware for everyday tables', 'degas' ), 1 )
					. degas_p( __( 'Bowls, mugs and plates thrown on the wheel and glazed by hand in our studio.', 'degas' ), 'degas-lead' )
					. degas_buttons( array( __( 'Shop the collection', 'degas' ) ) )
				) . degas_group( 'degas-slot degas-hero__media', degas_photo_img( 0 ) ),
				__( 'Hero', 'degas' )
			),
		),
		array(
			'kind'    => 'features',
			'title'   => __( 'Features', 'degas' ),
			'layouts' => array(
				array( 'id' => 'cols', 'label' => __( 'Three columns', 'degas' ) ),
				array( 'id' => 'list', 'label' => __( 'Stacked list', 'degas' ) ),
				array( 'id' => 'cols4', 'label' => __( 'Four columns', 'degas' ), 'when' => array( '.degas-card', 4 ) ),
				array( 'id' => 'feature', 'label' => __( 'Featured', 'degas' ) ),
			),
			'content' => degas_section(
				'features',
				'cols',
				degas_h( __( 'What we make', 'degas' ) )
				. degas_group(
					'degas-slot degas-cards',
					$card( 1, __( 'Tableware', 'degas' ), __( 'Plates, bowls and serving pieces built for daily use.', 'degas' ) )
					. $card( 2, __( 'Mugs & cups', 'degas' ), __( 'Comfortable handles and generous sizes, glazed inside and out.', 'degas' ) )
					. $card( 3, __( 'Classes', 'degas' ), __( 'Learn to throw on the wheel in a four-week evening course.', 'degas' ) )
				),
				__( 'Features', 'degas' )
			),
		),
		array(
			'kind'    => 'cta',
			'title'   => __( 'Call to action', 'degas' ),
			'layouts' => array(
				array( 'id' => 'center', 'label' => __( 'Centered', 'degas' ) ),
				array( 'id' => 'split', 'label' => __( 'Split', 'degas' ) ),
				array( 'id' => 'banner', 'label' => __( 'Dark banner', 'degas' ) ),
			),
			'content' => degas_section(
				'cta',
				'center',
				degas_group(
					'degas-slot degas-cta__panel',
					degas_group(
						'degas-slot degas-cta__text',
						degas_h( __( 'Visit the open studio', 'degas' ) )
						. degas_p( __( 'See the kilns, meet the makers and browse seconds at reduced prices.', 'degas' ), 'degas-lead' )
					) . degas_buttons( array( __( 'Plan your visit', 'degas' ) ) )
				),
				__( 'Call to action', 'degas' )
			),
		),
		array(
			'kind'    => 'text',
			'title'   => __( 'Text', 'degas' ),
			'layouts' => array(
				array( 'id' => 'left', 'label' => __( 'Single column', 'degas' ) ),
				array( 'id' => 'center', 'label' => __( 'Centered', 'degas' ) ),
				array( 'id' => 'cols2', 'label' => __( 'Two text columns', 'degas' ), 'when' => array( '.degas-text__body > p', 3 ) ),
				array( 'id' => 'two', 'label' => __( 'Two columns', 'degas' ) ),
			),
			'content' => degas_section(
				'text',
				'left',
				degas_h( __( 'Our story', 'degas' ) )
				. degas_group(
					'degas-slot degas-text__body',
					degas_p( __( 'Use this section for a longer piece of writing: the story behind the studio, how the work is made, or anything that needs more than a line or two.', 'degas' ) )
					. degas_p( __( 'Add more paragraphs, headings or a button from Edit layout, and change the words in Edit content.', 'degas' ) )
				),
				__( 'Text', 'degas' )
			),
		),
		array(
			'kind'    => 'image',
			'title'   => __( 'Image', 'degas' ),
			'layouts' => array(
				array( 'id' => 'wide', 'label' => __( 'Contained', 'degas' ) ),
				array( 'id' => 'full', 'label' => __( 'Full width', 'degas' ) ),
				array( 'id' => 'side', 'label' => __( 'With caption', 'degas' ) ),
			),
			'content' => degas_section(
				'image',
				'wide',
				degas_photo_img( 4, 'degas-media degas-banner' )
				. degas_group( 'degas-slot degas-image__text', degas_p( __( 'A short caption that describes the photo.', 'degas' ), 'degas-caption' ) ),
				__( 'Image', 'degas' )
			),
		),
		array(
			'kind'    => 'gallery',
			'title'   => __( 'Gallery', 'degas' ),
			'layouts' => array(
				array( 'id' => 'grid3', 'label' => __( 'Three across', 'degas' ) ),
				array( 'id' => 'grid2', 'label' => __( 'Two across', 'degas' ) ),
				array( 'id' => 'grid4', 'label' => __( 'Four across', 'degas' ), 'when' => array( '.degas-gallery__grid > .wp-block-image', 8 ) ),
				array( 'id' => 'mosaic', 'label' => __( 'Mosaic', 'degas' ) ),
			),
			'content' => degas_section(
				'gallery',
				'grid3',
				degas_h( __( 'From the studio', 'degas' ) )
				. degas_group( 'degas-slot degas-gallery__grid', implode( '', array_map( 'degas_photo_img', range( 0, 5 ) ) ) ),
				__( 'Gallery', 'degas' )
			),
		),
		array(
			'kind'    => 'quote',
			'title'   => __( 'Quote', 'degas' ),
			'layouts' => array(
				array( 'id' => 'center', 'label' => __( 'Centered', 'degas' ) ),
				array( 'id' => 'left', 'label' => __( 'Left aligned', 'degas' ) ),
				array( 'id' => 'dark', 'label' => __( 'Dark band', 'degas' ) ),
			),
			'content' => degas_section(
				'quote',
				'center',
				degas_p( __( '“A sentence someone said about the work goes here. Replace it with a real quote.”', 'degas' ), 'degas-quote__text' )
				. degas_p( __( '[Name], [where they’re from]', 'degas' ), 'degas-quote__who' ),
				__( 'Quote', 'degas' )
			),
		),
		array(
			'kind'    => 'contact',
			'title'   => __( 'Contact', 'degas' ),
			'layouts' => array(
				array( 'id' => 'split', 'label' => __( 'Split', 'degas' ) ),
				array( 'id' => 'stacked', 'label' => __( 'Stacked', 'degas' ) ),
				array( 'id' => 'card', 'label' => __( 'Card', 'degas' ) ),
			),
			'content' => degas_section(
				'contact',
				'split',
				degas_group(
					'degas-slot degas-contact__text',
					degas_h( __( 'Find the studio', 'degas' ) )
					. degas_p( __( '[Street address], [Town], [Postcode]', 'degas' ) )
					. degas_p( __( 'Open [days], [opening hours]', 'degas' ) )
					. degas_buttons( array( __( 'Get directions', 'degas' ) ) )
				) . degas_photo_img( 5, 'degas-media degas-contact__img' ),
				__( 'Contact', 'degas' )
			),
		),
		array(
			'kind'    => 'faq',
			'title'   => __( 'FAQ', 'degas' ),
			'layouts' => array(
				array( 'id' => 'list', 'label' => __( 'Single column', 'degas' ) ),
				array( 'id' => 'two', 'label' => __( 'Two columns', 'degas' ) ),
				array( 'id' => 'side', 'label' => __( 'Heading beside', 'degas' ) ),
			),
			'content' => degas_section(
				'faq',
				'list',
				degas_h( __( 'Questions', 'degas' ) )
				. degas_group(
					'degas-slot degas-faq__list',
					$qa( __( 'Do you ship your pottery?', 'degas' ) ) . $qa( __( 'Can I book a private class?', 'degas' ) )
					. $qa( __( 'Is your stoneware dishwasher safe?', 'degas' ) ) . $qa( __( 'Do you take commissions?', 'degas' ) )
				),
				__( 'FAQ', 'degas' )
			),
		),
		array(
			'kind'    => 'team',
			'title'   => __( 'Team', 'degas' ),
			'layouts' => array(
				array( 'id' => 'grid3', 'label' => __( 'Three across', 'degas' ) ),
				array( 'id' => 'grid4', 'label' => __( 'Four across', 'degas' ), 'when' => array( '.degas-person', 4 ) ),
				array( 'id' => 'list', 'label' => __( 'List', 'degas' ) ),
			),
			'content' => degas_section(
				'team',
				'grid3',
				degas_h( __( 'The people behind the work', 'degas' ) )
				. degas_group(
					'degas-slot degas-team__grid',
					$person( 0, __( '[Name]', 'degas' ), __( '[Role]', 'degas' ) ) . $person( 3, __( '[Name]', 'degas' ), __( '[Role]', 'degas' ) )
					. $person( 5, __( '[Name]', 'degas' ), __( '[Role]', 'degas' ) )
				),
				__( 'Team', 'degas' )
			),
		),
		array(
			'kind'    => 'newsletter',
			'title'   => __( 'Newsletter', 'degas' ),
			'layouts' => array(
				array( 'id' => 'center', 'label' => __( 'Centered', 'degas' ) ),
				array( 'id' => 'split', 'label' => __( 'Split', 'degas' ) ),
				array( 'id' => 'banner', 'label' => __( 'Dark band', 'degas' ) ),
			),
			'content' => degas_section(
				'newsletter',
				'center',
				degas_group(
					'degas-slot degas-newsletter__panel',
					degas_group(
						'degas-slot degas-newsletter__text',
						degas_h( __( 'Hear about new work first', 'degas' ) )
						. degas_p( __( 'An occasional email when new pieces and class dates go up.', 'degas' ), 'degas-lead' )
					) . degas_buttons( array( __( 'Sign up', 'degas' ) ) )
				),
				__( 'Newsletter', 'degas' )
			),
		),
		array(
			'kind'    => 'pricing',
			'title'   => __( 'Pricing', 'degas' ),
			'layouts' => array(
				array( 'id' => 'cols', 'label' => __( 'Side by side', 'degas' ) ),
				array( 'id' => 'highlight', 'label' => __( 'Middle highlighted', 'degas' ) ),
				array( 'id' => 'list', 'label' => __( 'Rows', 'degas' ) ),
			),
			'content' => degas_section(
				'pricing',
				'cols',
				degas_h( __( 'Classes and memberships', 'degas' ) )
				. degas_group(
					'degas-slot degas-pricing__plans',
					$plan( __( 'Taster', 'degas' ), __( '[£00] / evening', 'degas' ), __( 'A single evening on the wheel.', 'degas' ) )
					. $plan( __( 'Course', 'degas' ), __( '[£00] / course', 'degas' ), __( 'Four weekly sessions with clay and firing included.', 'degas' ) )
					. $plan( __( 'Studio member', 'degas' ), __( '[£00] / month', 'degas' ), __( 'Open studio time each month.', 'degas' ) )
				),
				__( 'Pricing', 'degas' )
			),
		),
	);

	/**
	 * Filters the section types offered by Degas.
	 *
	 * @param array[] $sections Section types.
	 */
	return apply_filters( 'degas_sections', $sections );
}

/**
 * Colour palettes a section can switch between, as in Albers. The first,
 * Default, leaves the theme's own colours alone.
 *
 * @return array[] id, label and swatch colours (background, text, accent).
 */
function degas_palettes() {
	return array(
		array( 'id' => 'default', 'label' => __( 'Default', 'degas' ), 'sw' => array( 'var(--wp--preset--color--base, #fff)', 'var(--wp--preset--color--contrast, #111)', 'var(--wp--preset--color--accent-3, #503aa8)' ) ),
		array( 'id' => 'sand', 'label' => __( 'Sand', 'degas' ), 'sw' => array( '#EFE6D8', '#2B2118', '#9A4E26' ) ),
		array( 'id' => 'sage', 'label' => __( 'Sage', 'degas' ), 'sw' => array( '#DCE6DF', '#16261F', '#2F5D50' ) ),
		array( 'id' => 'sky', 'label' => __( 'Sky', 'degas' ), 'sw' => array( '#E2EBF4', '#14213A', '#2B57A8' ) ),
		array( 'id' => 'clay', 'label' => __( 'Clay', 'degas' ), 'sw' => array( '#F2E1D7', '#2A1A14', '#A84A22' ) ),
		array( 'id' => 'night', 'label' => __( 'Night', 'degas' ), 'sw' => array( '#191919', '#F4F2EE', '#E2B865' ) ),
	);
}

/**
 * Registers each section type as a block pattern, so they are in the
 * inserter too.
 */
function degas_register_patterns() {
	register_block_pattern_category( 'degas', array( 'label' => __( 'Degas sections', 'degas' ) ) );
	foreach ( degas_section_library() as $section ) {
		register_block_pattern(
			'degas/' . $section['kind'],
			array(
				'title'      => $section['title'],
				'categories' => array( 'degas' ),
				'content'    => $section['content'],
			)
		);
	}
}
add_action( 'init', 'degas_register_patterns' );
