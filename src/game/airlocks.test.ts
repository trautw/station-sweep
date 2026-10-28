import { describe, expect, it } from 'vitest';
import { createGame, type Game } from './index';
import { levelRow } from './test-levels';

// Robot speed 6 tiles/s at 60 ticks/s => exactly 10 ticks per tile.
const TICKS_PER_TILE = 10;

function startGame(grid: string[]): Game {
  const result = createGame([{ name: 'test deck', grid }], [levelRow()]);
  if (!result.ok) throw new Error(result.errors.join('\n'));
  result.game.send({ type: 'start' });
  return result.game;
}

describe('airlocks', () => {
  it('moves the robot entering an airlock out through its partner, keeping its direction', () => {
    const game = startGame([
      '##########',
      '#R 1##1  #',
      '#B########',
      '##########',
    ]);
    game.send({ type: 'direction', direction: 'right' });
    game.tick(2 * TICKS_PER_TILE);
    expect(game.state().robot.tile).toEqual({ x: 6, y: 1 });
    expect(game.state().robot.direction).toBe('right');

    game.tick(10 * TICKS_PER_TILE);
    expect(game.state().robot.tile).toEqual({ x: 8, y: 1 });
    expect(game.state().robot.moving).toBe(false);
  });

  it('works both ways: turning back sends the robot through the same pair again', () => {
    const game = startGame([
      '##########',
      '#R 1##1  #',
      '#B########',
      '##########',
    ]);
    game.send({ type: 'direction', direction: 'right' });
    game.tick(4 * TICKS_PER_TILE); // through the airlock, stopped at (8, 1)
    game.send({ type: 'direction', direction: 'left' });
    game.tick(2 * TICKS_PER_TILE);
    expect(game.state().robot.tile).toEqual({ x: 3, y: 1 });
    expect(game.state().robot.direction).toBe('left');

    game.tick(TICKS_PER_TILE);
    expect(game.state().robot.tile).toEqual({ x: 2, y: 1 });
  });

  it('lists the airlock pairs in the state so they can be drawn', () => {
    const game = startGame([
      '###########',
      '#R1 2##2 1#',
      '#B#########',
      '###########',
    ]);
    expect(game.state().deck.airlocks).toEqual([
      { digit: 1, tiles: [{ x: 2, y: 1 }, { x: 9, y: 1 }] },
      { digit: 2, tiles: [{ x: 4, y: 1 }, { x: 7, y: 1 }] },
    ]);
  });
});

describe('airlock validation', () => {
  function errorsFor(grid: string[]): readonly string[] {
    const result = createGame([{ name: 'test deck', grid }], [levelRow()]);
    return result.ok ? [] : result.errors;
  }

  it('reports an airlock digit that appears only once', () => {
    expect(
      errorsFor([
        '#######',
        '#R 3 B#',
        '#######',
      ]),
    ).toEqual(["test deck: airlock '3' must appear exactly twice: found 1 at (3, 1)"]);
  });

  it('reports an airlock digit that appears three times', () => {
    expect(
      errorsFor([
        '#######',
        '#R4B44#',
        '#######',
      ]),
    ).toEqual(["test deck: airlock '4' must appear exactly twice: found 3 at (2, 1), (4, 1), (5, 1)"]);
  });

  it('counts an energy cell reachable only through an airlock as reachable', () => {
    expect(
      errorsFor([
        '#######',
        '#R B 1#',
        '#######',
        '#1 . .#',
        '#######',
      ]),
    ).toEqual([]);
  });
});
