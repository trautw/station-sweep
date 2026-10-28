import { isWall, type Deck } from './deck';
import { delta, step } from './grid';
import { nextStepTowards } from './path';
import {
  TICKS_PER_SECOND,
  type Direction,
  type DroneMode,
  type DroneState,
  type DroneType,
  type TilePos,
} from './types';

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
  /** Ticks left in mode 'shutdown'. */
  shutdownTicks: number;
  /** The mode a shut-down drone goes back to when it wakes up. */
  resumeMode: DroneMode;
  /** Ticks left in mode 'salvaged' until the drone is rebuilt. */
  rebuildTicks: number;
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
  for (let i = 0; i < deck.hunters; i++) {
    drones.push({
      type: 'hunter',
      mode: 'waiting',
      start: deck.droneBay,
      releaseIndex: i,
      tile: deck.droneBay,
      offset: 0,
      direction: 'left',
      shutdownTicks: 0,
      resumeMode: 'waiting',
      rebuildTicks: 0,
    });
  }
  return drones;
}

/** Put a drone back to its start position and initial mode (after the robot was caught). */
export function resetDrone(drone: Drone): void {
  drone.tile = drone.start;
  drone.offset = 0;
  drone.direction = 'left';
  drone.mode = initialMode(drone.type);
  drone.shutdownTicks = 0;
  drone.rebuildTicks = 0;
}

/**
 * EMP hit: an active drone stops for `ticks` ticks, then resumes what it was
 * doing. Hitting an already shut-down drone restarts its shutdown time.
 * Drones waiting in the drone bay (to be released or rebuilt) are not affected.
 */
export function shutDown(drone: Drone, ticks: number): void {
  if (drone.mode === 'waiting' || drone.mode === 'salvaged') return;
  if (drone.mode !== 'shutdown') drone.resumeMode = drone.mode;
  drone.mode = 'shutdown';
  drone.shutdownTicks = ticks;
}

export function isShutDown(drone: Drone): boolean {
  return drone.mode === 'shutdown';
}

/** Salvaged: the drone goes to the drone bay and waits `ticks` ticks to be rebuilt. */
export function salvage(drone: Drone, droneBay: TilePos, ticks: number): void {
  drone.mode = 'salvaged';
  drone.tile = droneBay;
  drone.offset = 0;
  drone.shutdownTicks = 0;
  drone.rebuildTicks = ticks;
}

/** The mode a drone starts in once rebuilt. Ticket 10: Patrollers/Sentinels return to route/area. */
function rebuiltMode(type: DroneType): DroneMode {
  switch (type) {
    case 'hunter':
      return 'hunting';
  }
}

function initialMode(type: DroneType): DroneMode {
  switch (type) {
    case 'hunter':
      return 'waiting';
  }
}

/** Active drones can catch the robot. */
export function isActive(drone: Drone): boolean {
  return drone.mode !== 'waiting' && drone.mode !== 'shutdown' && drone.mode !== 'salvaged';
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
    case 'shutdown':
      drone.shutdownTicks--;
      if (drone.shutdownTicks <= 0) drone.mode = drone.resumeMode;
      return;
    case 'salvaged':
      drone.rebuildTicks--;
      if (drone.rebuildTicks <= 0) drone.mode = rebuiltMode(drone.type);
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
    shutdownTimeLeft: drone.mode === 'shutdown' ? drone.shutdownTicks / TICKS_PER_SECOND : 0,
  };
}
