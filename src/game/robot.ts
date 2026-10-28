import { airlockPartner, isWall, type Deck } from './deck';
import { delta, opposite, step } from './grid';
import type { Direction, RobotState, TilePos } from './types';

const EPSILON = 1e-6;

/**
 * Mutable robot model. The robot is always "on" `tile`; while moving it is
 * `offset` (0..1) of the way from that tile's centre towards the next tile in
 * `direction`.
 */
export interface Robot {
  tile: TilePos;
  offset: number;
  direction: Direction;
  moving: boolean;
  bufferedTurn: Direction | null;
}

export function createRobot(start: TilePos): Robot {
  return { tile: start, offset: 0, direction: 'left', moving: false, bufferedTurn: null };
}

export function giveDirection(robot: Robot, dir: Direction): void {
  // Reversing is always possible at once: the robot just came from there.
  if (robot.moving && dir === opposite(robot.direction)) {
    if (robot.offset > 0) {
      robot.tile = step(robot.tile, robot.direction);
      robot.offset = 1 - robot.offset;
    }
    robot.direction = dir;
    robot.bufferedTurn = null;
    return;
  }
  robot.bufferedTurn = dir;
}

/** Move the robot by `distance` tiles along corridors. */
export function moveRobot(robot: Robot, deck: Deck, distance: number): void {
  let remaining = distance;
  while (remaining > EPSILON) {
    if (robot.offset === 0) {
      // At a tile centre: take the buffered turn if this tile allows it.
      const turn = robot.bufferedTurn;
      if (turn !== null && !isWall(deck, step(robot.tile, turn))) {
        robot.direction = turn;
        robot.bufferedTurn = null;
        robot.moving = true;
      }
      // A stopped robot stays put until it gets a direction it can take.
      if (!robot.moving || isWall(deck, step(robot.tile, robot.direction))) {
        robot.moving = false;
        return;
      }
    }
    const advance = Math.min(remaining, 1 - robot.offset);
    robot.offset += advance;
    remaining -= advance;
    if (robot.offset >= 1 - EPSILON) {
      robot.tile = step(robot.tile, robot.direction);
      robot.offset = 0;
      // Entering an airlock: leave through its partner, keeping the direction.
      robot.tile = airlockPartner(deck, robot.tile) ?? robot.tile;
    }
  }
}

export function robotSnapshot(robot: Robot): RobotState {
  const d = delta(robot.direction);
  return {
    position: { x: robot.tile.x + d.x * robot.offset, y: robot.tile.y + d.y * robot.offset },
    tile: robot.offset > 0.5 ? step(robot.tile, robot.direction) : robot.tile,
    direction: robot.direction,
    moving: robot.moving,
    bufferedTurn: robot.bufferedTurn,
  };
}
