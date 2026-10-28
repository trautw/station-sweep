import { describe, expect, it } from 'vitest';
import {
  createGame,
  DECK_CLEARED_TICKS,
  type DeckDefinition,
  type Game,
  type LevelRow,
} from './index';
import { levelRow } from './test-levels';

// Robot speed 6 tiles/s at 60 ticks/s => 10 ticks per tile.
const TICKS_PER_TILE = 10;
const LEVELS: LevelRow[] = [levelRow()];

/** A deck with one energy cell right of the robot: one tile to the right clears it. */
function oneCellDeck(name: string, drones: DeckDefinition['drones'] = {}): DeckDefinition {
  return { name, grid: ['#R.  B#'], drones };
}

function startGame(decks: DeckDefinition[], levels: LevelRow[] = LEVELS): Game {
  const result = createGame(decks, levels);
  if (!result.ok) throw new Error(result.errors.join('\n'));
  result.game.send({ type: 'start' });
  return result.game;
}

/** Drive right until the last cell is collected; ends on the tick the deck is cleared. */
function collectLastCell(game: Game) {
  game.send({ type: 'direction', direction: 'right' });
  for (let i = 0; i < 10 * TICKS_PER_TILE; i++) {
    game.tick(1);
    if (game.state().phase === 'deckCleared') return;
  }
  throw new Error('deck was never cleared');
}

/** Clear the deck, then wait for the next deck to start. */
function clearDeck(game: Game) {
  collectLastCell(game);
  game.tick(DECK_CLEARED_TICKS);
  expect(game.state().phase).toBe('playing');
}

describe('deck cycle', () => {
  it('clearing a deck moves on to the next deck after the "deck cleared" phase', () => {
    const game = startGame([oneCellDeck('first'), oneCellDeck('second')]);
    collectLastCell(game);

    game.tick(DECK_CLEARED_TICKS - 1);
    expect(game.state().phase).toBe('deckCleared');
    expect(game.state().deck.name).toBe('first');

    game.tick(1);
    const state = game.state();
    expect(state.phase).toBe('playing');
    expect(state.deck.name).toBe('second');
    expect(state.level).toBe(1);
    expect(state.robot.tile).toEqual({ x: 1, y: 0 });
    expect(state.robot.moving).toBe(false);
    expect(state.energyCells).toEqual([{ x: 2, y: 0 }]);
    expect(game.events()).toContainEqual({ type: 'deckStarted', deck: 'second', level: 1 });
  });

  it('after the last deck, the level goes up and the first deck comes back', () => {
    const game = startGame([oneCellDeck('first'), oneCellDeck('second')]);
    clearDeck(game);
    clearDeck(game);
    expect(game.state().deck.name).toBe('first');
    expect(game.state().level).toBe(2);
    clearDeck(game);
    expect(game.state().deck.name).toBe('second');
    expect(game.state().level).toBe(2);
  });
});

describe('clearing a deck', () => {
  // Two charges, then the only energy cell: clearing this deck carries 2 charges.
  const chargedDeck = (name: string): DeckDefinition => ({ name, grid: ['#REE.  B#'] });

  it('awards 1,000 points plus 500 per carried EMP charge', () => {
    const game = startGame([oneCellDeck('plain'), chargedDeck('charged')]);
    collectLastCell(game);
    expect(game.state().score).toBe(10 + 1000);
    expect(game.events()).toContainEqual({ type: 'deckCleared', bonus: 1000 });

    game.tick(DECK_CLEARED_TICKS);
    collectLastCell(game);
    expect(game.state().carriedEmpCharges).toBe(2);
    expect(game.state().score).toBe(1010 + 10 + 1000 + 2 * 500);
    expect(game.events()).toContainEqual({ type: 'deckCleared', bonus: 2000 });
  });

  it('carries EMP charges over to the next deck; its own charges lie on the deck again', () => {
    const game = startGame([
      { name: 'one charge', grid: ['#RE.  B#'] },
      { name: 'next', grid: ['#R.E  B#'] },
    ]);
    clearDeck(game);
    expect(game.state().deck.name).toBe('next');
    expect(game.state().carriedEmpCharges).toBe(1);
    expect(game.state().empCharges).toEqual([{ x: 3, y: 0 }]);
  });

  it('awards an extra life when the score reaches 5,000 and again at 10,000', () => {
    const game = startGame([chargedDeck('charged')]);
    const livesAfterDeck: number[] = [];
    const extraLifeEvents: number[] = [];
    for (let deck = 1; deck <= 5; deck++) {
      collectLastCell(game);
      livesAfterDeck.push(game.state().lives);
      extraLifeEvents.push(game.events().filter((e) => e.type === 'extraLife').length);
      game.tick(DECK_CLEARED_TICKS);
    }
    // Each deck scores 10 + 1,000 + 2 x 500 = 2,010: 2,010 / 4,020 / 6,030 / 8,040 / 10,050.
    expect(game.state().score).toBe(10050);
    expect(livesAfterDeck).toEqual([3, 3, 4, 4, 5]);
    expect(extraLifeEvents).toEqual([0, 0, 1, 0, 1]);
  });
});

