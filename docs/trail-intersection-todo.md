# Trail Intersection Rendering — 3-way / 4-way Support

## Current limitation

Each cell in `trails[]` stores at most **2 movement directions**, packed into one byte:

- bits 0–3: direction 1
- bits 4–7: direction 2

Encoding: `(dx+1)*3 + (dy+1) + 1` → range 1–9

When a ship crosses the same cell a **third time** in a new direction, the third direction is silently dropped. The third arm of the intersection won't render.

## Where the limit is enforced

`SandApi.js`, `handleShipMovement`:

```js
const existing = trails[ship.cellIndex];
const dir1 = existing & 0x0F;
if (dir1 === 0) {
  trails[ship.cellIndex] = trailDir;
} else if ((existing >> 4) === 0 && trailDir !== dir1) {
  trails[ship.cellIndex] = dir1 | (trailDir << 4);
}
// third+ direction: silently ignored
```

## Options to fix

### Option A — Wider cell (2 bytes per cell)

Change `trails` from `Uint8Array` to `Uint16Array`. Each cell gets 16 bits.

Pack up to 4 directions × 4 bits = 16 bits exactly.

```
bits  0– 3: dir1
bits  4– 7: dir2
bits  8–11: dir3
bits 12–15: dir4
```

Simple, no structural change. Memory doubles (90KB → 180KB, trivial). Handles all real-world intersection cases.

### Option B — Separate direction array per axis

Two `Uint8Array`s: `trailsH` (horizontal/diagonal-right directions) and `trailsV` (vertical/diagonal-left). Each stores one direction per cell. Avoids packing entirely, rendering reads both.

Cleaner semantics, same memory as Option A, slightly more code.

### Option C — Bitmask (8 directions as 8 bits)

Since there are only 8 meaningful directions (excluding (0,0)), store them as a bitmask — one bit per direction:

```
bit 0: NW (-1,-1)    bit 4: E  ( 1, 0)
bit 1: N  ( 0,-1)    bit 5: SW (-1, 1)
bit 2: NE ( 1,-1)    bit 6: S  ( 0, 1)
bit 3: W  (-1, 0)    bit 7: SE ( 1, 1)
```

`trails[cell] |= dirBit` — adding a direction never erases another. All 8 directions supported in one byte.

Rendering: iterate bits 0–7, draw a line for each set bit whose neighbor has trail or ship.

**This is the cleanest option.** Same memory, no limit on intersections, trivially composable.

## Recommended: Option C

Change encoding in `handleShipMovement`:

```js
const dirBit = directionToBit(dx, dy); // lookup table or formula
trails[ship.cellIndex] |= dirBit;      // OR, never overwrites
```

Change rendering in `SvgRender.renderTrails`:

```js
for (let bit = 0; bit < 8; bit++) {
  if (!(trailVal & (1 << bit))) continue;
  const { ddx, ddy } = BIT_TO_DELTA[bit];
  // draw line if neighbor has trail or ship
}
```

Remove the 2-direction packing logic entirely.
