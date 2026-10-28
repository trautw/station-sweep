import type { Deck } from './deck';
import { droneTile, moveDrone, type DroneContext, type Patroller } from './drone';
import { isWall, sameTile, step } from './grid';
import { nextStepTowards, pathLengths } from './path';
import type { TilePos } from './types';

/** Per-Patroller state: its route and the index of the waypoint it is flying to. */
export interface Patrol {
  readonly route: readonly TilePos[];
  targetIndex: number;
}

export function resetPatrol(patrol: Patrol): void {
  patrol.targetIndex = 0;
}

/** Rebuilt at `bay`: return to the nearest waypoint of the route, like after losing sight. */
export function rebuildPatroller(patrol: Patrol, deck: Deck, bay: TilePos): void {
  patrol.targetIndex = nearestWaypoint(deck, bay, patrol.route);
}

export function updatePatroller(drone: Patroller, ctx: DroneContext): void {
  const patrol = drone.patrol;
  // Line of sight is checked every tick; the direction still only changes at tile centres.
  if (hasLineOfSight(ctx.deck, droneTile(drone), ctx.robotTile)) {
    drone.mode = 'chasing';
  } else if (drone.mode === 'chasing') {
    // Lost sight: fly back to the nearest waypoint, measured from the next tile centre.
    drone.mode = 'returning';
    const next = drone.offset > 0 ? step(drone.tile, drone.direction) : drone.tile;
    patrol.targetIndex = nearestWaypoint(ctx.deck, next, patrol.route);
  }
  moveDrone(drone, ctx, () => {
    if (drone.mode === 'chasing') return nextStepTowards(ctx.deck, drone.tile, ctx.robotTile);
    if (sameTile(drone.tile, waypoint(patrol))) {
      // Arrived: back on the route (if returning), on to the next waypoint.
      drone.mode = 'patrolling';
      patrol.targetIndex = (patrol.targetIndex + 1) % patrol.route.length;
    }
    return nextStepTowards(ctx.deck, drone.tile, waypoint(patrol));
  });
}

function waypoint(patrol: Patrol): TilePos {
  const wp = patrol.route[patrol.targetIndex];
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
  const lengthTo = pathLengths(deck, from);
  let best = 0;
  let bestDistance = Infinity;
  route.forEach((wp, i) => {
    const d = lengthTo(wp);
    if (d < bestDistance) {
      best = i;
      bestDistance = d;
    }
  });
  return best;
}
