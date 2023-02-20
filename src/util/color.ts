// ---------------------------------------------------------------------------------------------------------------------
// Color Types:
// ---------------------------------------------------------------------------------------------------------------------

/**
 * A color in 8-bit RGB color space.
 * Each color component is between 0 and 255.
 */
export interface RGB {
	r: number;
	g: number;
	b: number;
}

/**
 * A color in 8-bit RGB color space with an alpha channel.
 * The alpha component is between 0 and 255.
 *
 * @see RGB
 */
export interface RGBA extends RGB {
	a: number;
}

/**
 * A color in hue-saturation-value color space.
 */
export interface HSV {
	/**
	 * Hue.
	 * Range: `0-359`
	 */
	h: number;

	/**
	 * Saturation.
	 * Range: `0-100`
	 */
	s: number;

	/**
	 * Value.
	 * Range: `0-100`
	 */
	v: number;
}

/**
 * A color in hue-saturation-value color space with an alpha channel.
 *
 * @see HSV
 */
export interface HSVA extends HSV {
	a: number;
}

// ---------------------------------------------------------------------------------------------------------------------
// Color Conversion:
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Converts a color to HSV(A).
 *
 * @param color The color to convert.
 * @returns The color in HSV color space.
 */
export function toHSV(color: RGB | RGBA | HSV | HSVA): HSV | HSVA {
	if ('h' in color && 's' in color && 'v' in color) return color;

	const rFloat = color.r / 255;
	const gFloat = color.g / 255;
	const bFloat = color.b / 255;

	const cmax = Math.max(rFloat, gFloat, bFloat);
	const cmin = Math.min(rFloat, gFloat, bFloat);
	const delta = cmax - cmin;

	let h = 0;
	if (cmax !== cmin) {
		switch (cmax) {
			case rFloat:
				h = (60 * ((gFloat - bFloat) / delta) + 360) % 360;
				break;
			case gFloat:
				h = (60 * ((bFloat - rFloat) / delta) + 120) % 360;
				break;
			case bFloat:
				h = (60 * ((rFloat - gFloat) / delta) + 240) % 360;
				break;
		}
	}

	const s = cmax === 0 ? 0 : (delta / cmax) * 100;
	const v = cmax * 100;

	const hsv: HSV | HSVA = { h, s, v };
	if ('a' in color) {
		(hsv as HSVA).a = (((color as RGBA | HSVA).a as number) / 255) * 100;
	}

	return hsv;
}

export function toHexRGB(color: RGB | RGBA): string {
	const parts = [color.r, color.g, color.b, ...('a' in color ? [color.a] : [])];
	return parts.map((c) => c.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------------------------------------------------
// Color Parsing:
// ---------------------------------------------------------------------------------------------------------------------
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
export function parseColor(color: string): RGB | RGBA | null {
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
	return {
		r: rgbComponents[0],
		g: rgbComponents[1],
		b: rgbComponents[2],
	};
}

/**
 * Parses a `rgba()` CSS color into RGBA components.
 *
 * @param color The color string.
 * @returns The color RGBA, or null if not valid.
 */
export function parseColorRGBA(rgba: string): RGBA | null {
	const asRGB = parseColorRGB(rgba) as RGBA | null;
	if (asRGB != null) {
		asRGB.a = 255;
		return asRGB;
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
	return {
		r: allComponents[0],
		g: allComponents[1],
		b: allComponents[2],
		a: allComponents[3],
	};
}

/**
 * Parses a `#hex` CSS color into RGB(A) components.
 *
 * @param color The color string.
 * @returns The color RGB(A), or null if not valid.
 */
export function parseColorHex(hex: string): RGB | RGBA | null {
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

	// Return RGB object.
	const hexRGB: RGB | RGBA = {
		r: hexComponents[0],
		g: hexComponents[1],
		b: hexComponents[2],
	};

	if (hexComponents.length > 3) {
		(hexRGB as RGBA).a = hexComponents[3];
	}

	return hexRGB;
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
