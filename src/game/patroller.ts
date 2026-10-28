import { isWall, type Deck } from './deck';
import { droneSnapshot, moveDrone, type Drone, type DroneContext } from './drone';
import { nextStepTowards } from './path';
import { step } from './grid';
import type { Direction, TilePos } from './types';

/** Per-Patroller state: its route and the index of the waypoint it is flying to. */
export interface Patrol {
  readonly route: readonly TilePos[];
  target: number;
}

const same = (a: TilePos, b: TilePos) => a.x === b.x && a.y === b.y;

export function createPatroller(route: readonly TilePos[]): Drone {
  const start = route[0];
  if (start === undefined) throw new Error('a Patroller route needs at least one waypoint');
  return {
    type: 'patroller',
    mode: 'patrolling',
    start,
    releaseIndex: 0,
    tile: start,
    offset: 0,
    direction: 'left',
    shutdownTicks: 0,
    resumeMode: 'patrolling',
    rebuildTicks: 0,
    patrol: { route, target: 0 },
  };
}

export function resetPatrol(patrol: Patrol): void {
  patrol.target = 0;
}

export function updatePatroller(drone: Drone, ctx: DroneContext): void {
  const patrol = drone.patrol;
  if (patrol === undefined) return;
  // Line of sight is checked every tick; the direction still only changes at tile centres.
  if (hasLineOfSight(ctx.deck, droneSnapshot(drone).tile, ctx.robotTile)) {
    drone.mode = 'chasing';
  } else if (drone.mode === 'chasing') {
    // Lost sight: fly back to the nearest waypoint, measured from the next tile centre.
    drone.mode = 'returning';
    const next = drone.offset > 0 ? step(drone.tile, drone.direction) : drone.tile;
    patrol.target = nearestWaypoint(ctx.deck, next, patrol.route);
  }
  moveDrone(drone, ctx, () => {
    if (drone.mode === 'chasing') return nextStepTowards(ctx.deck, drone.tile, ctx.robotTile);
    if (same(drone.tile, waypoint(patrol))) {
      // Arrived: back on the route (if returning), on to the next waypoint.
      drone.mode = 'patrolling';
      patrol.target = (patrol.target + 1) % patrol.route.length;
    }
    return nextStepTowards(ctx.deck, drone.tile, waypoint(patrol));
  });
}

function waypoint(patrol: Patrol): TilePos {
  const wp = patrol.route[patrol.target];
  if (wp === undefined) throw new Error('Patroller waypoint index out of range');
  return wp;
}

/** Same row or column, and no wall tile between the two. Airlock tiles are corridor. */
function hasLineOfSight(deck: Deck, from: TilePos, to: TilePos): boolean {
  if (from.x !== to.x && from.y !== to.y) return false;
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  for (let x = from.x + dx, y = from.y + dy; x !== to.x || y !== to.y; x += dx, y += dy) {
    if (isWall(deck, { x, y })) return false;
  }
  return true;
}

/** Index of the waypoint with the shortest path from `from`; ties go to the lower index. */
function nearestWaypoint(deck: Deck, from: TilePos, route: readonly TilePos[]): number {
  const distances = pathLengthsFrom(deck, from);
  let best = 0;
  let bestDistance = Infinity;
  route.forEach((wp, i) => {
    const d = distances.get(key(wp)) ?? Infinity;
    if (d < bestDistance) {
      best = i;
      bestDistance = d;
    }
  });
  return best;
}

const DIRECTIONS: readonly Direction[] = ['up', 'left', 'down', 'right'];
const key = (p: TilePos) => `${p.x},${p.y}`;

/** Path length (in tiles, over corridor tiles, no airlocks) from `from` to every reachable tile. */
function pathLengthsFrom(deck: Deck, from: TilePos): Map<string, number> {
  const distances = new Map([[key(from), 0]]);
  const queue = [from];
  for (let i = 0; i < queue.length; i++) {
    const tile = queue[i]!;
    const d = distances.get(key(tile))!;
    for (const dir of DIRECTIONS) {
      const next = step(tile, dir);
      if (isWall(deck, next) || distances.has(key(next))) continue;
      distances.set(key(next), d + 1);
      queue.push(next);
    }
  }
  return distances;
}
