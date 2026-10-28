import { isWall } from './deck';
import { moveDrone, type Drone, type DroneContext } from './drone';
import { opposite, step } from './grid';
import { nextStepTowards } from './path';
import type { Direction, GuardedArea, TilePos } from './types';

/** Order in which a guarding Sentinel tries new directions when it can't go straight on. */
const DIRECTIONS: readonly Direction[] = ['up', 'left', 'down', 'right'];

export function inArea(area: GuardedArea, tile: TilePos): boolean {
  const minX = Math.min(area.from.x, area.to.x);
  const maxX = Math.max(area.from.x, area.to.x);
  const minY = Math.min(area.from.y, area.to.y);
  const maxY = Math.max(area.from.y, area.to.y);
  return tile.x >= minX && tile.x <= maxX && tile.y >= minY && tile.y <= maxY;
}

/**
 * Sentinel: guards its area, moving around inside it. Leaves it to chase the
 * robot once the robot is within the trigger distance; heads back to its start
 * once the robot is out of range and guards again on re-entering the area.
 */
export function updateSentinel(drone: Drone, area: GuardedArea, ctx: DroneContext): void {
  if (inRange(drone, ctx)) drone.mode = 'chasing';
  else if (drone.mode === 'chasing') drone.mode = 'returning';
  moveDrone(drone, ctx, () => {
    if (drone.mode === 'returning' && inArea(area, drone.tile)) drone.mode = 'guarding';
    switch (drone.mode) {
      case 'chasing':
        return nextStepTowards(ctx.deck, drone.tile, ctx.robotTile);
      case 'returning':
        return nextStepTowards(ctx.deck, drone.tile, drone.start);
      default:
        return guardStep(drone, area, ctx);
    }
  });
}

/** The robot is at most the trigger distance away (between the tiles the two are on). */
function inRange(drone: Drone, ctx: DroneContext): boolean {
  const tile = drone.offset > 0.5 ? step(drone.tile, drone.direction) : drone.tile;
  const distance = Math.hypot(tile.x - ctx.robotTile.x, tile.y - ctx.robotTile.y);
  return distance <= ctx.sentinelTriggerDistance + 1e-9;
}

/** Keep going straight while that stays in the area; otherwise turn, reversing only as a last resort. */
function guardStep(drone: Drone, area: GuardedArea, ctx: DroneContext): Direction | null {
  const open = (dir: Direction) => {
    const next = step(drone.tile, dir);
    return inArea(area, next) && !isWall(ctx.deck, next);
  };
  if (open(drone.direction)) return drone.direction;
  const back = opposite(drone.direction);
  return DIRECTIONS.find((dir) => dir !== back && open(dir)) ?? (open(back) ? back : null);
}
