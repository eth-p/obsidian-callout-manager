import { readFile, writeFile } from 'fs/promises';
import { dirname, join, relative } from 'path';
import { cwd } from 'process';
import sass from 'sass';
import sorcery from 'sorcery';
import { SourceMapGenerator } from 'source-map';
import ts from 'typescript';

const firstStatementKind = ts.SyntaxKind['FirstStatement'];
const firstTemplateTokenKind = ts.SyntaxKind['FirstTemplateToken'];
const declareKeywordKind = ts.SyntaxKind['DeclareKeyword'];

/**
 * A tiny esbuild plugin that generates a concatenated stylesheet from css-in-js.
 *
 * @param {*} options
 * @returns
 */
export default function essbuildCssInJs(options) {
	const {
		outfile,
		sourcemap: enableSourcemap,
		compressed,
	} = {
		outfile: 'styles.css',
		sourcemap: undefined,
		compressed: false,
		...(options ?? {}),
	};

	const pwd = cwd();
	return {
		name: 'cssinjs',
		setup(build) {
			const outdir = build.initialOptions.outdir ?? dirname(build.initialOptions.outfile);
			const sourcemap = enableSourcemap ?? build.initialOptions.sourcemap ?? false;
			const seenStyles = new Map();
			const seenFiles = new Map();
			const outfilePath = join(outdir, outfile);

			build.onStart(() => {
				seenStyles.clear();
				seenFiles.clear();
			});

			build.onLoad({ filter: /\.(js|ts)x?$/ }, async ({ path, namespace }) => {
				if (namespace !== 'file') return null;
				if (path.includes('node_modules')) return null;
				const sourceName = relative(pwd, path);
				if (sourceName.startsWith('..')) return null;

				// Extract styles from the source file.
				const sourceFileContent = await readFile(path, 'utf-8');
				const sourceFile = ts.createSourceFile(sourceName, sourceFileContent, ts.ScriptTarget.Latest);

				const styles = findStyles(sourceFile, 'STYLES');
				if (styles.length > 0) {
					seenStyles.set(sourceName, styles);
					seenFiles.set(sourceName, sourceFileContent);
				}
			});

			build.onEnd(async () => {
				// Concatenate the styles and compile sass.
				const { mappings, stylesheet } = concatStyles(seenStyles);
				let compiled;
				try {
					compiled = sass.compileString(stylesheet, {
						sourceMap: sourcemap,
						sourceMapIncludeSources: true,
						style: compressed ? 'compressed' : 'expanded',
					});
				} catch (ex) {
					console.warn("[Error]: Failed to compile SCSS.")
					console.warn(ex.message);
					return;
				}

				let compiledText = compiled.css;

				// Generate the sourcemap.
				let sourcemapText = '';
				if (sourcemap) {
					const sourcemapGenerator = new SourceMapGenerator();
					const sourcemapSources = {};

					for (const [sourceName, contents] of seenFiles.entries()) {
						sourcemapGenerator.setSourceContent(sourceName, contents);
						sourcemapSources[sourceName] = contents;
					}

					for (const mapping of mappings) {
						sourcemapGenerator.addMapping(mapping);
					}

					const extractSourcemap = {
						...sourcemapGenerator.toJSON(),
						file: '__combined__.scss',
					};

					const sassSourcemap = {
						...compiled.sourceMap,
						file: `__final__.css`,
						sources: [extractSourcemap.file],
						sourcesContent: undefined,
					};

					// Combine the two sourcemaps.
					const chain = sorcery.loadSync(sassSourcemap.file, {
						content: {
							...sourcemapSources,
							[extractSourcemap.file]: stylesheet,
							[sassSourcemap.file]: compiledText,
						},
						sourcemaps: {
							[extractSourcemap.file]: extractSourcemap,
							[sassSourcemap.file]: sassSourcemap,
						},
					});

					sourcemapText = chain.apply().toString();
				}

				// Save the sourcemap.
				switch (sourcemap) {
					case 'inline':
						compiledText += `\n\n/*# sourceMappingURL=data:application/json;base64,${Buffer.from(
							sourcemapText,
							'utf8',
						).toString('base64')} */\n`;
						break;

					case true:
						await writeFile(outfilePath + '.map', compiledText, 'utf-8');
						break;
				}

				// Save the file.
				await writeFile(outfilePath, compiledText, 'utf8');
			});
		},
	};
}

