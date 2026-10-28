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
    '#....#...#...#....#',
    '####.###.#.###.####',
    '#........B........#',
    '#.##.#########.##.#',
    '#..#.....R.....#..#',
    '##.#.#.#####.#.#.##',
    '#....#...#...#....#',
    '#.######.#.######.#',
    '#.................#',
    '###################',
  ],
};
