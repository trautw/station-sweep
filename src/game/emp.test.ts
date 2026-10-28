import { describe, expect, it } from 'vitest';
import { createGame, type DeckDrones, type Game, type LevelRow } from './index';
import { levelRow } from './test-levels';

// Robot speed 6 tiles/s at 60 ticks/s => 10 ticks per tile.
// Drone speed 3 tiles/s => 20 ticks per tile. Hunters are released at once.
// Shutdown 2 s => 120 ticks; rebuild delay 1 s => 60 ticks.
const LEVELS: LevelRow[] = [
  levelRow({ droneSpeed: 3, hunterReleaseDelay: 0, shutdownTime: 2, rebuildDelay: 1 }),
];
const TICKS_PER_TILE = 10;
const SHUTDOWN_TICKS = 120;
const REBUILD_TICKS = 60;

function startGame(grid: string[], drones: DeckDrones = {}, levels: LevelRow[] = LEVELS): Game {
  const result = createGame([{ name: 'test deck', grid, drones }], levels);
  if (!result.ok) throw new Error(result.errors.join('\n'));
  result.game.send({ type: 'start' });
  return result.game;
}

function drive(game: Game, direction: 'up' | 'down' | 'left' | 'right', tiles: number) {
  game.send({ type: 'direction', direction });
  game.tick(tiles * TICKS_PER_TILE);
}

describe('EMP charges', () => {
  it('are picked up by driving over them', () => {
    const game = startGame(['#RE  B#']);
    expect(game.state().empCharges).toEqual([{ x: 2, y: 0 }]);
    expect(game.state().carriedEmpCharges).toBe(0);

    game.send({ type: 'direction', direction: 'right' });
    game.tick(TICKS_PER_TILE);
    expect(game.state().empCharges).toEqual([]);
    expect(game.state().carriedEmpCharges).toBe(1);
    expect(game.events()).toContainEqual({ type: 'empPickedUp', tile: { x: 2, y: 0 } });
  });

  it('are carried at most two at a time; a third stays where it lies', () => {
    const game = startGame(['#REEE  B#']);
    drive(game, 'right', 5);
    expect(game.state().carriedEmpCharges).toBe(2);
    expect(game.state().empCharges).toEqual([{ x: 4, y: 0 }]);
    expect(game.state().robot.tile.x).toBeGreaterThan(4);
  });

  it('must be reachable from the robot start', () => {
    const result = createGame(
      [{ name: 'walled', grid: ['#R B#E#'] }],
      LEVELS,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual([
        'walled: EMP charge at (5, 0) is not reachable from the robot start',
      ]);
    }
  });
});

describe('triggering an EMP', () => {
  it('does nothing without a carried charge', () => {
    const game = startGame(['#R   B#'], { hunters: 1 });
    game.tick(30);
    game.send({ type: 'triggerEmp' });
    game.tick(1);
    expect(game.events()).toEqual([]);
    expect(game.state().drones.map((d) => d.mode)).toEqual(['hunting']);
  });

  it('uses up one charge and shuts down only the drones within 5 tiles', () => {
    // Hunters leave the bay at x=21 one second apart; the robot picks up the
    // charge and waits at x=1. After 361 ticks the first Hunter is on tile 6
    // (5 tiles away, the edge of the radius), the second on tile 9 (8 away).
    const game = startGame(
      ['#RE' + ' '.repeat(18) + 'B#'],
      { hunters: 2 },
      [levelRow({ droneSpeed: 3, hunterReleaseDelay: 1, shutdownTime: 2, rebuildDelay: 1 })],
    );
    drive(game, 'right', 1);
    drive(game, 'left', 1);
    expect(game.state().robot.tile).toEqual({ x: 1, y: 0 });
    game.tick(361 - 2 * TICKS_PER_TILE);
    expect(game.state().drones.map((d) => d.tile.x)).toEqual([6, 9]);

    game.send({ type: 'triggerEmp' });
    game.tick(1);
    expect(game.events()).toContainEqual({ type: 'empTriggered' });
    expect(game.state().carriedEmpCharges).toBe(0);
    expect(game.state().drones.map((d) => d.mode)).toEqual(['shutdown', 'hunting']);
  });

  it('takes its radius from the level table', () => {
    // Same setup as above, but with radius 3 the Hunter 5 tiles away is missed.
    const game = startGame(
      ['#RE' + ' '.repeat(18) + 'B#'],
      { hunters: 2 },
      [levelRow({ droneSpeed: 3, hunterReleaseDelay: 1, shutdownTime: 2, rebuildDelay: 1, empRadius: 3 })],
    );
    drive(game, 'right', 1);
    drive(game, 'left', 1);
    game.tick(361 - 2 * TICKS_PER_TILE);
    expect(game.state().drones.map((d) => d.tile.x)).toEqual([6, 9]);

    game.send({ type: 'triggerEmp' });
    game.tick(1);
    expect(game.events()).toContainEqual({ type: 'empTriggered' });
    expect(game.state().drones.map((d) => d.mode)).toEqual(['hunting', 'hunting']);
  });
});

