import { describe, expect, it } from 'vitest';
import { createGame, DECK_CLEARED_TICKS, type Game, type LevelRow } from './index';
import { levelRow } from './test-levels';

// Robot speed 6 tiles/s at 60 ticks/s => 10 ticks per tile.
const TICKS_PER_TILE = 10;
const LEVELS: LevelRow[] = [levelRow()];

function newGame(grid: string[] = ['#R....B#']): Game {
  const result = createGame([{ name: 'test deck', grid }], LEVELS);
  if (!result.ok) throw new Error(result.errors.join('\n'));
  return result.game;
}

describe('Title phase', () => {
  it('a new game waits on the title screen; ticks and directions change nothing', () => {
    const game = newGame();
    expect(game.state().phase).toBe('title');
    game.send({ type: 'direction', direction: 'right' });
    game.tick(5 * TICKS_PER_TILE);
    expect(game.state().robot.tile).toEqual({ x: 1, y: 0 });
    expect(game.state().score).toBe(0);
  });

  it('the start command begins play on the first deck', () => {
    const game = newGame();
    game.send({ type: 'start' });
    expect(game.state().phase).toBe('playing');
    game.send({ type: 'direction', direction: 'right' });
    game.tick(TICKS_PER_TILE);
    expect(game.state().robot.tile).toEqual({ x: 2, y: 0 });
    expect(game.state().score).toBe(10);
  });
});

function startedGame(grid?: string[]): Game {
  const game = newGame(grid);
  game.send({ type: 'start' });
  return game;
}

describe('Pause phase', () => {
  it('while paused, ticks change nothing', () => {
    const game = startedGame();
    game.send({ type: 'direction', direction: 'right' });
    game.tick(TICKS_PER_TILE);
    game.send({ type: 'pause' });
    expect(game.state().phase).toBe('paused');
    const before = game.state();
    game.tick(5 * TICKS_PER_TILE);
    expect(game.state()).toEqual(before);
    expect(game.events()).toEqual([]);
  });

  it('ignores directions and EMP triggers while paused', () => {
    const game = startedGame(['#RE  B#']);
    game.send({ type: 'direction', direction: 'right' });
    game.tick(TICKS_PER_TILE);
    expect(game.state().carriedEmpCharges).toBe(1);
    game.send({ type: 'pause' });
    game.send({ type: 'direction', direction: 'left' });
    game.send({ type: 'triggerEmp' });
    game.send({ type: 'resume' });
    game.tick(1);
    expect(game.state().robot.direction).toBe('right');
    expect(game.state().carriedEmpCharges).toBe(1);
  });

  it('resuming continues the game where it stopped', () => {
    const game = startedGame();
    game.send({ type: 'direction', direction: 'right' });
    game.tick(TICKS_PER_TILE);
    game.send({ type: 'pause' });
    game.tick(100);
    game.send({ type: 'resume' });
    expect(game.state().phase).toBe('playing');
    game.tick(TICKS_PER_TILE);
    expect(game.state().robot.tile).toEqual({ x: 3, y: 0 });
    expect(game.state().score).toBe(20);
  });

  it('pausing during "Deck cleared" holds the countdown and resumes into it', () => {
    const game = startedGame(['#R.  B#']);
    game.send({ type: 'direction', direction: 'right' });
    while (game.state().phase === 'playing') game.tick(1);
    expect(game.state().phase).toBe('deckCleared');
    game.send({ type: 'pause' });
    game.tick(DECK_CLEARED_TICKS * 2);
    expect(game.state().phase).toBe('paused');
    game.send({ type: 'resume' });
    expect(game.state().phase).toBe('deckCleared');
    game.tick(DECK_CLEARED_TICKS);
    expect(game.events()).toContainEqual({ type: 'deckStarted', deck: 'test deck', level: 2 });
  });

  it('pause does nothing after game over', () => {
    const game = gameOver();
    game.send({ type: 'pause' });
    expect(game.state().phase).toBe('gameOver');
  });

  it('pause does nothing on the title screen', () => {
    const game = newGame();
    game.send({ type: 'pause' });
    expect(game.state().phase).toBe('title');
  });
});

/**
 * Two decks; the first has a Hunter released after 1 s that catches the robot.
 * The robot first picks up the EMP charge and collects one cell, so the run has
 * a score and a carried charge when the game ends.
 */
const DECK_A = { name: 'deck A', grid: ['#RE.. B#'], drones: { hunters: 1 } };
const DECK_B = { name: 'deck B', grid: ['#R.B#'] };
const HUNTER_LEVELS: LevelRow[] = [levelRow({ droneSpeed: 5, hunterReleaseDelay: 1 })];

function gameOver(): Game {
  const result = createGame([DECK_A, DECK_B], HUNTER_LEVELS);
  if (!result.ok) throw new Error(result.errors.join('\n'));
  const game = result.game;
  game.send({ type: 'start' });
  game.send({ type: 'direction', direction: 'right' });
  game.tick(2 * TICKS_PER_TILE);
  game.send({ type: 'direction', direction: 'left' });
  for (let i = 0; i < 10000 && game.state().phase !== 'gameOver'; i++) game.tick(1);
  expect(game.state().phase).toBe('gameOver');
  return game;
}

describe('Game over and play again', () => {
  it('ticks and directions change nothing after game over', () => {
    const game = gameOver();
    const before = game.state();
    game.send({ type: 'direction', direction: 'right' });
    game.tick(100);
    expect(game.state()).toEqual(before);
  });

  it('keeps the final score until play again', () => {
    const game = gameOver();
    expect(game.state().score).toBe(10);
    expect(game.state().lives).toBe(0);
  });

  it('play again starts a fresh run: first deck, level 1, 3 lives, no score, no charges', () => {
    const game = gameOver();
    game.send({ type: 'playAgain' });
    const state = game.state();
    expect(state.phase).toBe('playing');
    expect(state.deck.name).toBe('deck A');
    expect(state.level).toBe(1);
    expect(state.lives).toBe(3);
    expect(state.score).toBe(0);
    expect(state.carriedEmpCharges).toBe(0);
    expect(state.empCharges).toEqual([{ x: 2, y: 0 }]);
    expect(state.energyCells).toHaveLength(2);
    expect(state.robot.tile).toEqual({ x: 1, y: 0 });
    expect(state.drones.map((d) => d.mode)).toEqual(['waiting']);
  });

  it('the new run plays: the robot moves and collects again', () => {
    const game = gameOver();
    game.send({ type: 'playAgain' });
    game.send({ type: 'direction', direction: 'right' });
    game.tick(2 * TICKS_PER_TILE);
    expect(game.state().robot.tile).toEqual({ x: 3, y: 0 });
    expect(game.state().score).toBe(10);
    expect(game.state().carriedEmpCharges).toBe(1);
  });

  it('play again does nothing while a run is going on', () => {
    const game = startedGame();
    game.send({ type: 'direction', direction: 'right' });
    game.tick(TICKS_PER_TILE);
    game.send({ type: 'playAgain' });
    expect(game.state().score).toBe(10);
  });

  it('start does nothing after game over (only play again restarts)', () => {
    const game = gameOver();
    game.send({ type: 'start' });
    expect(game.state().phase).toBe('gameOver');
  });
});
