import type { DeckDefinition } from '../game';

// Deck 3: the reactor. A round cooling ring around the reactor core, cut by two
// crossing service shafts that meet at the drone bay in the core's centre. Two
// airlock pairs link the four corners crosswise.
export const reactorCore: DeckDefinition = {
  name: 'Reactor Core',
  drones: {
    hunters: 2,
    patrollers: [
      // Round the cooling ring.
      {
        route: [
          { x: 11, y: 6 },
          { x: 13, y: 8 },
          { x: 13, y: 14 },
          { x: 11, y: 16 },
          { x: 7, y: 16 },
          { x: 5, y: 14 },
          { x: 5, y: 8 },
          { x: 7, y: 6 },
        ],
      },
      // Up and down the upper gallery.
      { route: [{ x: 1, y: 3 }, { x: 7, y: 3 }] },
    ],
    // Guards the left end of the cross shaft.
    sentinels: [{ start: { x: 1, y: 11 }, area: { from: { x: 1, y: 8 }, to: { x: 4, y: 14 } } }],
  },
  grid: [
    '###################',
    '#1...............2#',
    '#.#.#.#.#.#.#####.#',
    '#....E....#...#...#',
    '#.#.#.###.###.#.#.#',
    '#.....###.###.....#',
    '#.##.##.....##.##.#',
    '#.##.#..#.#..#.##.#',
    '#......##.##......#',
    '#.###.###.###.###.#',
    '#.###.###.###.###.#',
    '#........B.......E#',
    '#.###.###.###.###.#',
    '#.###.###.###.###.#',
    '#......##.##......#',
    '#.##.#..#.#..#.##.#',
    '#.##.##.....##.##.#',
    '#.....###.###.....#',
    '#.###.###.###.#.#.#',
    '#...#.....#..E....#',
    '#.#.#.###.#.#.#.#.#',
    '#2.......R.......1#',
    '###################',
  ],
};