/**
 * The robot picks up the charge at x=2 and backs up to x=1; Hunters leave the
 * bay at x=6 at once and are 4 tiles away when the EMP goes off.
 */
function shutDownHuntersNextToRobot(hunters: number): Game {
  const game = startGame(['#RE   B#'], { hunters });
  drive(game, 'right', 1);
  drive(game, 'left', 1);
  game.send({ type: 'triggerEmp' });
  game.tick(1);
  expect(game.state().drones.every((d) => d.mode === 'shutdown')).toBe(true);
  return game;
}

describe('shut-down drones', () => {
  it('stand still and tell how much shutdown time is left', () => {
    const game = shutDownHuntersNextToRobot(1);
    const where = game.state().drones[0]!.position;
    expect(game.state().drones[0]!.shutdownTimeLeft).toBeCloseTo((SHUTDOWN_TICKS - 1) / 60);

    game.tick(SHUTDOWN_TICKS - 2);
    expect(game.state().drones[0]!.position).toEqual(where);
    expect(game.state().drones[0]!.mode).toBe('shutdown');
    expect(game.state().drones[0]!.shutdownTimeLeft).toBeCloseTo(1 / 60);
  });

  it('wake up after the shutdown time and carry on hunting', () => {
    const game = shutDownHuntersNextToRobot(1);
    const where = game.state().drones[0]!.position;
    game.tick(SHUTDOWN_TICKS - 1);
    expect(game.state().drones[0]!.mode).toBe('hunting');
    expect(game.state().drones[0]!.shutdownTimeLeft).toBe(0);
    game.tick(1);
    expect(game.state().drones[0]!.position.x).toBeLessThan(where.x);
  });

  it('cannot catch the robot', () => {
    const game = shutDownHuntersNextToRobot(1);
    drive(game, 'right', 4);
    expect(game.state().lives).toBe(3);
    expect(game.state().robot.tile.x).toBeGreaterThan(4);
  });
});

describe('salvaging', () => {
  it('happens when the robot drives into a shut-down drone, scoring 250, 500, 750 within one EMP', () => {
    const game = shutDownHuntersNextToRobot(3);
    const salvages: unknown[] = [];
    for (let i = 0; i < 4 * TICKS_PER_TILE && salvages.length < 3; i++) {
      if (i === 0) game.send({ type: 'direction', direction: 'right' });
      game.tick(1);
      salvages.push(...game.events().filter((e) => e.type === 'droneSalvaged'));
    }
    expect(salvages.map((e) => (e as { points: number }).points)).toEqual([250, 500, 750]);
    expect(game.state().score).toBe(1500);
    expect(game.state().lives).toBe(3);
    expect(game.state().drones.map((d) => d.mode)).toEqual(['salvaged', 'salvaged', 'salvaged']);
  });

  it('starts a new chain with every EMP', () => {
    // Two charges; the Hunters are released 1 s apart and shut down one at a time.
    const game = startGame(['#REE  B#'], { hunters: 2 }, [
      levelRow({ droneSpeed: 3, hunterReleaseDelay: 1, shutdownTime: 2, rebuildDelay: 5 }),
    ]);
    drive(game, 'right', 2);
    drive(game, 'left', 2);
    expect(game.state().carriedEmpCharges).toBe(2);
    const points: number[] = [];
    const salvageWhenClose = (index: number) => {
      while (game.state().drones[index]!.mode !== 'hunting') game.tick(1);
      game.tick(TICKS_PER_TILE);
      game.send({ type: 'triggerEmp' });
      game.tick(1);
      expect(game.state().drones[index]!.mode).toBe('shutdown');
      game.send({ type: 'direction', direction: 'right' });
      while (game.state().drones[index]!.mode === 'shutdown') {
        game.tick(1);
        for (const e of game.events()) if (e.type === 'droneSalvaged') points.push(e.points);
      }
      drive(game, 'left', 5);
    };
    salvageWhenClose(0);
    salvageWhenClose(1);
    expect(points).toEqual([250, 250]);
  });

  it('counts a salvage in the chain of the EMP that shut the drone down, even after a later EMP', () => {
    // Two Sentinels that stand still (one-tile guarded areas) at x=10 and x=14.
    // EMP 1 at x=9 shuts down both; the robot salvages the first, backs off
    // more than 5 tiles from the second, triggers EMP 2 (which misses it) and
    // then salvages the second: still the second salvage of EMP 1.
    const post = (x: number) => ({ start: { x, y: 0 }, area: { from: { x, y: 0 }, to: { x, y: 0 } } });
    const game = startGame(
      ['#REE' + ' '.repeat(16) + 'B#'],
      { sentinels: [post(10), post(14)] },
      [{ ...LEVELS[0]!, shutdownTime: 10, rebuildDelay: 30, sentinelTriggerDistance: 0 }],
    );
    const points: number[] = [];
    const tickUntil = (done: () => boolean) => {
      while (!done()) {
        game.tick(1);
        for (const e of game.events()) if (e.type === 'droneSalvaged') points.push(e.points);
      }
    };
    const robotX = () => game.state().robot.tile.x;
    const mode = (i: number) => game.state().drones[i]!.mode;

    game.send({ type: 'direction', direction: 'right' });
    tickUntil(() => robotX() === 9);
    game.send({ type: 'triggerEmp' });
    tickUntil(() => mode(0) === 'shutdown');
    expect(mode(1)).toBe('shutdown');
    tickUntil(() => mode(0) === 'salvaged');

    game.send({ type: 'direction', direction: 'left' });
    tickUntil(() => robotX() <= 8);
    game.send({ type: 'triggerEmp' });
    game.tick(1);
    expect(game.events()).toContainEqual({ type: 'empTriggered' });

    game.send({ type: 'direction', direction: 'right' });
    tickUntil(() => mode(1) === 'salvaged');
    expect(points).toEqual([250, 500]);
  });

  it('sends a Hunter to the drone bay, where it is rebuilt after the delay and hunts again', () => {
    const game = shutDownHuntersNextToRobot(1);
    game.send({ type: 'direction', direction: 'right' });
    while (!game.events().some((e) => e.type === 'droneSalvaged')) game.tick(1);
    drive(game, 'left', 3);
    const bay = { x: 6, y: 0 };
    const ticksSinceSalvage = 3 * TICKS_PER_TILE;
    expect(game.state().drones[0]).toMatchObject({ mode: 'salvaged', tile: bay });

    game.tick(REBUILD_TICKS - ticksSinceSalvage - 1);
    expect(game.state().drones[0]).toMatchObject({ mode: 'salvaged', position: bay });
    game.tick(1);
    expect(game.state().drones[0]!.mode).toBe('hunting');
    game.tick(1);
    expect(game.state().drones[0]!.position.x).toBeLessThan(bay.x);
  });
});

