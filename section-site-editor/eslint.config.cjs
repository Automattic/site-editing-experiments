const wpConfig = require( '@wordpress/scripts/config/eslint.config.cjs' );

module.exports = [
	...wpConfig,
	{
		// WordPress packages are provided by WordPress at runtime, not npm.
		rules: {
			'import/no-unresolved': [ 'error', { ignore: [ '^@wordpress/' ] } ],
			'import/no-extraneous-dependencies': 'off',
		},
	},
];
