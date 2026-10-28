import { describe, expect, it } from 'vitest';
import { createGame, type Game, type LevelRow } from './index';

// Robot speed 6 tiles/s at 60 ticks/s => 10 ticks per tile.
// Drone speed 3 tiles/s => 20 ticks per tile. Release delay 1 s => 60 ticks.
const LEVELS: LevelRow[] = [{ robotSpeed: 6, droneSpeed: 3, hunterReleaseDelay: 1 }];
const RELEASE_TICKS = 60;
const DRONE_TICKS_PER_TILE = 20;

function startGame(grid: string[], hunters: number, levels: LevelRow[] = LEVELS): Game {
  const result = createGame([{ name: 'test deck', grid, drones: { hunters } }], levels);
  if (!result.ok) throw new Error(result.errors.join('\n'));
  result.game.send({ type: 'start' });
  return result.game;
}

/** Tick one at a time until the robot is caught; fails after `limit` ticks. */
function tickUntilCaught(game: Game, limit = 1000) {
  for (let i = 0; i < limit; i++) {
    game.tick(1);
    if (game.events().some((e) => e.type === 'robotCaught')) return;
  }
  throw new Error('robot was never caught');
}

function hunterTiles(game: Game) {
  return game.state().drones.filter((d) => d.type === 'hunter').map((d) => d.tile);
}

describe('Hunters', () => {
  it('wait in the drone bay and are released one after another after the delay', () => {
    const game = startGame(
      [
        '#########',
        '#R     B#',
        '#########',
      ],
      2,
    );
    const bay = { x: 7, y: 1 };
    expect(hunterTiles(game)).toEqual([bay, bay]);
    expect(game.state().drones.map((d) => d.mode)).toEqual(['waiting', 'waiting']);

    game.tick(RELEASE_TICKS - 1);
    expect(game.state().drones.map((d) => d.mode)).toEqual(['waiting', 'waiting']);
    expect(hunterTiles(game)).toEqual([bay, bay]);

    game.tick(1);
    expect(game.state().drones.map((d) => d.mode)).toEqual(['hunting', 'waiting']);

    game.tick(RELEASE_TICKS - 1);
    expect(game.state().drones.map((d) => d.mode)).toEqual(['hunting', 'waiting']);
    expect(game.state().drones[0]?.position.x).toBeLessThan(bay.x);
    expect(game.state().drones[1]?.position).toEqual(bay);

    game.tick(1);
    expect(game.state().drones.map((d) => d.mode)).toEqual(['hunting', 'hunting']);
  });

  it('head for the robot along the shortest path', () => {
    // The robot waits at (7,1). Going right from the bay takes 5 tiles,
    // going left around the wall block takes 11.
    const game = startGame(
      [
        '#########',
        '#      R#',
        '# ##### #',
        '#   B   #',
        '#########',
      ],
      1,
    );
    game.tick(RELEASE_TICKS + 2 * DRONE_TICKS_PER_TILE);
    expect(hunterTiles(game)).toEqual([{ x: 6, y: 3 }]);
    game.tick(2 * DRONE_TICKS_PER_TILE);
    expect(hunterTiles(game)).toEqual([{ x: 7, y: 2 }]);
  });

  it('are slower than the robot, even when the level table says otherwise', () => {
    const game = startGame(
      ['#BR                         #'],
      1,
      [{ robotSpeed: 6, droneSpeed: 10, hunterReleaseDelay: 0.5 }],
    );
    game.send({ type: 'direction', direction: 'right' });
    game.tick(30);
    const gap = () => game.state().robot.position.x - game.state().drones[0]!.position.x;
    const gapAtRelease = gap();
    game.tick(60);
    expect(game.state().drones[0]!.position.x).toBeGreaterThan(2);
    expect(gap()).toBeGreaterThan(gapAtRelease);
  });
});

describe('drones', () => {
  it('pass through each other instead of blocking each other', () => {
    // Released together, both Hunters share the same tiles all the way.
    const game = startGame(['#R     B#'], 2, [
      { robotSpeed: 6, droneSpeed: 3, hunterReleaseDelay: 0 },
    ]);
    game.tick(3 * DRONE_TICKS_PER_TILE);
    const [a, b] = game.state().drones;
    expect(a!.position).toEqual({ x: 4, y: 0 });
    expect(b!.position).toEqual(a!.position);
  });
});

