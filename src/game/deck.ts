import { step } from './grid';
import type { DeckDefinition, Direction, TilePos } from './types';

const DIRECTIONS: readonly Direction[] = ['up', 'down', 'left', 'right'];

/** Internal deck model produced by the parser. */
export interface Deck {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly walls: readonly (readonly boolean[])[];
  readonly robotStart: TilePos;
  readonly droneBay: TilePos;
  /** Energy cell tiles in row-major order. */
  readonly energyCells: readonly TilePos[];
}

export type ParseResult =
  | { readonly ok: true; readonly deck: Deck }
  | { readonly ok: false; readonly errors: readonly string[] };

/**
 * Grid characters. Extend here as new tile contents arrive
 * (`E` EMP charge, `1`-`9` airlocks).
 */
const WALL = '#';
const CORRIDOR = ' ';
const ROBOT_START = 'R';
const DRONE_BAY = 'B';
const ENERGY_CELL = '.';

/**
 * Everything the parser found in a grid, before validation. Positions are
 * collected as lists so validation rules can check counts.
 */
interface RawDeck {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly walls: readonly (readonly boolean[])[];
  readonly robotStarts: readonly TilePos[];
  readonly droneBays: readonly TilePos[];
  readonly energyCells: readonly TilePos[];
}

/** A validation rule returns one message per problem it finds (empty when fine). */
type ValidationRule = (deck: RawDeck) => string[];

const VALIDATION_RULES: readonly ValidationRule[] = [
  (deck) => exactlyOne(deck.robotStarts, "robot start 'R'"),
  (deck) => exactlyOne(deck.droneBays, "drone bay 'B'"),
  (deck) => unreachableFromRobot(deck, deck.energyCells, 'energy cell'),
];

export function parseDeck(def: DeckDefinition): ParseResult {
  const errors: string[] = [];
  const height = def.grid.length;
  const width = Math.max(0, ...def.grid.map((row) => row.length));
  const walls: boolean[][] = [];
  const robotStarts: TilePos[] = [];
  const droneBays: TilePos[] = [];
  const energyCells: TilePos[] = [];

  for (let y = 0; y < height; y++) {
    const row = def.grid[y] ?? '';
    const wallRow: boolean[] = [];
    for (let x = 0; x < width; x++) {
      // Short rows are padded with walls.
      const ch = row[x] ?? WALL;
      wallRow.push(ch === WALL);
      switch (ch) {
        case WALL:
        case CORRIDOR:
          break;
        case ROBOT_START:
          robotStarts.push({ x, y });
          break;
        case DRONE_BAY:
          droneBays.push({ x, y });
          break;
        case ENERGY_CELL:
          energyCells.push({ x, y });
          break;
        default:
          wallRow[x] = true;
          errors.push(`unknown grid character '${ch}' at ${fmt({ x, y })}`);
      }
    }
    walls.push(wallRow);
  }

  const raw: RawDeck = { name: def.name, width, height, walls, robotStarts, droneBays, energyCells };
  for (const rule of VALIDATION_RULES) errors.push(...rule(raw));

  const robotStart = robotStarts[0];
  const droneBay = droneBays[0];
  if (errors.length > 0 || robotStart === undefined || droneBay === undefined) {
    return { ok: false, errors: errors.map((e) => `${def.name}: ${e}`) };
  }
  return {
    ok: true,
    deck: { name: def.name, width, height, walls, robotStart, droneBay, energyCells },
  };
}

function exactlyOne(found: readonly TilePos[], what: string): string[] {
  if (found.length === 0) return [`no ${what}`];
  if (found.length > 1) {
    return [`more than one ${what}: found ${found.length} at ${found.map(fmt).join(', ')}`];
  }
  return [];
}

/** Reports every target tile the robot cannot reach. Skipped unless there is exactly one start. */
function unreachableFromRobot(deck: RawDeck, targets: readonly TilePos[], what: string): string[] {
  const start = deck.robotStarts[0];
  if (start === undefined || deck.robotStarts.length !== 1) return [];
  const reachable = reachableTiles(deck, start);
  return targets
    .filter((t) => !reachable.has(key(t)))
    .map((t) => `${what} at ${fmt(t)} is not reachable from the robot start`);
}

/** Flood fill over corridor tiles. Airlocks will add their paired tile as a neighbour. */
function reachableTiles(deck: RawDeck, start: TilePos): Set<string> {
  const seen = new Set([key(start)]);
  const queue = [start];
  for (let pos = queue.shift(); pos !== undefined; pos = queue.shift()) {
    for (const dir of DIRECTIONS) {
      const next = step(pos, dir);
      if (isWall(deck, next) || seen.has(key(next))) continue;
      seen.add(key(next));
      queue.push(next);
    }
  }
  return seen;
}

function key(pos: TilePos): string {
  return `${pos.x},${pos.y}`;
}

function fmt(pos: TilePos): string {
  return `(${pos.x}, ${pos.y})`;
}

export function isWall(deck: Pick<Deck, 'width' | 'height' | 'walls'>, pos: TilePos): boolean {
  if (pos.y < 0 || pos.y >= deck.height || pos.x < 0 || pos.x >= deck.width) return true;
  return deck.walls[pos.y]?.[pos.x] ?? true;
}
