import type { DeckDefinition } from '../game';

// Small second test deck so the deck cycle can be seen in the app.
// Replaced by the real hand-made decks later (ticket 14).
export const testDeckB: DeckDefinition = {
  name: 'Test Deck B',
  drones: {
    hunters: 1,
    patrollers: [{ route: [{ x: 1, y: 9 }, { x: 17, y: 9 }] }],
    sentinels: [{ start: { x: 15, y: 1 }, area: { from: { x: 12, y: 1 }, to: { x: 17, y: 3 } } }],
  },
  grid: [
    '###################',
    '#E.......#........#',
    '#.###.##.#.##.###.#',
    '#........B........#',
    '#.###.#.###.#.###.#',
    '#1....#..R..#....1#',
    '#.###.###.###.###.#',
    '#........E........#',
    '#.##.#########.##.#',
    '#.................#',
    '###################',
  ],
};
