import { describe, expect, it } from 'vitest';
import { createGame, type DeckDrones, type DroneState, type Game, type LevelRow, type TilePos } from './index';

// Robot 6 tiles/s => 10 ticks per tile; drones 3 tiles/s => 20 ticks per tile.
// Shutdown 2 s; rebuild delay 5 s, long enough for the robot to get into position.
const LEVELS: LevelRow[] = [
  { robotSpeed: 6, droneSpeed: 3, hunterReleaseDelay: 0, shutdownTime: 2, rebuildDelay: 5 },
];
const TICKS_PER_TILE = 10;
const REBUILD_TICKS = 300;

function startGame(grid: string[], drones: DeckDrones, levels: LevelRow[] = LEVELS): Game {
  const result = createGame([{ name: 'test deck', grid, drones }], levels);
  if (!result.ok) throw new Error(result.errors.join('\n'));
  return result.game;
}

function drive(game: Game, direction: 'up' | 'down' | 'left' | 'right', tiles: number) {
  game.send({ type: 'direction', direction });
  game.tick(tiles * TICKS_PER_TILE);
}

const drone = (game: Game): DroneState => game.state().drones[0]!;
const at = (d: DroneState, tile: TilePos) => d.position.x === tile.x && d.position.y === tile.y;

/** The robot (holding the charge, waiting) shuts the drone down and drives into it. */
function salvageDrone(game: Game) {
  game.send({ type: 'triggerEmp' });
  game.tick(1);
  expect(drone(game).mode).toBe('shutdown');
  game.send({ type: 'direction', direction: 'right' });
  while (drone(game).mode === 'shutdown') game.tick(1);
  expect(drone(game).mode).toBe('salvaged');
}

/** Tick until the rebuilt drone has left the drone bay. */
function waitForRebuild(game: Game) {
  for (let i = 0; i < REBUILD_TICKS && drone(game).mode === 'salvaged'; i++) game.tick(1);
  expect(drone(game).mode).not.toBe('salvaged');
}

describe('a rebuilt Patroller', () => {
  // The Patroller starts on waypoint B (9, 1), sees the robot at once and
  // chases it, so B is still the waypoint it was flying to when salvaged.
  // The drone bay (8, 3) is 2 tiles from waypoint A (10, 3) but 5 from B.
  // The robot hides at (1, 2), out of sight of the whole route and the bay.
  const grid = [
    '############',
    '#RE        #',
    '# ######## #',
    '#####   B  #',
    '############',
  ];
  const A = { x: 10, y: 3 };
  const B = { x: 9, y: 1 };
  const drones: DeckDrones = { patrollers: [{ route: [B, A] }] };

  function rebuiltPatroller(): Game {
    const game = startGame(grid, drones);
    drive(game, 'right', 1);
    drive(game, 'left', 1);
    // The Patroller sees the robot and chases it along row 1.
    while (drone(game).position.x > 6) game.tick(1);
    salvageDrone(game);
    game.send({ type: 'direction', direction: 'left' });
    game.send({ type: 'direction', direction: 'down' });
    game.tick(8 * TICKS_PER_TILE);
    expect(game.state().robot.tile).toEqual({ x: 1, y: 2 });
    waitForRebuild(game);
    expect(drone(game)).toMatchObject({ type: 'patroller', mode: 'returning' });
    return game;
  }

  it('flies back to the nearest waypoint of its route and patrols again', () => {
    const game = rebuiltPatroller();
    let backOnRouteAt: TilePos | null = null;
    for (let i = 0; i < 20 * 20 && backOnRouteAt === null; i++) {
      game.tick(1);
      if (drone(game).mode === 'patrolling') backOnRouteAt = drone(game).tile;
      else expect(drone(game).mode).toBe('returning');
    }
    expect(backOnRouteAt).toEqual(A);

    // Patrolling again: on to waypoint B.
    let reachedB = false;
    for (let i = 0; i < 20 * 20 && !reachedB; i++) {
      game.tick(1);
      expect(drone(game).mode).toBe('patrolling');
      reachedB = at(drone(game), B);
    }
    expect(reachedB).toBe(true);
    expect(game.state().lives).toBe(3);
  });
});

describe('a rebuilt Sentinel', () => {
  // The Sentinel guards x 4..6 of row 0. The drone bay (13, 3) is at the end
  // of a side corridor that joins row 0 at (13, 0).
  const grid = [
    '#RE           ##',
    '############# ##',
    '############# ##',
    '#############B##',
    '################',
  ];
  const sentinel = (triggerDistance: number): [DeckDrones, LevelRow[]] => [
    { sentinels: [{ start: { x: 5, y: 0 }, area: { from: { x: 4, y: 0 }, to: { x: 6, y: 0 } } }] },
    [{ ...LEVELS[0]!, sentinelTriggerDistance: triggerDistance }],
  ];
  const inArea = (d: DroneState) => d.tile.y === 0 && d.tile.x >= 4 && d.tile.x <= 6;

  function salvagedSentinel(triggerDistance: number): Game {
    const game = startGame(grid, ...sentinel(triggerDistance));
    drive(game, 'right', 1);
    drive(game, 'left', 1);
    salvageDrone(game);
    return game;
  }

  it('goes back into its guarded area and guards it again', () => {
    const game = salvagedSentinel(1);
    drive(game, 'left', 8); // the robot waits at (1, 0), out of the trigger distance
    waitForRebuild(game);
    expect(drone(game)).toMatchObject({ type: 'sentinel', mode: 'returning', tile: { x: 13, y: 3 } });

    // Shortest way: 3 tiles up and 7 to the left, 10 tiles at 20 ticks per tile.
    let ticks = 0;
    while (drone(game).mode === 'returning' && ticks < 400) {
      game.tick(1);
      ticks++;
    }
    expect(drone(game).mode).toBe('guarding');
    expect(drone(game).tile).toEqual({ x: 6, y: 0 });
    expect(ticks).toBeGreaterThanOrEqual(10 * 20);
    expect(ticks).toBeLessThanOrEqual(10 * 20 + 2);

    for (let i = 0; i < 600; i++) {
      game.tick(1);
      expect(drone(game).mode).toBe('guarding');
      expect(inArea(drone(game))).toBe(true);
    }
  });

  it('catches the robot on its way back', () => {
    // Trigger distance 0.5: the Sentinel never switches to chasing on its way.
    const game = salvagedSentinel(0.5);
    game.tick(12 * TICKS_PER_TILE); // the robot drives on and stops at (13, 0)
    expect(game.state().robot.tile).toEqual({ x: 13, y: 0 });
    waitForRebuild(game);

    let modeBeforeCatch = drone(game).mode;
    while (!game.events().some((e) => e.type === 'robotCaught')) {
      modeBeforeCatch = drone(game).mode;
      game.tick(1);
    }
    expect(modeBeforeCatch).toBe('returning');
    expect(game.state().lives).toBe(2);
  });
});
