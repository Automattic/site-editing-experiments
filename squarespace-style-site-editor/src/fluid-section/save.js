import clsx from 'clsx';
import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';

export function sectionStyle( { rows, mobileRows } ) {
	const style = { '--sse-rows': rows };
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
