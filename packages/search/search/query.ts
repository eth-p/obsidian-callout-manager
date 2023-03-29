import {
	SearchCondition,
	equals as condEquals,
	includes as condIncludes,
	matches as condMatches,
	startsWith as condStartsWith,
} from './condition';
import { SearchEffect, add as effectAdd, filter as effectFilter, remove as effectRemove } from './effect';

const REGEX_NOT_WHITESPACE = /\S/g;
const REGEX_FIELD_DELIMITER = /[ \\":]/g;

const REGEX_QUERYOP_EFFECT = /[-+&]+/y;
const REGEX_QUERYOP_FIELD = /[\w-]+/y;
const REGEX_QUERYOP_CONDITION = /[\^=~%:]+|(?:\[(?:is|equals|matches|has|includes|contains)\]:)/y;

/**
 * An operation performed as part of the query.
 */
export interface QueryOp {
	readonly field: string | null;
	readonly text: string | null;
	readonly condition: SearchCondition | null;
	readonly effect: SearchEffect | null;
}

export function parseQuery(query: string): QueryOp[] {
	const ctx = new QueryParserContext(query);
	const ops = [] as QueryOp[];

	while (!ctx.done) {
		ctx.take.trim();
		ops.push(parseOperation(ctx));
	}

	return ops;
}

/**
 * Parses a query operation.
 *
 * @param ctx The parser context.
 * @returns The parsed escape sequence.
 *
 * @internal
 */
export function parseOperation(ctx: QueryParserContext): QueryOp {
	ctx.stage.push('search term');
	try {
		const effect = parseOperationEffect(ctx);
		let field = parseOperationField(ctx) as string | null;
		const condition = parseOperationCondition(ctx);
		let text = ctx.done || ctx.peek.prefix(' ') ? null : parseText(ctx);

		// It's possible that the text could be misinterpreted as the field.
		// Correct for that.
		if (text == null && condition == null) {
			text = field;
			field = null;
		}

		// Throw if there's nothing.
		if (text == '' && field == '' && effect == null && condition == null) {
			throw new QuerySyntaxError(ctx, 'Unexpected end');
		}

		// Throw if there's no search text.
		if (text == '') {
			throw new QuerySyntaxError(ctx, 'Missing query text');
		}

		return {
			field,
			text,
			condition,
			effect,
		};
	} finally {
		ctx.stage.pop();
	}
}

/**
 * Parses the {@link SearchEffect} for an operation.
 * This looks for leading characters from the set `[-+&]`.
 *
 * @param ctx The parser context.
 * @returns The search effect.
 *
 * @internal
 */
export function parseOperationEffect(ctx: QueryParserContext): SearchEffect | null {
	const [matches] = ctx.take.findFirstRegex(REGEX_QUERYOP_EFFECT);
	if (matches == null) return null;

	switch (matches[0]) {
		case '-':
			return effectRemove;

		case '+':
			return effectAdd;

		case '&':
			return effectFilter;

		default:
			throw new QuerySyntaxError(
				ctx,
				`Unexpected symbol \`${matches[1]}\`. Did you mean \`-\`, \`+\`, or \`&\`?`,
			);
	}
}

/**
 * Parses the {@link SearchEffect} for the column name to perform the operation against.
 *
 * @param ctx The parser context.
 * @returns The search effect.
 *
 * @internal
 */
export function parseOperationField(ctx: QueryParserContext): string {
	const parts = [];

	// eslint-disable-next-line no-constant-condition
	while (true) {
		const [matches] = ctx.take.findFirstRegex(REGEX_QUERYOP_FIELD);
		if (matches != null) {
			parts.push(matches[0]);
			continue;
		}

		if (ctx.peek.prefix('\\')) {
			parts.push(parseEscapeSequence(ctx));
			continue;
		}

		break;
	}

	return parts.join('');
}

/**
 * Parses the {@link SearchEffect} for the condition to use in the operation.
 *
 * @param ctx The parser context.
 * @returns The search condition.
 * @internal
 */
export function parseOperationCondition(ctx: QueryParserContext): SearchCondition | null {
	const [matches] = ctx.take.findFirstRegex(REGEX_QUERYOP_CONDITION);
	if (matches == null) return null;

	const chr = matches[0];
	switch (chr) {
		case ':':
		case '[matches]:':
			return condMatches;

		case '=':
		case '[equals]:':
		case '[is]:':
			return condEquals;

		case '%=':
		case '[includes]:':
		case '[contains]:':
			return condIncludes;

		case '^=':
			return condStartsWith;

		default:
			throw new QuerySyntaxError(ctx, `Unexpected symbol \`${chr}\`. Did you mean \`:\`, \`=\`, or \`%=\`?`);
	}
}

/**
 * Parses possibly-quoted or escaped text.
 *
 * @param ctx The parser context.
 * @returns The parsed text.
 *
 * @internal
 */
export function parseText(ctx: QueryParserContext): string {
	ctx.stage.push('text');
	try {
		const parts = [];
		let isQuoted = false;

		// eslint-disable-next-line no-constant-condition
		while (true) {
			const [matches] = ctx.peek.findFirstRegex(REGEX_FIELD_DELIMITER);

			// Add the rest.
			if (matches == null) {
				parts.push(ctx.take.remaining());
				break;
			}

			// Add everything up to the match.
			parts.push(ctx.take.next((matches.index as number) - ctx.offset));
			const chr = matches[0];

			// The match is an escape character.
			if (chr === '\\') {
				parts.push(parseEscapeSequence(ctx));
				continue;
			}

			// The match is a space character.
			if (chr === ' ') {
				if (!isQuoted) break;
				ctx.take.next(chr.length);
				parts.push(' ');
				continue;
			}

			// The match is a quote.
			if (chr === '"') {
				ctx.take.next(chr.length);
				isQuoted = !isQuoted;
				continue;
			}

			// The match is something else?
			throw new QuerySyntaxError(ctx, `Unexpected symbol \`${chr}\``);
		}

		if (isQuoted) {
			throw new QuerySyntaxError(ctx, 'Unexpected end of string while matching `"`');
		}

		return parts.join('');
	} finally {
		ctx.stage.pop();
	}
}

/**
 * Parses an escape sequence.
 *
 * @param ctx The parser context.
 * @returns The parsed escape sequence.
 *
 * @internal
 */
export function parseEscapeSequence(ctx: QueryParserContext): string {
	ctx.stage.push('escape sequence');
	try {
		// Ensure the next character leads an escape sequence.
		if (!ctx.take.prefix('\\')) {
			throw new QuerySyntaxError(ctx, 'Not an escape sequence');
		}

		// Get the escape character.
		const chr = ctx.take.next(1);
		switch (chr) {
			case '\\':
			case '"':
			case "'":
			case ' ':
				return chr;
			case 'n':
				return '\n';
			case 'r':
				return '\r';

			// Hex-encoded one byte character.
			case 'x': {
				const hex = ctx.take.next(2);
				return hexStringToCharacter(ctx, hex);
			}

			// Unicode multi-byte character.
			case 'u': {
				if (ctx.peek.next(1) !== '{') {
					return hexStringToCharacter(ctx, ctx.take.next(4));
				}

				const [matches] = ctx.take.findLongestRegex(/\{([^}]+)\}/);
				if (matches == null) {
					throw new QuerySyntaxError(ctx, 'Unexpected end of string while matching `{`');
				}

				return hexStringToCharacter(ctx, matches[1]);
			}

			default: {
				throw new QuerySyntaxError(ctx, `Unknown escape sequence (${chr})`);
			}
		}
	} finally {
		ctx.stage.pop();
	}
}

