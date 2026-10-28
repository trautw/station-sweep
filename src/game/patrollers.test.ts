import { describe, expect, it } from 'vitest';
import { createGame, type Game, type LevelRow, type TilePos } from './index';
import { levelRow } from './test-levels';

// Robot speed 6 tiles/s at 60 ticks/s => 10 ticks per tile.
// Drone speed 3 tiles/s => 20 ticks per tile.
const LEVELS: LevelRow[] = [levelRow({ droneSpeed: 3 })];
const DRONE_TICKS_PER_TILE = 20;

function startGame(grid: string[], routes: (readonly [TilePos, ...TilePos[]])[]): Game {
  const result = createGame(
    [{ name: 'test deck', grid, drones: { patrollers: routes.map((route) => ({ route })) } }],
    LEVELS,
  );
  if (!result.ok) throw new Error(result.errors.join('\n'));
  result.game.send({ type: 'start' });
  return result.game;
}

function patroller(game: Game) {
  const found = game.state().drones.find((d) => d.type === 'patroller');
  if (found === undefined) throw new Error('no Patroller on the deck');
  return found;
}

describe('Patrollers', () => {
  it('fly their route in a loop, starting at the first waypoint', () => {
    // The robot is sealed in a pocket behind a wall, so it is never in line of sight.
    const game = startGame(
      [
        '#########',
        '#R#     #',
        '#B# ### #',
        '### ### #',
        '###     #',
        '#########',
      ],
      [[{ x: 3, y: 1 }, { x: 7, y: 1 }, { x: 7, y: 4 }, { x: 3, y: 4 }]],
    );
    expect(patroller(game).tile).toEqual({ x: 3, y: 1 });
    expect(patroller(game).mode).toBe('patrolling');

    game.tick(4 * DRONE_TICKS_PER_TILE);
    expect(patroller(game).position).toEqual({ x: 7, y: 1 });
    game.tick(3 * DRONE_TICKS_PER_TILE);
    expect(patroller(game).position).toEqual({ x: 7, y: 4 });
    game.tick(4 * DRONE_TICKS_PER_TILE);
    expect(patroller(game).position).toEqual({ x: 3, y: 4 });
    // Back to the first waypoint, and round again.
    game.tick(3 * DRONE_TICKS_PER_TILE);
    expect(patroller(game).position).toEqual({ x: 3, y: 1 });
    game.tick(4 * DRONE_TICKS_PER_TILE);
    expect(patroller(game).position).toEqual({ x: 7, y: 1 });
    expect(patroller(game).mode).toBe('patrolling');
  });

  it('start chasing the robot as soon as it has line of sight', () => {
    // The Patroller flies to and fro in row 2. The robot steps down into row 2.
    const game = startGame(
      [
        '#########',
        '#R#####B#',
        '#       #',
        '#########',
      ],
      [[{ x: 7, y: 2 }, { x: 5, y: 2 }]],
    );
    game.tick(30);
    expect(patroller(game).mode).toBe('patrolling');

    game.send({ type: 'direction', direction: 'down' });
    let ticks = 0;
    while (game.state().robot.tile.y !== 2) {
      expect(patroller(game).mode).toBe('patrolling');
      game.tick(1);
      ticks++;
      expect(ticks).toBeLessThan(20);
    }
    // In the very tick the robot enters the row.
    expect(patroller(game).mode).toBe('chasing');

    // It heads straight for the robot, past the end of its route.
    game.tick(2 * DRONE_TICKS_PER_TILE);
    expect(patroller(game).mode).toBe('chasing');
    expect(patroller(game).position.x).toBeLessThan(5);
    expect(patroller(game).direction).toBe('left');
  });

  it('do not see the robot through a wall', () => {
    const grid = (between: string) => [
      '##########',
      `#R ${between}     #`,
      '#B########',
    ];
    const route: [TilePos, TilePos] = [{ x: 8, y: 1 }, { x: 6, y: 1 }];

    const walled = startGame(grid('#'), [route]);
    for (let i = 0; i < 10 * DRONE_TICKS_PER_TILE; i++) {
      walled.tick(1);
      expect(patroller(walled).mode).toBe('patrolling');
    }

    const open = startGame(grid(' '), [route]);
    open.tick(1);
    expect(patroller(open).mode).toBe('chasing');
  });

  it('go back to the nearest waypoint of their route after losing line of sight, and carry on', () => {
    const game = startGame(
      [
        '##########',
        '#R       #',
        '# ########',
        '# ########',
        '#B########',
        '##########',
      ],
      [[{ x: 8, y: 1 }, { x: 6, y: 1 }]],
    );
    // The robot waits in plain sight while the Patroller chases it 3 tiles down the row ...
    game.tick(3 * DRONE_TICKS_PER_TILE);
    expect(patroller(game).mode).toBe('chasing');
    expect(patroller(game).position).toEqual({ x: 5, y: 1 });

    // ... then ducks round the corner.
    game.send({ type: 'direction', direction: 'down' });
    const modes: string[] = [];
    const visited: string[] = [];
    let backOnRoute: TilePos | null = null;
    for (let i = 0; i < 10 * DRONE_TICKS_PER_TILE; i++) {
      game.tick(1);
      const { mode, tile } = patroller(game);
      if (modes.at(-1) !== mode) modes.push(mode);
      if (mode === 'patrolling') {
        backOnRoute ??= tile;
        if (visited.at(-1) !== `${tile.x},${tile.y}`) visited.push(`${tile.x},${tile.y}`);
      }
    }
    expect(game.state().lives).toBe(3);
    expect(modes).toEqual(['chasing', 'returning', 'patrolling']);
    // (6,1) is 2 tiles away, the first waypoint (8,1) 4.
    expect(backOnRoute).toEqual({ x: 6, y: 1 });
    // Then it flies its route again: on to (8,1), back to (6,1), ...
    expect(visited.slice(0, 5)).toEqual(['6,1', '7,1', '8,1', '7,1', '6,1']);
  });
});

describe('Patroller validation', () => {
  it('reports every waypoint that lies in a wall or off the deck', () => {
    const result = createGame(
      [
        {
          name: 'test deck',
          grid: ['######', '#R  B#', '######'],
          drones: {
            patrollers: [
              { route: [{ x: 2, y: 1 }, { x: 3, y: 1 }] },
              { route: [{ x: 2, y: 1 }, { x: 2, y: 0 }, { x: 9, y: 1 }] },
            ],
          },
        },
      ],
      LEVELS,
    );
    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.errors).toEqual([
      'test deck: Patroller 2 waypoint at (2, 0) lies in a wall',
      'test deck: Patroller 2 waypoint at (9, 1) lies in a wall',
    ]);
  });
});
