import { describe, expect, it } from 'vitest';
import { createGame, type DroneState, type Game, type LevelRow, type SentinelDefinition } from './index';
import { levelRow } from './test-levels';

// Robot speed 6 tiles/s => 10 ticks per tile. Drone speed 3 tiles/s => 20 ticks per tile.
const levels = (sentinelTriggerDistance: number): LevelRow[] => [
  levelRow({ droneSpeed: 3, sentinelTriggerDistance }),
];

// A long two-row hall. The guarded area is its right end, x 12..16.
const HALL = [
  '##################',
  '#R              B#',
  '#                #',
  '##################',
];
const AREA = { from: { x: 12, y: 1 }, to: { x: 16, y: 2 } };
const HALL_SENTINEL: SentinelDefinition = { start: { x: 14, y: 1 }, area: AREA };

function startGame(
  grid: string[],
  sentinels: SentinelDefinition[],
  levelTable: LevelRow[],
): Game {
  const result = createGame([{ name: 'test deck', grid, drones: { sentinels } }], levelTable);
  if (!result.ok) throw new Error(result.errors.join('\n'));
  result.game.send({ type: 'start' });
  return result.game;
}

function sentinel(game: Game): DroneState {
  const found = game.state().drones.find((d) => d.type === 'sentinel');
  if (found === undefined) throw new Error('no sentinel');
  return found;
}

const inArea = (p: { x: number; y: number }) =>
  p.x >= AREA.from.x && p.x <= AREA.to.x && p.y >= AREA.from.y && p.y <= AREA.to.y;

describe('Sentinels', () => {
  it('start on their start tile', () => {
    const game = startGame(HALL, [HALL_SENTINEL], levels(3));
    expect(sentinel(game).tile).toEqual({ x: 14, y: 1 });
    expect(sentinel(game).mode).toBe('guarding');
  });

  it('move around inside their guarded area while the robot is far away', () => {
    // The robot never moves from x=1; the area starts at x=12, far beyond 3 tiles.
    const game = startGame(HALL, [HALL_SENTINEL], levels(3));
    const visited = new Set<string>();
    for (let i = 0; i < 1200; i++) {
      game.tick(1);
      const s = sentinel(game);
      expect(s.mode).toBe('guarding');
      expect(inArea(s.position)).toBe(true);
      visited.add(`${s.tile.x},${s.tile.y}`);
    }
    expect(visited.size).toBeGreaterThan(3);
    expect(game.state().lives).toBe(3);
  });

  // The robot waits at x=7, exactly 5 tiles from the nearest area tile (12, 1).
  const NEAR_HALL = [
    '##################',
    '#      R        B#',
    '#                #',
    '##################',
  ];

  it('leave their area and chase the robot once it is within the trigger distance', () => {
    const game = startGame(NEAR_HALL, [HALL_SENTINEL], levels(5));
    let leftArea = false;
    for (let i = 0; i < 600 && game.state().lives === 3; i++) {
      game.tick(1);
      if (sentinel(game).mode === 'chasing' && !inArea(sentinel(game).position)) leftArea = true;
    }
    expect(leftArea).toBe(true);
    expect(game.state().lives).toBe(2);
  });

  it('stay in their area while the robot is just outside the trigger distance', () => {
    const game = startGame(NEAR_HALL, [HALL_SENTINEL], levels(4.9));
    for (let i = 0; i < 1200; i++) {
      game.tick(1);
      expect(sentinel(game).mode).toBe('guarding');
      expect(inArea(sentinel(game).position)).toBe(true);
    }
    expect(game.state().lives).toBe(3);
  });

  it('return to their area and guard it again once the robot is out of range', () => {
    const game = startGame(NEAR_HALL, [HALL_SENTINEL], levels(5));
    const tickUntil = (done: () => boolean) => {
      for (let i = 0; i < 1200; i++) {
        game.tick(1);
        if (done()) return;
      }
      throw new Error('timed out');
    };
    // Bait the Sentinel two tiles out of its area, then run away to the left.
    tickUntil(() => sentinel(game).position.x <= 10);
    expect(sentinel(game).mode).toBe('chasing');
    game.send({ type: 'direction', direction: 'left' });

    tickUntil(() => sentinel(game).mode === 'returning');
    expect(inArea(sentinel(game).position)).toBe(false);

    tickUntil(() => sentinel(game).mode === 'guarding');
    expect(inArea(sentinel(game).position)).toBe(true);

    for (let i = 0; i < 600; i++) {
      game.tick(1);
      expect(sentinel(game).mode).toBe('guarding');
      expect(inArea(sentinel(game).position)).toBe(true);
    }
    expect(game.state().robot.tile).toEqual({ x: 1, y: 1 });
    expect(game.state().lives).toBe(3);
  });
});

