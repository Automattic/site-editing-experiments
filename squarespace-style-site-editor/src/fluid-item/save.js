import { InnerBlocks, useBlockProps } from '@wordpress/block-editor';
import { itemStyle } from '../shared/grid';

export default function save( { attributes } ) {
	const { verticalAlignment } = attributes;
	const blockProps = useBlockProps.save( {
		className: verticalAlignment
			? `is-vertically-aligned-${ verticalAlignment }`
			: undefined,
		style: itemStyle( attributes ),
	} );

	return (
		<div { ...blockProps }>
			<div className="wp-block-sse-fluid-item__content">
				<InnerBlocks.Content />
			</div>
		</div>
	);
}
