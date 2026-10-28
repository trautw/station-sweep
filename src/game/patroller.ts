import { isWall, type Deck } from './deck';
import { droneSnapshot, moveDrone, type Drone, type DroneContext } from './drone';
import { nextStepTowards } from './path';
import type { TilePos } from './types';

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
  if (hasLineOfSight(ctx.deck, droneSnapshot(drone).tile, ctx.robotTile)) drone.mode = 'chasing';
  moveDrone(drone, ctx, () => {
    if (drone.mode === 'chasing') return nextStepTowards(ctx.deck, drone.tile, ctx.robotTile);
    if (same(drone.tile, waypoint(patrol))) {
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
