import { describe, expect, it } from 'vitest';
import { levelTable } from '../data/levels';
import { createGame, type DeckDefinition } from '../game';
import { decks } from './index';

/** Longest dead end a deck may have, in tiles: anything longer a Hunter can seal off. */
const MAX_DEAD_END_TILES = 2;

type Tile = readonly [number, number];

const charAt = (deck: DeckDefinition, [x, y]: Tile): string => deck.grid[y]?.[x] ?? '#';
const isOpen = (deck: DeckDefinition, tile: Tile): boolean => charAt(deck, tile) !== '#';
const isAirlock = (deck: DeckDefinition, tile: Tile): boolean => /[1-9]/.test(charAt(deck, tile));
const same = (a: Tile, b: Tile): boolean => a[0] === b[0] && a[1] === b[1];

function openNeighbours(deck: DeckDefinition, [x, y]: Tile): Tile[] {
  const around: Tile[] = [
    [x, y - 1],
    [x - 1, y],
    [x, y + 1],
    [x + 1, y],
  ];
  return around.filter((t) => isOpen(deck, t));
}

/**
 * Every dead end of a deck: from each corridor tip (one open neighbour), the
 * number of tiles walked until a junction. Airlock tiles are escape routes for
 * the robot, so a corridor ending in an airlock is not a dead end.
 */
function deadEnds(deck: DeckDefinition): { tip: Tile; length: number }[] {
  const found: { tip: Tile; length: number }[] = [];
  deck.grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const tip: Tile = [x, y];
      if (!isOpen(deck, tip) || isAirlock(deck, tip)) continue;
      if (openNeighbours(deck, tip).length !== 1) continue;
      let length = 0;
      let prev: Tile | null = null;
      let cur: Tile = tip;
      for (;;) {
        const onward = openNeighbours(deck, cur).filter((t) => prev === null || !same(t, prev));
        const next = onward[0];
        if (onward.length !== 1 || next === undefined || isAirlock(deck, cur)) break;
        length++;
        prev = cur;
        cur = next;
      }
      found.push({ tip, length });
    }
  });
  return found;
}

const count = (deck: DeckDefinition, pattern: RegExp): number =>
  [...deck.grid.join('')].filter((ch) => pattern.test(ch)).length;

describe('real decks', () => {
  it('all pass validation', () => {
    const result = createGame(decks, levelTable);
    expect(result.ok ? [] : result.errors).toEqual([]);
  });

  it('are three or four, so the deck cycle can be played', () => {
    expect(decks.length).toBeGreaterThanOrEqual(3);
    expect(decks.length).toBeLessThanOrEqual(4);
  });

  describe.each(decks.map((deck) => [deck.name, deck] as const))('%s', (_, deck) => {
    it('is 19 x 23 tiles (portrait)', () => {
      expect(deck.grid.length).toBe(23);
      expect(deck.grid.every((row) => row.length === 19)).toBe(true);
    });

    it('has an airlock pair and 2 to 4 EMP charges', () => {
      expect(count(deck, /[1-9]/)).toBeGreaterThanOrEqual(2);
      expect(count(deck, /E/)).toBeGreaterThanOrEqual(2);
      expect(count(deck, /E/)).toBeLessThanOrEqual(4);
    });

    it('has a mix of all three drone types', () => {
      expect(deck.drones?.hunters ?? 0).toBeGreaterThan(0);
      expect(deck.drones?.patrollers?.length ?? 0).toBeGreaterThan(0);
      expect(deck.drones?.sentinels?.length ?? 0).toBeGreaterThan(0);
    });

    it(`has no dead end longer than ${MAX_DEAD_END_TILES} tiles`, () => {
      const tooLong = deadEnds(deck).filter((d) => d.length > MAX_DEAD_END_TILES);
      expect(tooLong).toEqual([]);
    });
  });
});

describe('real level table', () => {
  it('keeps drone speed below robot speed on every level', () => {
    for (const row of levelTable) {
      expect(row.droneSpeed ?? 0).toBeLessThan(row.robotSpeed);
    }
  });
});
