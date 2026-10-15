/**
 * The default @wordpress/scripts config finds the two blocks from their
 * block.json files; this adds the editor UI and the canvas styles.
 */
const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );

const configs = Array.isArray( defaultConfig ) ? defaultConfig : [ defaultConfig ];
const [ scriptConfig, ...rest ] = configs;

module.exports = [
	{
		...scriptConfig,
		entry: async () => {
			const base =
				typeof scriptConfig.entry === 'function'
					? await scriptConfig.entry()
					: scriptConfig.entry;
			return {
				...base,
				editor: './src/editor/index.js',
				canvas: './src/canvas/index.js',
			};
		},
	},
	...rest,
];
