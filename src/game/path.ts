import { isWall, type Deck } from './deck';
import { step } from './grid';
import type { Direction, TilePos } from './types';

/** Fixed neighbour order so ties between equally short paths resolve deterministically. */
const DIRECTIONS: readonly Direction[] = ['up', 'left', 'down', 'right'];

/**
 * First step of a shortest path from `from` to `to` over corridor tiles
 * (breadth-first search). Airlocks are plain corridor tiles here: drones never
 * use them. Returns null when `from` equals `to` or `to` is unreachable.
 */
export function nextStepTowards(deck: Deck, from: TilePos, to: TilePos): Direction | null {
  if (from.x === to.x && from.y === to.y) return null;
  const key = (p: TilePos) => p.y * deck.width + p.x;
  // For every visited tile: the first direction taken from `from` to reach it.
  const firstStep = new Map<number, Direction>();
  const queue: TilePos[] = [];
  const visited = new Set<number>([key(from)]);
  for (const dir of DIRECTIONS) {
    const next = step(from, dir);
    if (isWall(deck, next) || visited.has(key(next))) continue;
    visited.add(key(next));
    firstStep.set(key(next), dir);
    queue.push(next);
  }
  for (let i = 0; i < queue.length; i++) {
    const tile = queue[i]!;
    const first = firstStep.get(key(tile))!;
    if (tile.x === to.x && tile.y === to.y) return first;
    for (const dir of DIRECTIONS) {
      const next = step(tile, dir);
      if (isWall(deck, next) || visited.has(key(next))) continue;
      visited.add(key(next));
      firstStep.set(key(next), first);
      queue.push(next);
    }
  }
  return null;
}
