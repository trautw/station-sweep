import { describe, expect, it } from 'vitest';
import { createGame, type Game } from './index';

// Robot speed 6 tiles/s at 60 ticks/s => exactly 10 ticks per tile.
const TICKS_PER_TILE = 10;

function startGame(grid: string[]): Game {
  const result = createGame([{ name: 'test deck', grid }], [{ robotSpeed: 6 }]);
  if (!result.ok) throw new Error(result.errors.join('\n'));
  return result.game;
}

function robotTile(game: Game) {
  return game.state().robot.tile;
}

describe('robot movement', () => {
  it('waits on its start tile until it is given a direction', () => {
    const game = startGame([
      '#######',
      '#B R  #',
      '#######',
    ]);
    game.tick(5 * TICKS_PER_TILE);
    expect(robotTile(game)).toEqual({ x: 3, y: 1 });
    expect(game.state().robot.moving).toBe(false);
  });

  it('keeps moving in its direction until it reaches a wall', () => {
    const game = startGame([
      '#######',
      '#R    #',
      '#B#####',
      '#######',
    ]);
    game.send({ type: 'direction', direction: 'right' });
    game.tick(2 * TICKS_PER_TILE);
    expect(robotTile(game)).toEqual({ x: 3, y: 1 });
    expect(game.state().robot.moving).toBe(true);

    game.tick(10 * TICKS_PER_TILE);
    expect(robotTile(game)).toEqual({ x: 5, y: 1 });
    expect(game.state().robot.moving).toBe(false);
  });

  it('takes a buffered turn at the next junction that allows it', () => {
    const game = startGame([
      '#######',
      '#### ##',
      '#R    #',
      '#B#####',
      '#######',
    ]);
    game.send({ type: 'direction', direction: 'right' });
    game.tick(1);
    game.send({ type: 'direction', direction: 'up' });
    expect(game.state().robot.bufferedTurn).toBe('up');

    // Passes x=2 and x=3 (wall above), turns up at the junction x=4.
    game.tick(3 * TICKS_PER_TILE);
    expect(robotTile(game)).toEqual({ x: 4, y: 2 });
    game.tick(TICKS_PER_TILE);
    expect(robotTile(game)).toEqual({ x: 4, y: 1 });
    expect(game.state().robot.direction).toBe('up');
    expect(game.state().robot.bufferedTurn).toBeNull();
  });

  it('replaces the buffered turn with a newer direction input', () => {
    const game = startGame([
      '#######',
      '#### ##',
      '#R    #',
      '#B## ##',
      '#######',
    ]);
    game.send({ type: 'direction', direction: 'right' });
    game.tick(1);
    game.send({ type: 'direction', direction: 'up' });
    game.send({ type: 'direction', direction: 'down' });
    expect(game.state().robot.bufferedTurn).toBe('down');

    game.tick(4 * TICKS_PER_TILE);
    expect(robotTile(game)).toEqual({ x: 4, y: 3 });
    expect(game.state().robot.direction).toBe('down');
  });

  it('reverses immediately, even between two tiles', () => {
    const game = startGame([
      '#######',
      '#R    #',
      '#B#####',
      '#######',
    ]);
    game.send({ type: 'direction', direction: 'right' });
    game.tick(2 * TICKS_PER_TILE + 3); // 0.3 tiles past x=3
    expect(game.state().robot.position.x).toBeCloseTo(3.3);

    game.send({ type: 'direction', direction: 'left' });
    expect(game.state().robot.direction).toBe('left');
    expect(game.state().robot.bufferedTurn).toBeNull();
    game.tick(3);
    expect(game.state().robot.position.x).toBeCloseTo(3.0);
    game.tick(TICKS_PER_TILE);
    expect(game.state().robot.position.x).toBeCloseTo(2.0);
  });

  it('stops at a wall and keeps the buffered turn until a possible direction arrives', () => {
    const game = startGame([
      '#######',
      '#R   ##',
      '#B## ##',
      '#######',
    ]);
    game.send({ type: 'direction', direction: 'right' });
    game.tick(1);
    game.send({ type: 'direction', direction: 'up' });
    game.tick(10 * TICKS_PER_TILE);
    expect(robotTile(game)).toEqual({ x: 4, y: 1 });
    expect(game.state().robot.moving).toBe(false);
    expect(game.state().robot.bufferedTurn).toBe('up');

    game.send({ type: 'direction', direction: 'down' });
    game.tick(TICKS_PER_TILE);
    expect(robotTile(game)).toEqual({ x: 4, y: 2 });
    expect(game.state().robot.moving).toBe(true);
  });
});

describe('creating a game', () => {
  it('reports an error instead of a game when the deck has no robot start', () => {
    const result = createGame([{ name: 'empty', grid: ['###', '#B#', '###'] }], [{ robotSpeed: 6 }]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join()).toMatch(/robot start/);
  });
});
