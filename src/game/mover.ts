import { delta, step } from './grid';
import type { Direction, TilePos } from './types';

const EPSILON = 1e-6;

/**
 * Anything that moves tile by tile (robot, drones): it is always "on" `tile`
 * and `offset` (0..1) of the way from that tile's centre towards the next
 * tile in `direction`.
 */
export interface Mover {
  tile: TilePos;
  offset: number;
  direction: Direction;
}

/** Smooth position in tile units; tile centres are at whole numbers. */
export function position(mover: Mover): TilePos {
  const d = delta(mover.direction);
  return { x: mover.tile.x + d.x * mover.offset, y: mover.tile.y + d.y * mover.offset };
}

/** The tile whose centre is nearest: the next tile once more than halfway there. */
export function nearestTile(mover: Mover): TilePos {
  return mover.offset > 0.5 ? step(mover.tile, mover.direction) : mover.tile;
}

/**
 * Move `distance` tiles. At every tile centre `atCentre` may change the
 * direction and returns false to stay put for the rest of the move; after
 * reaching a new tile centre `arrived` may move the mover elsewhere (airlocks).
 */
export function advance(
  mover: Mover,
  distance: number,
  atCentre: () => boolean,
  arrived: () => void = () => {},
): void {
  let remaining = distance;
  while (remaining > EPSILON) {
    if (mover.offset === 0 && !atCentre()) return;
    const move = Math.min(remaining, 1 - mover.offset);
    mover.offset += move;
    remaining -= move;
    if (mover.offset >= 1 - EPSILON) {
      mover.tile = step(mover.tile, mover.direction);
      mover.offset = 0;
      arrived();
    }
  }
}
