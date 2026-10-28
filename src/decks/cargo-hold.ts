import type { DeckDefinition } from '../game';

// Deck 2: the cargo hold. Two pillared cargo bays (top right, bottom left), a
// maintenance bay, two long conveyor shafts across the deck and the loading
// dock around the drone bay. Airlock 1 is a cargo lift between two far corners.
export const cargoHold: DeckDefinition = {
  name: 'Cargo Hold',
  drones: {
    hunters: 1,
    // Circles the loading dock along both conveyors.
    patrollers: [{ route: [{ x: 4, y: 7 }, { x: 14, y: 7 }, { x: 14, y: 15 }, { x: 4, y: 15 }] }],
    sentinels: [
      // Maintenance bay, top left.
      { start: { x: 4, y: 3 }, area: { from: { x: 1, y: 1 }, to: { x: 7, y: 5 } } },
      // Crew quarters, bottom right.
      { start: { x: 17, y: 18 }, area: { from: { x: 13, y: 17 }, to: { x: 17, y: 21 } } },
    ],
  },
  grid: [
    '###################',
    '#.......#........1#',
    '#.#####.#.#.#.#.#.#',
    '#.#...#.#.........#',
    '#...E...#.#.#.#.#.#',
    '#.#...#.#.........#',
    '#.#####.#####.###.#',
    '#.................#',
    '#.##.####.####.##.#',
    '#.##.##.....##.##.#',
    '#.##.##.###.##.##.#',
    '#.......###......E#',
    '#.##.##.###.##.##.#',
    '#.##.##..B..##.##.#',
    '#.##.####.####.##.#',
    '#.................#',
    '#.###.#####.#####.#',
    '#.........#.......#',
    '#.#.#.#.#.#.#####.#',
    '#....R....#.#.E.#.#',
    '#.#.#.#.#.#.......#',
    '#1................#',
    '###################',
  ],
};
