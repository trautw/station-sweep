import type { Deck } from './deck';
import { isWall, step } from './grid';
import { advance, nearestTile, position, type Mover } from './mover';
import { nextStepTowards } from './path';
import { rebuildPatroller, resetPatrol, updatePatroller, type Patrol } from './patroller';
import { updateSentinel } from './sentinel';
import {
  TICKS_PER_SECOND,
  type Direction,
  type DroneMode,
  type DroneState,
  type DroneType,
  type GuardedArea,
  type TilePos,
} from './types';

/**
 * Mutable drone model, the same for every type. Drones only choose a new
 * direction at tile centres (see Mover).
 */
interface DroneBase extends Mover {
  mode: DroneMode;
  /**
   * Where the drone (re)starts: the drone bay for Hunters, the first waypoint
   * for Patrollers, the start tile for Sentinels.
   */
  readonly start: TilePos;
  /** Ticks left in mode 'shutdown'. */
  shutdownTicks: number;
  /** The EMP (numbered per deck) that caused the current shutdown; its salvage chain counts this drone. */
  shutdownBy: number;
  /** The mode a shut-down drone goes back to when it wakes up. */
  resumeMode: DroneMode;
  /** Ticks left in mode 'salvaged' until the drone is rebuilt. */
  rebuildTicks: number;
}

export interface Hunter extends DroneBase {
  readonly type: 'hunter';
  /** 0 = released first, 1 = second, ... */
  readonly releaseIndex: number;
}

export interface Patroller extends DroneBase {
  readonly type: 'patroller';
  /** Route and the waypoint being flown to. */
  readonly patrol: Patrol;
}

export interface Sentinel extends DroneBase {
  readonly type: 'sentinel';
  readonly area: GuardedArea;
}

export type Drone = Hunter | Patroller | Sentinel;

/** What a drone may look at during one tick. */
export interface DroneContext {
  readonly deck: Deck;
  readonly robotTile: TilePos;
  /** Ticks since the deck started or since the last reset. */
  readonly elapsedTicks: number;
  readonly hunterReleaseDelayTicks: number;
  /** Sentinels chase the robot when it is at most this many tiles away. */
  readonly sentinelTriggerDistance: number;
  /** How far a drone moves in one tick, in tiles. */
  readonly tilesPerTick: number;
}

/** The parts every drone starts with: standing on `start`, in its initial mode. */
function newDrone(type: DroneType, start: TilePos): DroneBase {
  const mode = initialMode(type);
  return {
    mode,
    start,
    tile: start,
    offset: 0,
    direction: 'left',
    shutdownTicks: 0,
    shutdownBy: 0,
    resumeMode: mode,
    rebuildTicks: 0,
  };
}

export function createDrones(deck: Deck): Drone[] {
  const drones: Drone[] = [];
  for (let releaseIndex = 0; releaseIndex < deck.hunters; releaseIndex++) {
    drones.push({ ...newDrone('hunter', deck.droneBay), type: 'hunter', releaseIndex });
  }
  for (const route of deck.patrolRoutes) {
    const start = route[0];
    if (start === undefined) throw new Error('a Patroller route needs at least one waypoint');
    drones.push({ ...newDrone('patroller', start), type: 'patroller', patrol: { route, targetIndex: 0 } });
  }
  for (const { start, area } of deck.sentinels) {
    drones.push({ ...newDrone('sentinel', start), type: 'sentinel', area });
  }
  return drones;
}

/** Put a drone back to its start position and initial mode (after the robot was caught). */
export function resetDrone(drone: Drone): void {
  drone.tile = drone.start;
  drone.offset = 0;
  drone.direction = 'left';
  drone.mode = initialMode(drone.type);
  if (drone.type === 'patroller') resetPatrol(drone.patrol);
  drone.shutdownTicks = 0;
  drone.rebuildTicks = 0;
}

/**
 * Hit by EMP number `emp`: an active drone stops for `ticks` ticks, then
 * resumes what it was doing. Hitting an already shut-down drone restarts its
 * shutdown time (and it now belongs to the newer EMP's salvage chain).
 * Drones waiting in the drone bay (to be released or rebuilt) are not affected.
 */
export function shutDown(drone: Drone, ticks: number, emp: number): void {
  if (drone.mode === 'waiting' || drone.mode === 'salvaged') return;
  if (drone.mode !== 'shutdown') drone.resumeMode = drone.mode;
  drone.mode = 'shutdown';
  drone.shutdownTicks = ticks;
  drone.shutdownBy = emp;
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

/**
 * Rebuilt in the drone bay, keeping its type. A Hunter hunts again at once;
 * a Patroller flies to the nearest waypoint of its route and a Sentinel to its
 * guarded area (both by the shortest path, in mode 'returning'), then they
 * carry on as normal. A returning drone is active, so it can catch the robot.
 */
function rebuild(drone: Drone, deck: Deck): void {
  switch (drone.type) {
    case 'hunter':
      drone.mode = 'hunting';
      return;
    case 'patroller':
      drone.mode = 'returning';
      rebuildPatroller(drone.patrol, deck, drone.tile);
      return;
    case 'sentinel':
      // Heads for its start tile; guards again on the first tile of its area.
      drone.mode = 'returning';
      return;
  }
}

function initialMode(type: DroneType): DroneMode {
  switch (type) {
    case 'hunter':
      return 'waiting';
    case 'patroller':
      return 'patrolling';
    case 'sentinel':
      return 'guarding';
  }
}

/** Active drones can catch the robot. */
export function isActive(drone: Drone): boolean {
  return drone.mode !== 'waiting' && drone.mode !== 'shutdown' && drone.mode !== 'salvaged';
}

/**
 * Per-tick behaviour. Shutdown and salvage work the same for every type;
 * otherwise one function per drone type.
 */
export function updateDrone(drone: Drone, ctx: DroneContext): void {
  if (drone.mode === 'shutdown') {
    drone.shutdownTicks--;
    if (drone.shutdownTicks <= 0) drone.mode = drone.resumeMode;
    return;
  }
  if (drone.mode === 'salvaged') {
    drone.rebuildTicks--;
    if (drone.rebuildTicks <= 0) rebuild(drone, ctx.deck);
    return;
  }
  switch (drone.type) {
    case 'hunter':
      updateHunter(drone, ctx);
      return;
    case 'patroller':
      updatePatroller(drone, ctx);
      return;
    case 'sentinel':
      updateSentinel(drone, ctx);
      return;
  }
}

function updateHunter(drone: Hunter, ctx: DroneContext): void {
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
    default:
      return;
  }
}

/**
 * Move `ctx.tilesPerTick` tiles. At each tile centre `choose` picks the next
 * direction; null means stay on this tile for the rest of the tick.
 */
export function moveDrone(drone: Drone, ctx: DroneContext, choose: () => Direction | null): void {
  advance(drone, ctx.tilesPerTick, () => {
    const dir = choose();
    if (dir === null || isWall(ctx.deck, step(drone.tile, dir))) return false;
    drone.direction = dir;
    return true;
  });
}

export function dronePosition(drone: Drone): TilePos {
  return position(drone);
}

/** The tile the drone is on (nearest tile centre). */
export function droneTile(drone: Drone): TilePos {
  return nearestTile(drone);
}

export function droneSnapshot(drone: Drone): DroneState {
  return {
    type: drone.type,
    mode: drone.mode,
    position: dronePosition(drone),
    tile: droneTile(drone),
    direction: drone.direction,
    shutdownTimeLeft: drone.mode === 'shutdown' ? drone.shutdownTicks / TICKS_PER_SECOND : 0,
  };
}