/** Ticks from now until the first Hunter leaves the drone bay. */
function ticksUntilHunterReleased(game: Game, limit = 1000): number {
  for (let i = 1; i <= limit; i++) {
    game.tick(1);
    if (game.state().drones.some((d) => d.type === 'hunter' && d.mode === 'hunting')) return i;
  }
  throw new Error('no Hunter was released');
}

describe('level table', () => {
  it('gives each level its own row, and the last row to all higher levels', () => {
    const levels: LevelRow[] = [
      levelRow({ hunterReleaseDelay: 3 }),
      levelRow({ hunterReleaseDelay: 2 }),
      levelRow({ hunterReleaseDelay: 1 }),
    ];
    // One deck per cycle: every cleared deck raises the level.
    const game = startGame([oneCellDeck('only', { hunters: 1 })], levels);
    const releaseTicks: number[] = [];
    for (let level = 1; level <= 5; level++) {
      expect(game.state().level).toBe(level);
      releaseTicks.push(ticksUntilHunterReleased(game));
      clearDeck(game);
    }
    // The Hunter release timer restarts on each deck.
    expect(releaseTicks).toEqual([180, 120, 60, 60, 60]);
  });

  it('takes the shutdown time from the current level', () => {
    const levels: LevelRow[] = [
      levelRow({ shutdownTime: 4 }),
      levelRow({ shutdownTime: 2 }),
    ];
    const deck: DeckDefinition = {
      name: 'charged',
      grid: [
        '#RE.  B#',
        '#      #',
      ],
      drones: { patrollers: [{ route: [{ x: 5, y: 1 }] }] },
    };
    const game = startGame([deck], levels);
    collectLastCell(game); // picks up the charge on the way
    game.tick(DECK_CLEARED_TICKS);
    expect(game.state().level).toBe(2);

    game.send({ type: 'triggerEmp' });
    game.tick(1);
    const patroller = game.state().drones.find((d) => d.type === 'patroller');
    expect(patroller?.mode).toBe('shutdown');
    expect(patroller?.shutdownTimeLeft).toBeGreaterThan(1.9);
    expect(patroller?.shutdownTimeLeft).toBeLessThanOrEqual(2);
  });

  it('takes the drone speed from the current level, always below the robot speed', () => {
    const levels: LevelRow[] = [
      levelRow({ droneSpeed: 3, hunterReleaseDelay: 0 }),
      levelRow({ droneSpeed: 9, hunterReleaseDelay: 0 }),
    ];
    const deck: DeckDefinition = {
      name: 'long',
      grid: ['#R.                 B#'],
      drones: { hunters: 1 },
    };
    const bayX = 20;
    const game = startGame([deck], levels);
    collectLastCell(game);
    game.tick(DECK_CLEARED_TICKS);
    expect(game.state().level).toBe(2);
    // The Hunter starts in the bay; the robot stands still at x = 1 (no input yet).
    expect(game.state().drones[0]?.position.x).toBe(bayX);

    game.tick(60);
    const travelled = bayX - (game.state().drones[0]?.position.x ?? bayX);
    expect(travelled).toBeGreaterThan(3); // faster than level 1's 3 tiles/s
    expect(travelled).toBeLessThan(6); // never as fast as the robot's 6 tiles/s
  });
});