describe('EMP on Patrollers', () => {
  it('shuts one down so the robot can salvage it for 250 points', () => {
    // The Patroller starts at x=6 and chases the robot along the row; it is
    // 4 tiles away when the robot (back at x=1 with the charge) triggers.
    const game = startGame(['#RE           B#'], {
      patrollers: [{ route: [{ x: 6, y: 0 }, { x: 10, y: 0 }] }],
    });
    drive(game, 'right', 1);
    drive(game, 'left', 1);
    game.send({ type: 'triggerEmp' });
    game.tick(1);
    expect(game.state().drones[0]!.mode).toBe('shutdown');

    game.send({ type: 'direction', direction: 'right' });
    while (game.state().drones[0]!.mode === 'shutdown') game.tick(1);
    expect(game.events()).toContainEqual(
      expect.objectContaining({ type: 'droneSalvaged', points: 250 }),
    );
    expect(game.state().lives).toBe(3);
  });
});

describe('EMP on Sentinels', () => {
  // The Sentinel guards x 4..6; the robot picks up the charge and waits at x=1.
  const grid = ['#RE           B#'];
  const drones: DeckDrones = {
    sentinels: [{ start: { x: 5, y: 0 }, area: { from: { x: 4, y: 0 }, to: { x: 6, y: 0 } } }],
  };
  const levels: LevelRow[] = [{ ...LEVELS[0]!, sentinelTriggerDistance: 1 }];

  function shutDownSentinel(): Game {
    const game = startGame(grid, drones, levels);
    drive(game, 'right', 1);
    drive(game, 'left', 1);
    game.send({ type: 'triggerEmp' });
    game.tick(1);
    expect(game.state().drones[0]!.mode).toBe('shutdown');
    return game;
  }

  it('shuts it down; it wakes up guarding again', () => {
    const game = shutDownSentinel();
    game.tick(SHUTDOWN_TICKS - 1);
    expect(game.state().drones[0]!.mode).toBe('guarding');
  });

  it('lets the robot salvage it for 250 points', () => {
    const game = shutDownSentinel();
    game.send({ type: 'direction', direction: 'right' });
    while (game.state().drones[0]!.mode === 'shutdown') game.tick(1);
    expect(game.events()).toContainEqual(
      expect.objectContaining({ type: 'droneSalvaged', points: 250 }),
    );
    expect(game.state().drones[0]).toMatchObject({ mode: 'salvaged', tile: { x: 14, y: 0 } });
    expect(game.state().lives).toBe(3);
  });
});
