import type { DeckDefinition } from '../game';

// Deck 4 (hardest): the docking spine. Two parallel spine shafts run the full
// height of the deck; docking arms cross them to four docking pods. The outer
// corner of each pod is an airlock, linked crosswise.
export const dockingSpine: DeckDefinition = {
  name: 'Docking Spine',
  drones: {
    hunters: 2,
    patrollers: [
      // Along the two long docking arms.
      { route: [{ x: 1, y: 9 }, { x: 17, y: 9 }] },
      { route: [{ x: 17, y: 13 }, { x: 1, y: 13 }] },
    ],
    sentinels: [
      // Upper docking pods.
      { start: { x: 3, y: 5 }, area: { from: { x: 1, y: 1 }, to: { x: 5, y: 5 } } },
      { start: { x: 15, y: 1 }, area: { from: { x: 13, y: 1 }, to: { x: 17, y: 5 } } },
    ],
  },
  grid: [
    '###################',
    '#1....#.....#....2#',
    '#.###.#.###.#.###.#',
    '#.###.........###.#',
    '#.###.#.###.#.###.#',
    '#.....#.....#.....#',
    '#.#####.###.#####.#',
    '#.#####.###.#####.#',
    '#.#####.###.#####.#',
    '#.................#',
    '#.##.##.#.#.##.##.#',
    '#.##E##.#B#.##E##.#',
    '#.##.##.#.#.##.##.#',
    '#.................#',
    '#.#####.###.#####.#',
    '#.#####.###.#####.#',
    '#.#####.###.#####.#',
    '#.....#.....#.....#',
    '#.###.#.###.#.###.#',
    '#.###.........###.#',
    '#.###.#.###.#.###.#',
    '#2....#..R..#....1#',
    '###################',
  ],
};
