import type { Direction, TilePos } from './types';

/**
 * All four directions in the fixed order used wherever ties must resolve
 * deterministically (shortest paths, a guarding Sentinel's turns).
 */
export const DIRECTIONS: readonly Direction[] = ['up', 'left', 'down', 'right'];

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

/** A string key for a tile, for maps and sets. */
export function tileKey(pos: TilePos): string {
  return `${pos.x},${pos.y}`;
}

export function sameTile(a: TilePos, b: TilePos): boolean {
  return a.x === b.x && a.y === b.y;
}

/** A wall map: walls[y][x]. */
export interface Grid {
  readonly width: number;
  readonly height: number;
  readonly walls: readonly (readonly boolean[])[];
}

/** Tiles outside the grid count as walls. */
export function isWall(grid: Grid, pos: TilePos): boolean {
  if (pos.y < 0 || pos.y >= grid.height || pos.x < 0 || pos.x >= grid.width) return true;
  return grid.walls[pos.y]?.[pos.x] ?? true;
}
