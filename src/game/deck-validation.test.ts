import { describe, expect, it } from 'vitest';
import { createGame } from './index';
import { levelRow } from './test-levels';

function errorsFor(grid: string[]): readonly string[] {
  const result = createGame([{ name: 'test deck', grid }], [levelRow()]);
  return result.ok ? [] : result.errors;
}

describe('deck validation', () => {
  it('reports a deck without a drone bay', () => {
    const errors = errorsFor([
      '#######',
      '#R . .#',
      '#######',
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/test deck.*no drone bay 'B'/);
  });

  it('reports a deck with two drone bays, naming both positions', () => {
    const errors = errorsFor([
      '#######',
      '#R B B#',
      '#######',
    ]);
    expect(errors).toEqual([
      "test deck: more than one drone bay 'B': found 2 at (3, 1), (5, 1)",
    ]);
  });

  it('reports a deck without a robot start', () => {
    const errors = errorsFor([
      '#######',
      '#. B .#',
      '#######',
    ]);
    expect(errors).toEqual(["test deck: no robot start 'R'"]);
  });

  it('reports a deck with two robot starts', () => {
    const errors = errorsFor([
      '#######',
      '#R B R#',
      '#######',
    ]);
    expect(errors).toEqual([
      "test deck: more than one robot start 'R': found 2 at (1, 1), (5, 1)",
    ]);
  });

  it('reports an energy cell the robot cannot reach, naming its position', () => {
    const errors = errorsFor([
      '#######',
      '#R B .#',
      '#######',
      '#  .  #',
      '#######',
    ]);
    expect(errors).toEqual(['test deck: energy cell at (3, 3) is not reachable from the robot start']);
  });

  it('accepts a valid deck', () => {
    const result = createGame(
      [
        {
          name: 'test deck',
          grid: [
            '#######',
            '#R . .#',
            '#.###.#',
            '#. B .#',
            '#######',
          ],
        },
      ],
      [levelRow()],
    );
    expect(result.ok).toBe(true);
  });

  it('reports errors from every invalid deck', () => {
    const result = createGame(
      [
        { name: 'first', grid: ['#####', '#R .#', '#####'] },
        { name: 'second', grid: ['#####', '# B #', '#####'] },
      ],
      [levelRow()],
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(["first: no drone bay 'B'", "second: no robot start 'R'"]);
    }
  });
});
