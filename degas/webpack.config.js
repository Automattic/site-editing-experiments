/**
 * Three bundles: the editor UI, the section styles (site and canvas) and the
 * editing chrome's styles (canvas only).
 */
const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );

const configs = Array.isArray( defaultConfig ) ? defaultConfig : [ defaultConfig ];
const [ scriptConfig, ...rest ] = configs;

module.exports = [
	{
		...scriptConfig,
		entry: {
			editor: './src/editor/index.js',
			sections: './src/sections/index.js',
			canvas: './src/canvas/index.js',
		},
	},
	...rest,
];