export function hexStringToCharacter(ctx: QueryParserContext, hex: string): string {
	if (!/^[A-Fa-f0-9]+$/.test(hex)) {
		throw new QuerySyntaxError(ctx, `Invalid hex number \`${hex}\``);
	}

	const value = parseInt(hex, 16);
	if (isNaN(value)) throw new QuerySyntaxError(ctx, `Invalid hex number \`${hex}\``);
	return String.fromCharCode(value);
}

export class QuerySyntaxError extends Error {
	public constructor(ctx: QueryParserContext, message: string) {
		super(`Error parsing ${ctx.stage ?? 'query'} at offset ${ctx.offset}: ${message}`);
	}
}

export class QueryParserContext {
	public readonly source: string;
	public stage: string[];
	protected _offset: number;

	public constructor(source: string) {
		this.source = source;
		this._offset = 0;

		this.take = new QueryParserContextFunctions(this, (n) => (this._offset = n));
		this.peek = new QueryParserContextFunctions(this, () => {});
		this.stage = [];
	}

	/**
	 * The current offset from the source.
	 */
	public get offset(): number {
		return this._offset;
	}

	/**
	 * True if the source is fully consumed.
	 */
	public get done(): boolean {
		return this._offset >= this.source.length;
	}

	public readonly peek: QueryParserContextFunctions;
	public readonly take: QueryParserContextFunctions;
}

