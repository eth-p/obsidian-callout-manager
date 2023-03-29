import { WithBrand } from '@coderspirit/nominal';

/**
 * A field of {@link SearchIndex} bits.
 * Performing bitwise operations on this is a low-cost way of doing set operations.
 */
export type BitField = WithBrand<bigint, 'IndexBitField'>;
export namespace BitField {
	/**
	 * Gets a {@link BitField} containing a single enabled bit at the given position.
	 * @param position The position of the bit.
	 * @returns The field.
	 */
	export function fromPosition(position: BitPosition): BitField {
		return (1n << BigInt(position)) as BitField;
	}

	/**
	 * Gets a {@link BitField} containing a all bits enabled until and including the given position.
	 * @param position The position of the bit.
	 * @returns The field.
	 */
	export function fromPositionWithTrailing(position: BitPosition): BitField {
		return ((1n << BigInt(position + 1)) - 1n) as BitField;
	}

	/**
	 * Scans for the most significant bit in the bit field.
	 *
	 * @param field The field to scan.
	 * @returns The position of the most significant bit, or `-1` if the input is zero.
	 * @benchmark https://jsperf.app/gepiye
	 */
	export function scanMostSignificant(field: BitField): BitPosition {
		const MASK = ~0xFFFFFFFFn;

		let offset = 0;
		for (let a = field as bigint; (a & MASK) > 0; a >>= 32n) {
			offset += 32;
		}

		return (offset + (31 - Math.clz32(Number(field)))) as BitPosition;
	}

	/**
	 * Truth table:
	 *
	 * |`\|`| `0` | `1` |
	 * |:--:|:---:|:---:|
	 * |`0` |  0  |  1  |
	 * |`1` |  1  |  1  |
	 */
	export function or(a: BitField, b: BitField): BitField {
		return (a | b) as BitField;
	}

	/**
	 * Truth table:
	 *
	 * |`&` | `0` | `1` |
	 * |---:|:---:|:---:|
	 * |`0` |  0  |  0  |
	 * |`1` |  0  |  1  |
	 */
	export function and(a: BitField, b: BitField): BitField {
		return (a & b) as BitField;
	}

	/**
	 * Truth table:
	 *
	 * |`&~`| `0` | `1` |
	 * |---:|:---:|:---:|
	 * |`0` |  0  |  1  |
	 * |`1` |  0  |  0  |
	 */
	export function andNot(a: BitField, b: BitField): BitField {
		return (a & ~b) as BitField;
	}

	/**
	 * Truth table:
	 *
	 * |`~` | `0` | `1` |
	 * |---:|:---:|:---:|
	 * |`0` |  1  |  0  |
	 *
	 * @param width The width of the bitfield.
	 */
	export function not(a: BitField, width: number): BitField {
		return (fromPositionWithTrailing((width - 1) as BitPosition) ^ a) as BitField;
	}
}

/**
 * A position of a bit inside the {@link SearchIndex}.
 */
export type BitPosition = WithBrand<number, 'IndexBitPosition'>;

/**
 * A registry of owned bit positions within an infinitely-sized integer.
 */
export class BitPositionRegistry {
	private recycled: Array<BitPosition> = [];
	private next: BitPosition = 0 as BitPosition;
	private asField: BitField = 0n as BitField;

	/**
	 * A field of all owned bits.
	 */
	public get field(): BitField {
		return this.asField;
	}

	/**
	 * The number of bits that are needed to represent a bitfield.
	 */
	public get size(): number {
		return this.next as number;
	}

	/**
	 * Claims a bit from the registry.
	 */
	public claim(): BitPosition {
		const { recycled } = this;

		// Claim the next bit.
		const claimed = (recycled.length > 0) ? recycled.pop() : (this.next++);

		// Update the field.
		this.asField = BitField.or(this.asField, BitField.fromPosition(claimed as BitPosition));
		return claimed as BitPosition;
	}

	/**
	 * Relinquishes a bit back to the registry.
	 * @param position The position to relinquish.
	 */
	public relinquish(position: BitPosition): void {
		const { recycled } = this;

		// Recycle the bit.
		recycled.push(position);
		this.asField = BitField.andNot(this.asField, BitField.fromPosition(position));
	}
}
