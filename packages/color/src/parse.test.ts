import { describe, expect, test } from '@jest/globals';

import { parseColorHex, parseColorRGB, parseColorRGBA } from './parse';

describe('parseColorRGB', () => {
	test('rgb(i, i, i)', () => {
		expect(parseColorRGB(`rgb( 10, 10, 10 )`)).toStrictEqual({ r: 10, g: 10, b: 10 });
		expect(parseColorRGB(`rgb(1,1,1)`)).toStrictEqual({ r: 1, g: 1, b: 1 });
		expect(parseColorRGB(`rgb(2, 2, 2)`)).toStrictEqual({ r: 2, g: 2, b: 2 });

		// Weird formatting.
		expect(parseColorRGB(` rgb(3, 3, 3)`)).toStrictEqual({ r: 3, g: 3, b: 3 });
		expect(parseColorRGB(`rgb(9, 9, 9) `)).toStrictEqual({ r: 9, g: 9, b: 9 });
		expect(parseColorRGB(`rgb(10,  10  , 10  ) `)).toStrictEqual({ r: 10, g: 10, b: 10 });
		expect(parseColorRGB(`rgb(4, 4,4)`)).toStrictEqual({ r: 4, g: 4, b: 4 });
		expect(parseColorRGB(`rgb(5,5 ,5)`)).toStrictEqual({ r: 5, g: 5, b: 5 });

		// Inconsistent commas.
		expect(parseColorRGB(`rgb(6 6 6)`)).toStrictEqual({ r: 6, g: 6, b: 6 });
		expect(parseColorRGB(`rgb(7 7, 7)`)).toStrictEqual({ r: 7, g: 7, b: 7 });
		expect(parseColorRGB(`rgb(8 8 ,8)`)).toStrictEqual({ r: 8, g: 8, b: 8 });

		// Boundary cases.
		expect(parseColorRGB(`rgb( 0, 0, 0 )`)).toStrictEqual({ r: 0, g: 0, b: 0 });
		expect(parseColorRGB(`rgb( 255, 255, 255 )`)).toStrictEqual({ r: 255, g: 255, b: 255 });
	});

	test('rgb(%, %, %)', () => {
		expect(parseColorRGB(`rgb( 50% 50% 50% )`)).toStrictEqual({ r: 127, g: 127, b: 127 });
		expect(parseColorRGB(`rgb( 33.4%, 33.4%, 33.4% )`)).toStrictEqual({ r: 85, g: 85, b: 85 });

		// Boundary cases.
		expect(parseColorRGB(`rgb( 0%, 0%, 0% )`)).toStrictEqual({ r: 0, g: 0, b: 0 });
		expect(parseColorRGB(`rgb( 100%, 100%, 100% )`)).toStrictEqual({ r: 255, g: 255, b: 255 });
	});

	test('rgb(invalid)', () => {
		expect(parseColorRGB(`rgb( 10, 10 )`)).toBeNull();
		expect(parseColorRGB(`rgb( 10 )`)).toBeNull();
		expect(parseColorRGB(`rgb( 10 10 )`)).toBeNull();
		expect(parseColorRGB(`rgbn( 10, 10 )`)).toBeNull();

		// Mixed percentages and values.
		expect(parseColorRGB(`rgb( 10, 10, 10% )`)).toBeNull();
		expect(parseColorRGB(`rgb( 10%, 10%, 10 )`)).toBeNull();
	});

	test('invalid(i, i, i)', () => {
		expect(parseColorRGB(`not( 10, 10, 10 )`)).toBeNull();
	});
});

