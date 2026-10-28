import type { DeckDefinition } from '../game';

// Simple walking-skeleton deck. Replaced by the real hand-made decks later.
export const testDeck: DeckDefinition = {
  name: 'Test Deck',
  drones: {
    hunters: 2,
    // Guards the top-right block of corridors.
    sentinels: [{ start: { x: 14, y: 3 }, area: { from: { x: 10, y: 1 }, to: { x: 17, y: 5 } } }],
  },
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
