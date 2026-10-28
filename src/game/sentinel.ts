import { droneTile, moveDrone, type DroneContext, type Sentinel } from './drone';
import { DIRECTIONS, isWall, opposite, step } from './grid';
import { nextStepTowards } from './path';
import type { Direction, GuardedArea, TilePos } from './types';

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
export function updateSentinel(drone: Sentinel, ctx: DroneContext): void {
  const area = drone.area;
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
function inRange(drone: Sentinel, ctx: DroneContext): boolean {
  const tile = droneTile(drone);
  const distance = Math.hypot(tile.x - ctx.robotTile.x, tile.y - ctx.robotTile.y);
  return distance <= ctx.sentinelTriggerDistance + 1e-9;
}

/** Keep going straight while that stays in the area; otherwise turn, reversing only as a last resort. */
function guardStep(drone: Sentinel, area: GuardedArea, ctx: DroneContext): Direction | null {
  const open = (dir: Direction) => {
    const next = step(drone.tile, dir);
    return inArea(area, next) && !isWall(ctx.deck, next);
  };
  if (open(drone.direction)) return drone.direction;
  const back = opposite(drone.direction);
  return DIRECTIONS.find((dir) => dir !== back && open(dir)) ?? (open(back) ? back : null);
}
