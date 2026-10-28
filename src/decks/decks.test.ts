import { describe, expect, it } from 'vitest';
import { levelTable } from '../data/levels';
import { createGame } from '../game';
import { decks } from './index';

describe('real decks', () => {
  it('all pass validation', () => {
    const result = createGame(decks, levelTable);
    expect(result.ok ? [] : result.errors).toEqual([]);
  });
});
