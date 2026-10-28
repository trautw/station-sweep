import type { DeckDefinition } from '../game';

// Simple walking-skeleton deck. Replaced by the real hand-made decks later.
export const testDeck: DeckDefinition = {
  name: 'Test Deck',
  drones: { hunters: 2 },
  grid: [
    '###################',
    '#........#........#',
    '#.##.###.#.###.##.#',
    '#.................#',
    '#.##.#.#####.#.##.#',
    '#E...#...#...#...E#',
    '####.###.#.###.####',
    '#1.......B.......1#',
    '#.##.#########.##.#',
    '#..#....ER.....#..#',
    '##.#.#.#####.#.#.##',
    '#....#...#...#....#',
    '#.######.#.######.#',
    '#2.......E.......2#',
    '###################',
  ],
};
