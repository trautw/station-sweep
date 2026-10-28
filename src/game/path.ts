import { DIRECTIONS, isWall, sameTile, step, tileKey, type Grid } from './grid';
import type { Direction, TilePos } from './types';

/** How a breadth-first search reached a tile. */
interface Reached {
  /** Steps from the start (an airlock jump counts as one). */
  readonly distance: number;
  /** The direction of the first step from the start (null for the start, or after a first-step jump). */
  readonly firstStep: Direction | null;
}

interface SearchOptions {
  /** Extra one-step links from a tile, e.g. an airlock to its partner. */
  readonly links?: (tile: TilePos) => TilePos | null;
  /** Stop as soon as this tile is reached. */
  readonly until?: TilePos;
}

/**
 * Breadth-first search over corridor tiles from `from`, trying directions in
 * DIRECTIONS order so ties between equally short paths resolve
 * deterministically. Returns every reached tile, keyed by tileKey.
 */
export function searchFrom(
  grid: Grid,
  from: TilePos,
  { links, until }: SearchOptions = {},
): Map<string, Reached> {
  const reached = new Map<string, Reached>([[tileKey(from), { distance: 0, firstStep: null }]]);
  const queue = [from];
  for (let i = 0; i < queue.length; i++) {
    const tile = queue[i]!;
    const here = reached.get(tileKey(tile))!;
    if (until !== undefined && sameTile(tile, until)) break;
    const next: [TilePos, Direction | null][] = DIRECTIONS.map((dir) => [step(tile, dir), dir]);
    const link = links?.(tile) ?? null;
    if (link !== null) next.push([link, null]);
    for (const [to, dir] of next) {
      if (isWall(grid, to) || reached.has(tileKey(to))) continue;
      const firstStep = i === 0 ? dir : here.firstStep;
      reached.set(tileKey(to), { distance: here.distance + 1, firstStep });
      queue.push(to);
    }
  }
  return reached;
}

/**
 * First step of a shortest path from `from` to `to` over corridor tiles.
 * Airlocks are plain corridor tiles here: drones never use them. Returns null
 * when `from` equals `to` or `to` is unreachable.
 */
export function nextStepTowards(deck: Grid, from: TilePos, to: TilePos): Direction | null {
  if (sameTile(from, to)) return null;
  return searchFrom(deck, from, { until: to }).get(tileKey(to))?.firstStep ?? null;
}

/** Path length (in tiles, over corridor tiles, no airlocks) from `from` to `to`; Infinity if unreachable. */
export function pathLengths(deck: Grid, from: TilePos): (to: TilePos) => number {
  const reached = searchFrom(deck, from);
  return (to) => reached.get(tileKey(to))?.distance ?? Infinity;
}
