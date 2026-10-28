import { describe, expect, it } from 'vitest';
import { levelTable } from '../data/levels';
import { createGame } from '../game';
import { decks } from './index';

describe('real decks', () => {
  it('all pass validation', () => {
    const result = createGame(decks, levelTable);
    expect(result.ok ? [] : result.errors).toEqual([]);
  });

  it('are at least two, so the deck cycle can be played', () => {
    expect(decks.length).toBeGreaterThanOrEqual(2);
  });
});

describe('real level table', () => {
  it('keeps drone speed below robot speed on every level', () => {
    for (const row of levelTable) {
      expect(row.droneSpeed ?? 0).toBeLessThan(row.robotSpeed);
    }
  });
});
