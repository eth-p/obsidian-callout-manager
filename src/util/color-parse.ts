import type { RGB } from 'color-convert/conversions';

const REGEX_RGB = /^\s*rgba?\(\s*([\d.]+%?)\s*[, ]\s*([\d.]+%?)\s*[, ]\s*([\d.]+%?\s*)\)\s*$/i;
const REGEX_RGBA = /^\s*rgba\(\s*([\d.]+%?)\s*,\s*([\d.]+%?)\s*,\s*([\d.]+%?)\s*,\s*([\d.]+%?)\s*\)\s*$/i;
const REGEX_HEX = /^\s*#([\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})\s*$/i;

/**
 * Parses a CSS color into RGB(A) components.
 * This does not support other color formats than RGB (e.g. HSV).
 *
 * @param color The color string.
 * @returns The color RGB(A), or null if not valid.
 */
export function parseColor(color: string): RGB | [...RGB, number] | null {
	const trimmed = color.trim();
	if (trimmed.startsWith('#')) {
		return parseColorHex(color);
	}

	return parseColorRGBA(color);
}

/**
 * Parses a `rgb()` CSS color into RGB components.
 *
 * @param color The color string.
 * @returns The color RGB, or null if not valid.
 */
export function parseColorRGB(rgb: string): RGB | null {
	const matches = REGEX_RGB.exec(rgb);
	if (matches === null) return null;

	const components = matches.slice(1).map((v) => v.trim()) as [string, string, string];
	const rgbComponents = rgbComponentStringsToNumber(components);
	if (rgbComponents === null) {
		return null;
	}

	// Validate.
	if (undefined !== rgbComponents.find((v) => isNaN(v) || v < 0 || v > 0xff)) {
		return null;
	}

	// Parsed.
	return rgbComponents as RGB;
}

/**
 * Parses a `rgba()` CSS color into RGBA components.
 *
 * @param color The color string.
 * @returns The color RGBA, or null if not valid.
 */
export function parseColorRGBA(rgba: string): [...RGB, number] | null {
	const asRGB = parseColorRGB(rgba);
	if (asRGB != null) {
		return [...asRGB, 255];
	}

	// As RGBA.
	const matches = REGEX_RGBA.exec(rgba);
	if (matches === null) return null;

	const components = matches.slice(1).map((v) => v.trim()) as [string, string, string, string];
	const rgbComponents = rgbComponentStringsToNumber(components.slice(0, 3) as [string, string, string]);
	if (rgbComponents === null) {
		return null;
	}

	// Parse the alpha channel.
	let alphaComponent = 255;
	const alphaString = components[3];
	if (alphaString != null) {
		if (alphaString.endsWith('%')) {
			alphaComponent = Math.floor((parseFloat(alphaString.substring(0, alphaString.length - 1)) * 255) / 100);
		} else {
			alphaComponent = Math.floor(parseFloat(alphaString) * 255);
		}
	}

	// Validate.
	const allComponents = [...rgbComponents, alphaComponent];
	if (undefined !== allComponents.find((v) => isNaN(v) || v < 0 || v > 0xff)) {
		return null;
	}

	// Parsed.
	return allComponents as [number, number, number, number];
}

/**
 * Parses a `#hex` CSS color into RGB(A) components.
 *
 * @param color The color string.
 * @returns The color RGB(A), or null if not valid.
 */
export function parseColorHex(hex: string): RGB | [...RGB, number] | null {
	const matches = REGEX_HEX.exec(hex);
	if (matches === null) return null;

	const hexString = matches[1];
	let hexDigits;
	if (hexString.length < 6) hexDigits = hexString.split('').map((c) => `${c}${c}`);
	else {
		hexDigits = [hexString.slice(0, 2), hexString.slice(2, 4), hexString.slice(4, 6), hexString.slice(6, 8)].filter(
			(v) => v != '',
		);
	}

	const hexComponents = hexDigits.map((v) => parseInt(v, 16));

	// Validate.
	if (undefined !== hexComponents.find((v) => isNaN(v) || v < 0 || v > 0xff)) {
		return null;
	}

	return hexComponents as RGB | [...RGB, number];
}

function rgbComponentStringsToNumber(components: [string, string, string]): [number, number, number] | null {
	// Percentage.
	if (components[0].endsWith('%')) {
		if (undefined !== components.slice(1, 3).find((c) => !c.endsWith('%'))) {
			return null;
		}

		return components
			.map((v) => parseFloat(v.substring(0, v.length - 1)))
			.map((v) => Math.floor((v * 255) / 100)) as [number, number, number];
	}

	// Integer.
	if (undefined !== components.slice(1, 3).find((c) => c.endsWith('%'))) {
		return null;
	}

	return components.map((v) => parseInt(v, 10)) as [number, number, number];
}
