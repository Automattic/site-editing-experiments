/**
 * One bundle: the editor UI, with the overlay's styles.
 */
const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );

const configs = Array.isArray( defaultConfig ) ? defaultConfig : [ defaultConfig ];
const [ scriptConfig, ...rest ] = configs;

module.exports = [
	{
		...scriptConfig,
		entry: {
			editor: './src/editor/index.js',
		},
	},
	...rest,
];
