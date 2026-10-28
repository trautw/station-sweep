import { airlockPartner, type Deck } from './deck';
import { isWall, opposite, step } from './grid';
import { advance, nearestTile, position, type Mover } from './mover';
import type { Direction, RobotState, TilePos } from './types';

/** Mutable robot model; see Mover for `tile`, `offset` and `direction`. */
export interface Robot extends Mover {
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

/** Move the robot by `distance` tiles along corridors. Returns true if it jumped through an airlock. */
export function moveRobot(robot: Robot, deck: Deck, distance: number): boolean {
  let jumped = false;
  const atCentre = () => {
    // Take the buffered turn if this tile allows it.
    const turn = robot.bufferedTurn;
    if (turn !== null && !isWall(deck, step(robot.tile, turn))) {
      robot.direction = turn;
      robot.bufferedTurn = null;
      robot.moving = true;
    }
    // A stopped robot stays put until it gets a direction it can take.
    if (!robot.moving || isWall(deck, step(robot.tile, robot.direction))) {
      robot.moving = false;
      return false;
    }
    return true;
  };
  const arrived = () => {
    // Entering an airlock: leave through its partner, keeping the direction.
    const partner = airlockPartner(deck, robot.tile);
    if (partner !== null) {
      robot.tile = partner;
      jumped = true;
    }
  };
  advance(robot, distance, atCentre, arrived);
  return jumped;
}

/** The tile the robot is on (nearest tile centre). */
export function robotTile(robot: Robot): TilePos {
  return nearestTile(robot);
}

/** Smooth robot position in tile units. */
export function robotPosition(robot: Robot): TilePos {
  return position(robot);
}

export function robotSnapshot(robot: Robot): RobotState {
  return {
    position: robotPosition(robot),
    tile: robotTile(robot),
    direction: robot.direction,
    moving: robot.moving,
    bufferedTurn: robot.bufferedTurn,
  };
}
