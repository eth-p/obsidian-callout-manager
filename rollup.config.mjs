// ---------------------------------------------------------------------------------------------------------------------
// This is the configuration file for building the API package.
// ---------------------------------------------------------------------------------------------------------------------
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import prettier from 'rollup-plugin-prettier';

import { external, outdir } from './build.config.mjs';

const entry = './api/index.ts';
const config = [
	// API Type Declarations
	{
		input: entry,
		output: [{ file: `${outdir}/api.d.ts`, format: 'es' }],
		external,
		plugins: [
			typescript({
				compilerOptions: {
					outDir: 'dist',
					sourceMap: false,
					inlineSources: false,
					inlineSourceMap: false,
				},
			}),
			dts(),
			prettier({
				parser: 'typescript',
			}),
		],
	},

	// API Runtime
	buildApi('commonjs', 'api-cjs.js'),
	buildApi('es', 'api-esm.mjs'),
	buildApi('es', 'api-esm-esnext.mjs', {
		typescript: {
			target: 'esnext',
		},
	}),
];

export default config;

function buildApi(format, filename, options) {
	return {
		input: entry,
		output: [{ file: `${outdir}/${filename}`, format }],
		external,
		plugins: [
			prettier({ parser: 'babel' }),
			typescript({
				tsconfig: 'api/tsconfig.json',
				inlineSources: false,
				inlineSourceMap: false,
				...(options?.typescript ?? {}),
			}),
		],
	};
}
