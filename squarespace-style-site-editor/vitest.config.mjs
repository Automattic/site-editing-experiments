import { defineConfig } from 'vitest/config';

export default defineConfig( {
	// Block source uses JSX in .js files, like the webpack build.
	oxc: {
		include: /\.[jt]sx?$/,
		exclude: /node_modules/,
		lang: 'jsx',
		jsx: { runtime: 'automatic' },
	},
	test: {
		environment: 'jsdom',
		include: [ 'test/**/*.test.js' ],
		server: { deps: { inline: [ /@wordpress\// ] } },
	},
} );