describe('getting caught', () => {
  // The robot waits at x=1; the Hunter is released at tick 60 and covers
  // 0.05 tiles per tick, so after k ticks of movement it is 5 - 0.05k tiles away.
  const corridor = ['#R    B#'];
  const ticksUntilGap = (gap: number) => RELEASE_TICKS - 1 + Math.round((5 - gap) / 0.05);

  it('happens when an active drone overlaps the robot by more than half a tile', () => {
    const game = startGame(corridor, 1);
    game.tick(ticksUntilGap(0.5));
    expect(game.state().lives).toBe(3);
    expect(game.events()).toEqual([]);

    game.tick(1);
    expect(game.state().lives).toBe(2);
    expect(game.events()).toEqual([{ type: 'robotCaught' }]);
  });

  it('costs a life and puts the robot and all drones back at their start positions', () => {
    const game = startGame(
      [
        '#########',
        '#R     B#',
        '#########',
      ],
      2,
    );
    game.tick(RELEASE_TICKS);
    game.send({ type: 'direction', direction: 'right' });
    tickUntilCaught(game);
    expect(game.state().lives).toBe(2);

    const { robot, drones } = game.state();
    expect(robot.tile).toEqual({ x: 1, y: 1 });
    expect(robot.moving).toBe(false);
    expect(robot.bufferedTurn).toBeNull();
    expect(drones.map((d) => [d.mode, d.position])).toEqual([
      ['waiting', { x: 7, y: 1 }],
      ['waiting', { x: 7, y: 1 }],
    ]);

    // The release delay starts again after the reset.
    game.tick(RELEASE_TICKS - 1);
    expect(game.state().drones.map((d) => d.mode)).toEqual(['waiting', 'waiting']);
    game.tick(1);
    expect(game.state().drones.map((d) => d.mode)).toEqual(['hunting', 'waiting']);
  });

  it('keeps collected energy cells collected', () => {
    const game = startGame(['#.R..    B#'], 1);
    game.send({ type: 'direction', direction: 'right' });
    tickUntilCaught(game);
    expect(game.state().lives).toBe(2);
    expect(game.state().energyCells).toEqual([{ x: 1, y: 0 }]);
    expect(game.state().score).toBe(20);
    expect(game.state().robot.tile).toEqual({ x: 2, y: 0 });
  });

  it('does not happen when the robot jumps through an airlock past a drone', () => {
    // The robot enters airlock 1 at x=1 and comes out at x=10, beyond the Hunter.
    const game = startGame(['#1R   B   1#'], 1, [
      { robotSpeed: 6, droneSpeed: 3, hunterReleaseDelay: 0 },
    ]);
    game.send({ type: 'direction', direction: 'left' });
    game.tick(12);
    expect(game.state().robot.position.x).toBeGreaterThan(9);
    expect(game.state().drones[0]!.position.x).toBeLessThan(6);
    expect(game.state().lives).toBe(3);
  });

  it('never happens with a drone still waiting in the drone bay', () => {
    const game = startGame(['#R B#'], 1, [{ robotSpeed: 6, droneSpeed: 3, hunterReleaseDelay: 10 }]);
    game.send({ type: 'direction', direction: 'right' });
    game.tick(60);
    expect(game.state().robot.tile).toEqual({ x: 3, y: 0 });
    expect(game.state().lives).toBe(3);
  });

  it('happens when the robot and a drone swap positions within one tick', () => {
    // Robot 1 tile per tick, Hunter 0.5 tiles per tick, released in the first tick.
    const game = startGame(['#R    B#'], 1, [
      { robotSpeed: 60, droneSpeed: 30, hunterReleaseDelay: 0 },
    ]);
    game.send({ type: 'direction', direction: 'right' });
    game.tick(3);
    // Robot at x=4, Hunter at x=4.5: exactly half a tile apart, not caught yet.
    expect(game.state().robot.position.x).toBeCloseTo(4);
    expect(game.state().drones[0]!.position.x).toBeCloseTo(4.5);
    expect(game.state().lives).toBe(3);

    // Next tick the robot moves to x=5 and the Hunter to x=4: they pass through each other.
    game.tick(1);
    expect(game.state().lives).toBe(2);
    expect(game.events()).toEqual([{ type: 'robotCaught' }]);
  });
});

describe('lives', () => {
  it('start at 3', () => {
    const game = startGame(['#R B#'], 1);
    expect(game.state().lives).toBe(3);
    expect(game.state().phase).toBe('playing');
  });

  it('running out ends the game', () => {
    const game = startGame(['#R    B#'], 1);
    tickUntilCaught(game);
    tickUntilCaught(game);
    expect(game.state().lives).toBe(1);
    expect(game.state().phase).toBe('playing');

    tickUntilCaught(game);
    expect(game.state().lives).toBe(0);
    expect(game.state().phase).toBe('gameOver');
    expect(game.events()).toEqual([{ type: 'robotCaught' }, { type: 'gameOver' }]);

    // Nothing moves any more once the game is over.
    const frozen = game.state();
    game.send({ type: 'direction', direction: 'right' });
    game.tick(120);
    expect(game.state().robot).toEqual(frozen.robot);
    expect(game.state().drones).toEqual(frozen.drones);
    expect(game.events()).toEqual([]);
  });
});