/**
 * Concatenates styles into a single string and a list of mappings.
 *
 * @param {Map<string, ({styles: string, line: number, column: number})[]>} seenStyles
 * @returns {mappings: {source: string, original: Mapping, generated: Mapping}, stylesheet: string}
 */
function concatStyles(seenStyles) {
	const mappings = [];
	const stylesheetParts = [];
	let currentLine = 1;

	// Build the concatenated stylesheet.
	for (const [file, stylesArray] of seenStyles.entries()) {
		for (let { styles, line: sourceLine, column } of stylesArray) {
			let styleLines = styles.split('\n').length - 1;

			// Opening line.
			mappings.push({
				source: file,
				original: { line: sourceLine, column: column + 1 },
				generated: { line: currentLine, column: 0 },
			});

			// ...
			currentLine++;
			for (let i = 1; i < styleLines; i++) {
				mappings.push({
					source: file,
					original: { line: sourceLine + i, column: 0 },
					generated: { line: currentLine, column: 0 },
				});

				currentLine++;
			}

			// Add the styles to the stylesheet.
			stylesheetParts.push(styles);
			stylesheetParts.push('\n\n');
			currentLine += 2;
		}
	}

	return { mappings, stylesheet: stylesheetParts.join('') };
}

/**
 * Finds exported variables in a source file.
 *
 * @param {ts.SourceFile} sourceFile The source file.
 * @returns {ts.Node[]} The declarations.
 */
function findDeclaredVariables(sourceFile) {
	// Find the exported declaration lists.
	const declLists = [];
	sourceFile.forEachChild((node) => {
		if (node.kind !== firstStatementKind) return;
		let prevSibling = null;
		node.forEachChild((node) => {
			const nodePrev = prevSibling;
			prevSibling = node;

			if (nodePrev == null) return;
			if (!ts.isVariableDeclarationList(node)) return;
			if (declareKeywordKind !== nodePrev.kind) return;

			declLists.push(node);
		});
	});

	// Extract the declarations.
	const decls = [];
	declLists.forEach((listNode) => {
		listNode.forEachChild((node) => {
			if (!ts.isVariableDeclaration(node)) return;
			decls.push(node);
		});
	});

	return decls;
}

/**
 * Finds exported style templates in a source file.
 *
 * @param {ts.SourceFile} sourceFile The source file.
 * @param {string} expectedVarIdentifierName The identifier of the styles variable.
 * @returns {({styles: string, line: number, column: number})[]} The array of styles found.
 */
function findStyles(sourceFile, expectedVarIdentifierName) {
	const styles = [];
	const declared = findDeclaredVariables(sourceFile);

	declared.forEach((decl) => {
		let varIdent;
		let teTextRaw;
		let teTextNode;

		// Extract the variable identifier, tagged template expression identifier, and tagged template literal.
		for (const node of decl.getChildren(sourceFile)) {
			if (ts.isIdentifier(node)) {
				varIdent = node.getText(sourceFile);
				continue;
			}

			if (ts.isLiteralTypeNode(node)) {
				for (const teNode of node.getChildren(sourceFile)) {
					if (teNode.kind === firstTemplateTokenKind) {
						teTextRaw = teNode.getText(sourceFile);
						teTextNode = teNode;
					}
				}
			}
		}

		// If the identifier matches, add the styles.
		if (varIdent !== expectedVarIdentifierName) return;

		const teText = teTextRaw.substring(1, teTextRaw.length - 1);
		const pos = sourceFile.getLineAndCharacterOfPosition(teTextNode.pos);
		styles.push({
			styles: teText,
			line: pos.line + 1,
			column: pos.character,
		});
	});

	return styles;
}

/**
 * Dumps the TypeScript parser AST.
 * This is useful for debugging, but not actively used.
 *
 * @param {*} node The node to dump.
 * @param {*} depth The current depth.
 */
function dumpAST(node, depth) {
	console.log(''.padStart(depth * 2, '-'), ts.SyntaxKind[node.kind]);
	node.forEachChild((node) => dumpAST(node, depth + 1));
}
