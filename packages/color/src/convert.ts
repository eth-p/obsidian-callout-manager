import { HSV, HSVA, RGB, RGBA } from './types';

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
