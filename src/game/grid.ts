import type { Direction, TilePos } from './types';

const DELTAS: Record<Direction, TilePos> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITES: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

export function step(pos: TilePos, dir: Direction): TilePos {
  const d = DELTAS[dir];
  return { x: pos.x + d.x, y: pos.y + d.y };
}

export function delta(dir: Direction): TilePos {
  return DELTAS[dir];
}

export function opposite(dir: Direction): Direction {
  return OPPOSITES[dir];
}
