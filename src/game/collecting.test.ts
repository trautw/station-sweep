import { describe, expect, it } from 'vitest';
import { createGame, type Game } from './index';

// Robot speed 6 tiles/s at 60 ticks/s => exactly 10 ticks per tile.
const TICKS_PER_TILE = 10;

function startGame(grid: string[]): Game {
  const result = createGame([{ name: 'test deck', grid }], [{ robotSpeed: 6 }]);
  if (!result.ok) throw new Error(result.errors.join('\n'));
  return result.game;
}

describe('collecting energy cells', () => {
  it('starts with score 0 and every energy cell on the deck', () => {
    const game = startGame([
      '#######',
      '#R. ..#',
      '#######',
    ]);
    const state = game.state();
    expect(state.score).toBe(0);
    expect(state.energyCells).toEqual([
      { x: 2, y: 1 },
      { x: 4, y: 1 },
      { x: 5, y: 1 },
    ]);
  });

  it('collects an energy cell by driving over it, for 10 points and a "cell collected" event', () => {
    const game = startGame([
      '#######',
      '#R. ..#',
      '#######',
    ]);
    game.send({ type: 'direction', direction: 'right' });
    game.tick(TICKS_PER_TILE);

    const state = game.state();
    expect(state.score).toBe(10);
    expect(state.energyCells).toEqual([
      { x: 4, y: 1 },
      { x: 5, y: 1 },
    ]);
    expect(game.events()).toEqual([{ type: 'cellCollected', tile: { x: 2, y: 1 } }]);
  });

  it('reports no events in a tick where nothing is collected', () => {
    const game = startGame([
      '#######',
      '#R. ..#',
      '#######',
    ]);
    game.send({ type: 'direction', direction: 'right' });
    game.tick(TICKS_PER_TILE);
    game.tick(TICKS_PER_TILE);
    expect(game.events()).toEqual([]);
    expect(game.state().score).toBe(10);
  });

  it('adds 10 points for each energy cell', () => {
    const game = startGame([
      '#######',
      '#R. ..#',
      '#  ####',
      '#######',
    ]);
    game.send({ type: 'direction', direction: 'right' });
    game.tick(3 * TICKS_PER_TILE);
    expect(game.state().score).toBe(20);
    expect(game.events()).toEqual([
      { type: 'cellCollected', tile: { x: 2, y: 1 } },
      { type: 'cellCollected', tile: { x: 4, y: 1 } },
    ]);
    expect(game.state().phase).toBe('playing');
  });

  it('moves the game to "deck cleared" when the last energy cell is collected', () => {
    const game = startGame([
      '#######',
      '#R. ..#',
      '#  ####',
      '#######',
    ]);
    game.send({ type: 'direction', direction: 'right' });
    game.tick(4 * TICKS_PER_TILE);

    expect(game.state().phase).toBe('deckCleared');
    expect(game.state().score).toBe(30);
    expect(game.state().energyCells).toEqual([]);
    expect(game.events()).toContainEqual({ type: 'deckCleared' });
  });

  it('stops the robot once the deck is cleared', () => {
    const game = startGame([
      '#######',
      '#R.   #',
      '#######',
    ]);
    game.send({ type: 'direction', direction: 'right' });
    game.tick(TICKS_PER_TILE);
    expect(game.state().phase).toBe('deckCleared');
    const tile = game.state().robot.tile;

    game.tick(3 * TICKS_PER_TILE);
    expect(game.state().robot.tile).toEqual(tile);
    expect(game.events()).toEqual([]);
  });
});
