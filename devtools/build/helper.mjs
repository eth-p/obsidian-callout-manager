import { access as accessCallback, readFileSync } from 'fs';
import { access } from 'fs/promises';
import kleur from 'kleur';
import { dirname, join, relative } from 'path';
import { cwd, exit, stderr } from 'process';
import { parse } from 'tsconfck';
import { format } from 'util';
import {getFilesFromTsconfigJson} from 'tsconfig-files';

/**
 * Formats text in a similar way to `console.log`.
 *
 * @param {any} message The formatting pattern or first message.
 * @param {any[]} args The formatting parameters.
 *
 * @returns {string} The formatted string.
 */
function formatv(message, ...args) {
	const pwd = cwd();
	for (let i = 0; i < args.length; i++) {
		if (args[i] instanceof Error) {
			const stack = args[i].stack.split('\n');
			const message = stack[0];
			const trace = stack
				.slice(1)
				.map((line) =>
					line.replace(/(file:\/\/)(.*?)((?::[\d]+){1,})/g, (_, pr, pa, ln) => `${relative(pwd, pa)}${ln}`),
				)
				.join('\n');

			args[i] = `${message}\n${trace}`;
		}
	}

	return format(message, ...args);
}

/**
 * Wraps text, inserting a continuation indicator at the beginning of wrapped lines.
 *
 * @param {string} text The text to wrap.
 * @param {number} width The width of each line.
 *
 * @returns The wrapped text.
 */
function wrap(text, width) {
	const result = [];
	const continuationToken = ` ${kleur.dim('\u{27A5}')}  `;
	for (let line of text.split('\n')) {
		if (line.length <= width) {
			result.push(line);
			continue;
		}

		const lineIndent = /^(\s*)/.exec(line)[1];
		result.push(line.substring(0, width));
		line = line.substring(width);

		while (line.length > 0) {
			result.push(`${lineIndent}${continuationToken}${line.substring(0, width - 4)}`);
			line = line.substring(width - 4);
		}
	}

	return result.join(`\n`);
}

/**
 * A badge of text.
 */
export class Badge {
	#badge;
	#continuation;
	#continuationLength;

	constructor(color, text) {
		this.text = text;
		this.color = color;

		this.#badge = color().inverse(` ${text} `) + color('\u{258a} ');
		this.#continuation = `${' '.repeat(text.length + 2)}${color('\u{2503}')} `;
		this.#continuationLength = text.length + 4;
	}

	/**
	 * Prints the badge string.
	 */
	toString() {
		return this.#badge;
	}

	/**
	 * Prints a string prefixed with this badge.
	 * This will also wrap the text (and insert line continuation prefixes) if necessary.
	 */
	print(message, ...args) {
		const doWrap = stderr.isTTY ? (v) => wrap(v, stderr.columns - this.#continuationLength) : (v) => v;
		const text = formatv(message, ...args);

		console.error('%s%s', this.#badge, doWrap(text).replaceAll('\n', `\n${this.#continuation}`));
	}
}

const BADGE_INFO = new Badge(kleur.cyan, ' info');
const BADGE_WARN = new Badge(kleur.yellow, ' warn');
const BADGE_ERROR = new Badge(kleur.red, 'error');
const BADGE_FATAL = new Badge(kleur.red, 'fatal');

// Helper functions.
export default class Helper {
	#sources;

	constructor(packageJsonPath, buildToolsDir) {
		this.package = {
			file: packageJsonPath,
			directory: dirname(packageJsonPath),
			dir: dirname(packageJsonPath),
			json: JSON.parse(readFileSync(packageJsonPath, 'utf-8')),
			name: null,
		};

		this.package.name = this.package.json.name;

		this.buildtools = buildToolsDir;
	}

	/** Print an info message. */
	info(message, ...args) {
		BADGE_INFO.print(message, ...args);
	}

	/** Print a warning message. */
	warn(message, ...args) {
		BADGE_WARN.print(message, ...args);
	}

	/** Print an error. */
	error(message, ...args) {
		BADGE_ERROR.print(message, ...args);
	}

	/** Print an error and exit. */
	fatal(message, ...args) {
		BADGE_FATAL.print(message, ...args);
		exit(1);
	}

	/** Checks if any of the given files exist. */
	async findExistingFiles(names) {
		function fileExists(file) {
			return new Promise((resolve) => {
				accessCallback(file, (err) => {
					if (err) resolve(false);
					else resolve(true);
				});
			});
		}

		return (await Promise.all(names.map(fileExists)))
			.map((exist, i) => (exist ? names[i] : null))
			.filter((name) => name !== null);
	}

	/**
	 * Gets a list of source files in the given package.
	 * @returns {string} The source file list.
	 */
	async getPackageSources() {
		if (this.#sources != null) {
			return this.#sources;
		}

		const tsConfigPath = join(this.package.directory, 'tsconfig.json');

		// Ensure that the tsconfig.json file exists.
		try {
			await access(tsConfigPath);
		} catch (ex) {
			this.warn('Package `%s` does not have any declared sources.', this.package.name);
			this.#sources = [];
			return [];
		}

		const tsConfig = await parse(tsConfigPath);
		const files = await getFilesFromTsconfigJson(tsConfig.tsconfig, this.package.directory);

		this.#sources = files;
		return files;
	}
}
