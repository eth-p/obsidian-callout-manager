import { getColorFromCallout } from "./util";
import type {Callout} from "./types";
import type {Precomputed} from "@obsidian-callout-manager/sort";

/**
 * Sort by color.
 */
export function compareColor(
	{ computed: { colorValid: aValid, colorHSV: aHSV } }: Precomputed<Callout, compareColor.T>,
	{ computed: { colorValid: bValid, colorHSV: bHSV } }: Precomputed<Callout, compareColor.T>,
): number {
	const validityDelta = (aValid ? 1 : 0) - (bValid ? 1 : 0);
	if (validityDelta !== 0) return validityDelta;

	// Next: colors before shades.
	const saturatedDelta = (aHSV.s > 0 ? 1 : 0) - (bHSV.s > 0 ? 1 : 0);
	if (saturatedDelta !== 0) return saturatedDelta;

	// Next: hue.
	const hueDelta = aHSV.h - bHSV.h;
	if (Math.abs(hueDelta) > 2) return hueDelta;

	// Next: saturation + value;
	const svDelta = aHSV.s + aHSV.v - (bHSV.s + bHSV.v);
	if (svDelta !== 0) return svDelta;

	return 0;
}

export namespace compareColor {
	export type T = { colorValid: boolean; colorHSV: HSV };
	export function precompute(v: Callout): T {
		const color = getColorFromCallout(v);
		return {
			colorValid: color != null,
			colorHSV: color == null ? { h: 0, s: 0, v: 0 } : toHSV(color),
		};
	}
}

/**
 * Sort by ID.
 */
export function compareId(
	{ value: { id: aId } }: Precomputed<Callout, void>,
	{ value: { id: bId } }: Precomputed<Callout, void>,
) {
	return bId.localeCompare(aId);
}
