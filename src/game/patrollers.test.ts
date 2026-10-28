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
});
