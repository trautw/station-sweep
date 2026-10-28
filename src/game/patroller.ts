import { moveDrone, type Drone, type DroneContext } from './drone';
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
  moveDrone(drone, ctx, () => {
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
