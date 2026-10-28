import { isWall, type Deck } from './deck';
import { delta, step } from './grid';
import { nextStepTowards } from './path';
import type { Direction, DroneMode, DroneState, DroneType, TilePos } from './types';

const EPSILON = 1e-6;

/**
 * Mutable drone model. Like the robot, a drone is always "on" `tile` and
 * `offset` (0..1) of the way towards the next tile in `direction`. Drones only
 * choose a new direction at tile centres.
 */
export interface Drone {
  readonly type: DroneType;
  mode: DroneMode;
  /** Where the drone (re)starts: the drone bay for Hunters. */
  readonly start: TilePos;
  /** Hunters only: 0 = released first, 1 = second, ... */
  readonly releaseIndex: number;
  tile: TilePos;
  offset: number;
  direction: Direction;
}

/** What a drone may look at during one tick. */
export interface DroneContext {
  readonly deck: Deck;
  readonly robotTile: TilePos;
  /** Ticks since the deck started or since the last reset. */
  readonly elapsedTicks: number;
  readonly hunterReleaseDelayTicks: number;
  /** Tiles per tick. */
  readonly distance: number;
}

export function createDrones(deck: Deck): Drone[] {
  const drones: Drone[] = [];
  if (deck.droneBay !== null) {
    for (let i = 0; i < deck.hunters; i++) {
      drones.push({
        type: 'hunter',
        mode: 'waiting',
        start: deck.droneBay,
        releaseIndex: i,
        tile: deck.droneBay,
        offset: 0,
        direction: 'left',
      });
    }
  }
  return drones;
}

/** Put a drone back to its start position and initial mode (after the robot was caught). */
export function resetDrone(drone: Drone): void {
  drone.tile = drone.start;
  drone.offset = 0;
  drone.direction = 'left';
  drone.mode = initialMode(drone.type);
}

function initialMode(type: DroneType): DroneMode {
  switch (type) {
    case 'hunter':
      return 'waiting';
  }
}

/** Active drones can catch the robot. */
export function isActive(drone: Drone): boolean {
  return drone.mode !== 'waiting';
}

export function updateDrone(drone: Drone, ctx: DroneContext): void {
  switch (drone.mode) {
    case 'waiting':
      if (ctx.elapsedTicks >= (drone.releaseIndex + 1) * ctx.hunterReleaseDelayTicks) {
        drone.mode = 'hunting';
        moveDrone(drone, ctx, () => nextStepTowards(ctx.deck, drone.tile, ctx.robotTile));
      }
      return;
    case 'hunting':
      moveDrone(drone, ctx, () => nextStepTowards(ctx.deck, drone.tile, ctx.robotTile));
      return;
  }
}

/**
 * Move `ctx.distance` tiles. At each tile centre `choose` picks the next
 * direction; null means stay on this tile for the rest of the tick.
 */
function moveDrone(drone: Drone, ctx: DroneContext, choose: () => Direction | null): void {
  let remaining = ctx.distance;
  while (remaining > EPSILON) {
    if (drone.offset === 0) {
      const dir = choose();
      if (dir === null || isWall(ctx.deck, step(drone.tile, dir))) return;
      drone.direction = dir;
    }
    const advance = Math.min(remaining, 1 - drone.offset);
    drone.offset += advance;
    remaining -= advance;
    if (drone.offset >= 1 - EPSILON) {
      drone.tile = step(drone.tile, drone.direction);
      drone.offset = 0;
    }
  }
}

export function dronePosition(drone: Drone): TilePos {
  const d = delta(drone.direction);
  return { x: drone.tile.x + d.x * drone.offset, y: drone.tile.y + d.y * drone.offset };
}

export function droneSnapshot(drone: Drone): DroneState {
  return {
    type: drone.type,
    mode: drone.mode,
    position: dronePosition(drone),
    tile: drone.offset > 0.5 ? step(drone.tile, drone.direction) : drone.tile,
    direction: drone.direction,
  };
}