export class QueryParserContextFunctions {
	protected readonly setOffset: (offset: number) => void;
	protected readonly ctx: QueryParserContext;

	public constructor(ctx: QueryParserContext, setOffset: (offset: number) => void) {
		this.ctx = ctx;
		this.setOffset = setOffset;
	}

	/**
	 * Checks if the next few characters are equal to a prefix string, and consumes them if they are.
	 * @param prefix The prefix string.
	 */
	public prefix(prefix: string): boolean {
		const { source, offset } = this.ctx;

		if (source.substring(offset, offset + prefix.length) === prefix) {
			this.setOffset(offset + prefix.length);
			return true;
		}

		return false;
	}

	/**
	 * Trims leading whitespace.
	 * @returns The leading whitespace.
	 */
	public trim(): string {
		const { source, offset } = this.ctx;
		REGEX_NOT_WHITESPACE.lastIndex = offset;

		const match = REGEX_NOT_WHITESPACE.exec(source);
		if (match == null) {
			this.setOffset(source.length);
			return source.substring(offset);
		}

		this.setOffset(match.index);
		return source.substring(offset, match.index);
	}

	/**
	 * Consumes the next few characters.
	 * @param length The number of characters to consume.
	 */
	public maybeNext(length: number): string {
		const { source, offset } = this.ctx;
		const substring = source.substring(offset, offset + length);
		this.setOffset(offset + length);
		return substring;
	}

	/**
	 * Consumes the next few characters.
	 * If the end of the string is reached, this will throw an error.
	 *
	 * @param length The number of characters to consume.
	 */
	public next(length: number): string {
		const { source, offset } = this.ctx;
		const substring = source.substring(offset, offset + length);
		if (substring.length < length) throw new QuerySyntaxError(this.ctx, 'Unexpected end');
		this.setOffset(offset + length);
		return substring;
	}

	/**
	 * Takes the remaining text.
	 * @returns The remaining text.
	 */
	public remaining(): string {
		const { source, offset } = this.ctx;
		this.setOffset(source.length);
		return source.substring(offset);
	}

	/**
	 * Finds and consumes the longest matching regular expression.
	 * @param regexps The regular expressions.
	 */
	public findLongestRegex(...regexps: RegExp[]): [RegExpMatchArray, RegExp] | [null, null] {
		const { source, offset } = this.ctx;

		let longestLength = 0;
		const result = [null, null] as [RegExpMatchArray, RegExp] | [null, null];
		for (const regexp of regexps) {
			regexp.lastIndex = offset;
			const matches = regexp.exec(source);
			if (matches != null && matches[0].length > longestLength) {
				longestLength = matches[0].length;
				result[0] = matches;
				result[1] = regexp;
			}
		}

		const resultMatches = result[0];
		if (resultMatches != null) {
			this.setOffset((resultMatches.index as number) + resultMatches[0].length);
		}

		return result;
	}

	/**
	 * Finds and consumes the first matching regular expression.
	 * @param length The regular expressions.
	 */
	public findFirstRegex(...regexps: RegExp[]): [RegExpMatchArray, RegExp] | [null, null] {
		const { source, offset } = this.ctx;

		let firstMatch = source.length + 1;
		const result = [null, null] as [RegExpMatchArray, RegExp] | [null, null];
		for (const regexp of regexps) {
			regexp.lastIndex = offset;
			const matches = regexp.exec(source);
			if (matches != null && matches.index < firstMatch) {
				firstMatch = matches.index;
				result[0] = matches;
				result[1] = regexp;
			}
		}

		const resultMatches = result[0];
		if (resultMatches != null) {
			this.setOffset((resultMatches.index as number) + resultMatches[0].length);
		}

		return result;
	}
}
