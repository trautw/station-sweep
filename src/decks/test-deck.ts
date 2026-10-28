import type { DeckDefinition } from '../game';

// Simple walking-skeleton deck. Replaced by the real hand-made decks later.
export const testDeck: DeckDefinition = {
  name: 'Test Deck',
  drones: {
    hunters: 2,
    patrollers: [
      { route: [{ x: 1, y: 1 }, { x: 8, y: 1 }, { x: 8, y: 3 }, { x: 1, y: 3 }] },
      { route: [{ x: 2, y: 13 }, { x: 16, y: 13 }] },
    ],
  },
  grid: [
    '###################',
    '#........#........#',
    '#.##.###.#.###.##.#',
    '#.................#',
    '#.##.#.#####.#.##.#',
    '#....#...#...#....#',
    '####.###.#.###.####',
    '#1.......B.......1#',
    '#.##.#########.##.#',
    '#..#.....R.....#..#',
    '##.#.#.#####.#.#.##',
    '#....#...#...#....#',
    '#.######.#.######.#',
    '#2...............2#',
    '###################',
  ],
};