describe('parseColorRGBA', () => {
	test('rgba(i, i, i, i)', () => {
		expect(parseColorRGBA(`rgba( 10, 10, 10, 0.2 )`)).toStrictEqual({ r: 10, g: 10, b: 10, a: 51 });

		// Weird formatting.
		expect(parseColorRGBA(` rgba(3, 3, 3,1)`)).toStrictEqual({ r: 3, g: 3, b: 3, a: 255 });
		expect(parseColorRGBA(`rgba(9, 9, 9,1) `)).toStrictEqual({ r: 9, g: 9, b: 9, a: 255 });
		expect(parseColorRGBA(`rgba(10,  10  , 10,1  ) `)).toStrictEqual({ r: 10, g: 10, b: 10, a: 255 });
		expect(parseColorRGBA(`rgba(4, 4,4 ,1)`)).toStrictEqual({ r: 4, g: 4, b: 4, a: 255 });
		expect(parseColorRGBA(`rgba(5,5 ,5,1)`)).toStrictEqual({ r: 5, g: 5, b: 5, a: 255 });

		// Not accepted.
		expect(parseColorRGBA(`rgba( 10, 10, 10 1 )`)).toBeNull();
		expect(parseColorRGBA(`rgba( 10 10 10 1 )`)).toBeNull();

		// Boundary cases.
		expect(parseColorRGBA(`rgba( 0, 0, 0, 0 )`)).toStrictEqual({ r: 0, g: 0, b: 0, a: 0 });
		expect(parseColorRGBA(`rgba( 255, 255, 255, 1 )`)).toStrictEqual({ r: 255, g: 255, b: 255, a: 255 });
	});

	test('rgba(i, i, i, %)', () => {
		expect(parseColorRGBA(`rgba( 10, 10, 10, 100% )`)).toStrictEqual({ r: 10, g: 10, b: 10, a: 255 });
	});

	test('rgba(%, %, %, %)', () => {
		expect(parseColorRGBA(`rgba( 100%, 0%, 100%, 0% )`)).toStrictEqual({ r: 255, g: 0, b: 255, a: 0 });
	});

	test('rgba(%, %, %, i)', () => {
		expect(parseColorRGBA(`rgba( 100%, 0%, 100%, 0.5 )`)).toStrictEqual({ r: 255, g: 0, b: 255, a: 127 });
	});

	test('rgba(i, i, i)', () => {
		expect(parseColorRGBA(`rgba( 10, 10, 10 )`)).toStrictEqual({ r: 10, g: 10, b: 10, a: 255 });

		// Inconsistent commas.
		expect(parseColorRGBA(`rgba( 10 10 10 )`)).toStrictEqual({ r: 10, g: 10, b: 10, a: 255 });

		// Boundary cases.
		expect(parseColorRGBA(`rgba( 0, 0, 0 )`)).toStrictEqual({ r: 0, g: 0, b: 0, a: 255 });
		expect(parseColorRGBA(`rgba( 255, 255, 255 )`)).toStrictEqual({ r: 255, g: 255, b: 255, a: 255 });
	});
});

describe('parseColorHex', () => {
	test('#rgb', () => {
		expect(parseColorHex(`#f80`)).toStrictEqual({ r: 255, g: 136, b: 0 });
		expect(parseColorHex(` #f80`)).toStrictEqual({ r: 255, g: 136, b: 0 });
		expect(parseColorHex(`#f80 `)).toStrictEqual({ r: 255, g: 136, b: 0 });

		// Not accepted.
		expect(parseColorHex(`#g00`)).toBeNull();
		expect(parseColorHex(`#0g0`)).toBeNull();
		expect(parseColorHex(`#00g`)).toBeNull();
		expect(parseColorHex(`#00-`)).toBeNull();
	});

	test('#rgba', () => {
		expect(parseColorHex(`#f808`)).toStrictEqual({ r: 255, g: 136, b: 0, a: 136 });
		expect(parseColorHex(` #f808`)).toStrictEqual({ r: 255, g: 136, b: 0, a: 136 });
		expect(parseColorHex(`#f808 `)).toStrictEqual({ r: 255, g: 136, b: 0, a: 136 });

		// Not accepted.
		expect(parseColorHex(`#000g`)).toBeNull();
	});

	test('#rrggbb', () => {
		expect(parseColorHex(`#010203`)).toStrictEqual({ r: 1, g: 2, b: 3 });

		// Not accepted.
		expect(parseColorHex(`#gg0000`)).toBeNull();
	});

	test('#rrggbbaa', () => {
		expect(parseColorHex(`#01020304`)).toStrictEqual({ r: 1, g: 2, b: 3, a: 4 });
		expect(parseColorHex(`#01020304`)).toStrictEqual({ r: 1, g: 2, b: 3, a: 4 });

		// Not accepted.
		expect(parseColorHex(`#g00gg00g`)).toBeNull();
	});

	test('invalid', () => {
		// Has spaces.
		expect(parseColorHex(`#f 80`)).toBeNull();
		expect(parseColorHex(`#f8 0`)).toBeNull();
		expect(parseColorHex(`# f80`)).toBeNull();
		expect(parseColorHex(`#f 80`)).toBeNull();

		// Too few chars.
		expect(parseColorHex(`#f`)).toBeNull();
		expect(parseColorHex(`#ff`)).toBeNull();

		// Too many chars.
		expect(parseColorHex(`#fffff`)).toBeNull();
		expect(parseColorHex(`#fffffff`)).toBeNull();
		expect(parseColorHex(`#fffffffff`)).toBeNull();
	});
});
