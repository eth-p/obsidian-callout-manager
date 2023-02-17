import { describe, expect, test } from '@jest/globals';

import { parseColorHex, parseColorRGB, parseColorRGBA } from './color-parse';

describe('parseColorRGB', () => {
	test('rgb(i, i, i)', () => {
		expect(parseColorRGB(`rgb( 10, 10, 10 )`)).toStrictEqual([10, 10, 10]);
		expect(parseColorRGB(`rgb(1,1,1)`)).toStrictEqual([1, 1, 1]);
		expect(parseColorRGB(`rgb(2, 2, 2)`)).toStrictEqual([2, 2, 2]);

		// Weird formatting.
		expect(parseColorRGB(` rgb(3, 3, 3)`)).toStrictEqual([3, 3, 3]);
		expect(parseColorRGB(`rgb(9, 9, 9) `)).toStrictEqual([9, 9, 9]);
		expect(parseColorRGB(`rgb(10,  10  , 10  ) `)).toStrictEqual([10, 10, 10]);
		expect(parseColorRGB(`rgb(4, 4,4)`)).toStrictEqual([4, 4, 4]);
		expect(parseColorRGB(`rgb(5,5 ,5)`)).toStrictEqual([5, 5, 5]);

		// Inconsistent commas.
		expect(parseColorRGB(`rgb(6 6 6)`)).toStrictEqual([6, 6, 6]);
		expect(parseColorRGB(`rgb(7 7, 7)`)).toStrictEqual([7, 7, 7]);
		expect(parseColorRGB(`rgb(8 8 ,8)`)).toStrictEqual([8, 8, 8]);

		// Boundary cases.
		expect(parseColorRGB(`rgb( 0, 0, 0 )`)).toStrictEqual([0, 0, 0]);
		expect(parseColorRGB(`rgb( 255, 255, 255 )`)).toStrictEqual([255, 255, 255]);
	});

	test('rgb(%, %, %)', () => {
		expect(parseColorRGB(`rgb( 50% 50% 50% )`)).toStrictEqual([127, 127, 127]);
		expect(parseColorRGB(`rgb( 33.4%, 33.4%, 33.4% )`)).toStrictEqual([85, 85, 85]);

		// Boundary cases.
		expect(parseColorRGB(`rgb( 0%, 0%, 0% )`)).toStrictEqual([0, 0, 0]);
		expect(parseColorRGB(`rgb( 100%, 100%, 100% )`)).toStrictEqual([255, 255, 255]);
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
		expect(parseColorRGBA(`rgba( 10, 10, 10, 0.2 )`)).toStrictEqual([10, 10, 10, 51]);

		// Weird formatting.
		expect(parseColorRGBA(` rgba(3, 3, 3,1)`)).toStrictEqual([3, 3, 3, 255]);
		expect(parseColorRGBA(`rgba(9, 9, 9,1) `)).toStrictEqual([9, 9, 9, 255]);
		expect(parseColorRGBA(`rgba(10,  10  , 10,1  ) `)).toStrictEqual([10, 10, 10, 255]);
		expect(parseColorRGBA(`rgba(4, 4,4 ,1)`)).toStrictEqual([4, 4, 4, 255]);
		expect(parseColorRGBA(`rgba(5,5 ,5,1)`)).toStrictEqual([5, 5, 5, 255]);

		// Not accepted.
		expect(parseColorRGBA(`rgba( 10, 10, 10 1 )`)).toBeNull();
		expect(parseColorRGBA(`rgba( 10 10 10 1 )`)).toBeNull();

		// Boundary cases.
		expect(parseColorRGBA(`rgba( 0, 0, 0, 0 )`)).toStrictEqual([0, 0, 0, 0]);
		expect(parseColorRGBA(`rgba( 255, 255, 255, 1 )`)).toStrictEqual([255, 255, 255, 255]);
	});

	test('rgba(i, i, i, %)', () => {
		expect(parseColorRGBA(`rgba( 10, 10, 10, 100% )`)).toStrictEqual([10, 10, 10, 255]);
	});

	test('rgba(%, %, %, %)', () => {
		expect(parseColorRGBA(`rgba( 100%, 0%, 100%, 0% )`)).toStrictEqual([255, 0, 255, 0]);
	});

	test('rgba(%, %, %, i)', () => {
		expect(parseColorRGBA(`rgba( 100%, 0%, 100%, 0.5 )`)).toStrictEqual([255, 0, 255, 127]);
	});

	test('rgba(i, i, i)', () => {
		expect(parseColorRGBA(`rgba( 10, 10, 10 )`)).toStrictEqual([10, 10, 10, 255]);

		// Inconsistent commas.
		expect(parseColorRGBA(`rgba( 10 10 10 )`)).toStrictEqual([10, 10, 10, 255]);

		// Boundary cases.
		expect(parseColorRGBA(`rgba( 0, 0, 0 )`)).toStrictEqual([0, 0, 0, 255]);
		expect(parseColorRGBA(`rgba( 255, 255, 255 )`)).toStrictEqual([255, 255, 255, 255]);
	});
});

describe('parseColorHex', () => {
	test('#rgb', () => {
		expect(parseColorHex(`#f80`)).toStrictEqual([255, 136, 0]);
		expect(parseColorHex(` #f80`)).toStrictEqual([255, 136, 0]);
		expect(parseColorHex(`#f80 `)).toStrictEqual([255, 136, 0]);

		// Not accepted.
		expect(parseColorHex(`#g00`)).toBeNull();
		expect(parseColorHex(`#0g0`)).toBeNull();
		expect(parseColorHex(`#00g`)).toBeNull();
		expect(parseColorHex(`#00-`)).toBeNull();
	});

	test('#rgba', () => {
		expect(parseColorHex(`#f808`)).toStrictEqual([255, 136, 0, 136]);
		expect(parseColorHex(` #f808`)).toStrictEqual([255, 136, 0, 136]);
		expect(parseColorHex(`#f808 `)).toStrictEqual([255, 136, 0, 136]);

		// Not accepted.
		expect(parseColorHex(`#000g`)).toBeNull();
	});

	test('#rrggbb', () => {
		expect(parseColorHex(`#010203`)).toStrictEqual([1, 2, 3]);

		// Not accepted.
		expect(parseColorHex(`#gg0000`)).toBeNull();
	});

	test('#rrggbbaa', () => {
		expect(parseColorHex(`#01020304`)).toStrictEqual([1, 2, 3, 4]);
		expect(parseColorHex(`#01020304`)).toStrictEqual([1, 2, 3, 4]);

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
