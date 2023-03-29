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
