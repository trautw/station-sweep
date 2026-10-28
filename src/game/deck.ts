import type { DeckDefinition, TilePos } from './types';

/** Internal deck model produced by the parser. */
export interface Deck {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly walls: readonly (readonly boolean[])[];
  readonly robotStart: TilePos;
  /** Energy cell tiles in row-major order. */
  readonly energyCells: readonly TilePos[];
}

export type ParseResult =
  | { readonly ok: true; readonly deck: Deck }
  | { readonly ok: false; readonly errors: readonly string[] };

/**
 * Grid characters. Extend here as new tile contents arrive
 * (`E` EMP charge, `B` drone bay, `1`-`9` airlocks).
 */
const WALL = '#';
const CORRIDOR = ' ';
const ROBOT_START = 'R';
const ENERGY_CELL = '.';

export function parseDeck(def: DeckDefinition): ParseResult {
  const errors: string[] = [];
  const height = def.grid.length;
  const width = Math.max(0, ...def.grid.map((row) => row.length));
  const walls: boolean[][] = [];
  const robotStarts: TilePos[] = [];
  const energyCells: TilePos[] = [];

  for (let y = 0; y < height; y++) {
    const row = def.grid[y] ?? '';
    const wallRow: boolean[] = [];
    for (let x = 0; x < width; x++) {
      // Short rows are padded with walls.
      const ch = row[x] ?? WALL;
      switch (ch) {
        case WALL:
          wallRow.push(true);
          break;
        case CORRIDOR:
          wallRow.push(false);
          break;
        case ROBOT_START:
          wallRow.push(false);
          robotStarts.push({ x, y });
          break;
        case ENERGY_CELL:
          wallRow.push(false);
          energyCells.push({ x, y });
          break;
        default:
          wallRow.push(true);
          errors.push(`${def.name}: unknown grid character '${ch}' at (${x}, ${y})`);
      }
    }
    walls.push(wallRow);
  }

  const robotStart = robotStarts[0];
  if (robotStart === undefined) errors.push(`${def.name}: no robot start 'R'`);
  if (errors.length > 0 || robotStart === undefined) return { ok: false, errors };

  return { ok: true, deck: { name: def.name, width, height, walls, robotStart, energyCells } };
}

export function isWall(deck: Deck, pos: TilePos): boolean {
  if (pos.y < 0 || pos.y >= deck.height || pos.x < 0 || pos.x >= deck.width) return true;
  return deck.walls[pos.y]?.[pos.x] ?? true;
}
