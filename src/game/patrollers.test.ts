import { describe, expect, it } from 'vitest';
import { createGame, type Game, type LevelRow, type TilePos } from './index';

// Robot speed 6 tiles/s at 60 ticks/s => 10 ticks per tile.
// Drone speed 3 tiles/s => 20 ticks per tile.
const LEVELS: LevelRow[] = [{ robotSpeed: 6, droneSpeed: 3 }];
const DRONE_TICKS_PER_TILE = 20;

function startGame(grid: string[], routes: (readonly [TilePos, ...TilePos[]])[]): Game {
  const result = createGame(
    [{ name: 'test deck', grid, drones: { patrollers: routes.map((route) => ({ route })) } }],
    LEVELS,
  );
  if (!result.ok) throw new Error(result.errors.join('\n'));
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
});
