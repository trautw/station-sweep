import type { DeckDefinition } from '../game';

// Deck 1 (easiest): the habitat wheel. An outer hull ring, a middle ring and the
// ring around the life-support core, tied together by four spokes. Every
// corridor is part of a loop. Airlock 1 links opposite corners of the middle ring.
export const habRing: DeckDefinition = {
  name: 'Hab Ring',
  drones: {
    hunters: 1,
    // Walks the middle ring.
    patrollers: [{ route: [{ x: 4, y: 4 }, { x: 14, y: 4 }, { x: 14, y: 18 }, { x: 4, y: 18 }] }],
    // Guards the lower-left hull section.
    sentinels: [{ start: { x: 1, y: 18 }, area: { from: { x: 1, y: 15 }, to: { x: 4, y: 21 } } }],
  },
  grid: [
    '###################',
    '#.........R.......#',
    '#.#######.#######.#',
    '#.#######.#######.#',
    '#.##1....E.....##.#',
    '#.##.####.####.##.#',
    '#....####.####....#',
    '#.##.####.####.##.#',
    '#.##.#.......#.##.#',
    '#.##.#.#####.#.##.#',
    '#.##.#.#####.#.##.#',
    '#.....E#####......#',
    '#.##.#.#####.#.##.#',
    '#.##.#.#####.#.##.#',
    '#.##.#...B...#.##.#',
    '#....####.####....#',
    '#.##.####.####.##.#',
    '#.##.####.####.##.#',
    '#.##..........1##.#',
    '#.#######.#######.#',
    '#.#######.#######.#',
    '#E...............E#',
    '###################',
  ],
};