describe('Sentinel validation', () => {
  function errorsFor(sentinels: SentinelDefinition[]): readonly string[] {
    const result = createGame(
      [{ name: 'test deck', grid: HALL, drones: { sentinels } }],
      levels(3),
    );
    return result.ok ? [] : result.errors;
  }

  it('accepts a guarded area with corridor tiles and a corridor start inside it', () => {
    expect(errorsFor([HALL_SENTINEL])).toEqual([]);
  });

  it('reports a guarded area that contains no corridor tile', () => {
    // Row 0 is all wall.
    const area = { from: { x: 3, y: 0 }, to: { x: 6, y: 0 } };
    expect(errorsFor([{ start: { x: 3, y: 0 }, area }])).toContain(
      'test deck: Sentinel 1: guarded area (3, 0)-(6, 0) contains no corridor tile',
    );
  });

  it('reports a Sentinel that starts on a wall tile', () => {
    // The area includes the wall row 0; the start (13, 0) is a wall.
    const area = { from: { x: 12, y: 0 }, to: { x: 16, y: 2 } };
    expect(errorsFor([HALL_SENTINEL, { start: { x: 13, y: 0 }, area }])).toEqual([
      'test deck: Sentinel 2: start (13, 0) is a wall tile',
    ]);
  });

  it('reports a Sentinel that starts outside its guarded area', () => {
    expect(errorsFor([{ start: { x: 5, y: 1 }, area: AREA }])).toEqual([
      'test deck: Sentinel 1: start (5, 1) is outside its guarded area (12, 1)-(16, 2)',
    ]);
  });
});

describe('catching around a corner', () => {
  it('happens when the robot and a Sentinel swap positions while the Sentinel turns at a junction', () => {
    // The Sentinel guards the L-shaped corner (2,1)-(3,3) and only chases on
    // its own tile. Robot 0.8 tiles per tick, Sentinel 0.72. In the third tick
    // the robot drives right from x=2.6 to x=3.4 while the Sentinel comes up
    // the column from y=1.56, turns left at (3,1) and ends at x=2.84: they pass
    // through each other although both tick ends are more than half a tile apart.
    const grid = ['#########', '#R      #', '### #####', '### #####', '### #####', '###  B###', '#########'];
    const corner: SentinelDefinition = {
      start: { x: 3, y: 3 },
      area: { from: { x: 2, y: 1 }, to: { x: 3, y: 3 } },
    };
    const game = startGame(grid, [corner], [
      levelRow({ robotSpeed: 48, droneSpeed: 43.2, sentinelTriggerDistance: 0 }),
    ]);
    game.send({ type: 'direction', direction: 'right' });
    game.tick(2);
    expect(game.state().robot.position.x).toBeCloseTo(2.6);
    expect(sentinel(game).position.y).toBeCloseTo(1.56);
    expect(game.state().lives).toBe(3);

    game.tick(1);
    expect(game.events()).toEqual([{ type: 'robotCaught' }]);
    expect(game.state().lives).toBe(2);
  });
});
