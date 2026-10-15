import clsx from 'clsx';
import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';

const GAPS = {
	none: '0px',
	narrow: 'clamp(0.25rem, 0.5vw, 0.375rem)',
	wide: 'clamp(1rem, 2vw, 1.75rem)',
};

export function sectionStyle( { rows, mobileRows, gap } ) {
	const style = { '--sse-rows': rows };
	if ( GAPS[ gap ] ) {
		style[ '--sse-gap' ] = GAPS[ gap ];
	}
	if ( mobileRows > 0 ) {
		style[ '--sse-mobile-rows' ] = mobileRows;
	}
	return style;
}

export default function save( { attributes } ) {
	const blockProps = useBlockProps.save( {
		className: clsx( {
			'has-mobile-layout': attributes.mobileRows > 0,
		} ),
		style: sectionStyle( attributes ),
	} );
	const innerBlocksProps = useInnerBlocksProps.save( {
		className: 'wp-block-sse-fluid-section__grid',
	} );

	return (
		<div { ...blockProps }>
			<div { ...innerBlocksProps } />
		</div>
	);
}
