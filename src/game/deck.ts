import { step } from './grid';
import type { AirlockPair, DeckDefinition, Direction, TilePos } from './types';

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
  /**
   * Linked airlock pairs, ordered by digit. Airlock tiles are plain corridor
   * tiles in `walls`; only the robot uses the link (see `airlockPartner`).
   */
  readonly airlocks: readonly AirlockPair[];
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
const AIRLOCK = /^[1-9]$/;

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
  /** Airlock tiles per digit, in row-major order. */
  readonly airlockTiles: ReadonlyMap<number, readonly TilePos[]>;
}

/** A validation rule returns one message per problem it finds (empty when fine). */
type ValidationRule = (deck: RawDeck) => string[];

const VALIDATION_RULES: readonly ValidationRule[] = [
  (deck) => exactlyOne(deck.robotStarts, "robot start 'R'"),
  (deck) => exactlyOne(deck.droneBays, "drone bay 'B'"),
  (deck) => unpairedAirlocks(deck),
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
  const airlockTiles = new Map<number, TilePos[]>();

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
          if (AIRLOCK.test(ch)) {
            const digit = Number(ch);
            airlockTiles.set(digit, [...(airlockTiles.get(digit) ?? []), { x, y }]);
            break;
          }
          wallRow[x] = true;
          errors.push(`unknown grid character '${ch}' at ${fmt({ x, y })}`);
      }
    }
    walls.push(wallRow);
  }

  const raw: RawDeck = {
    name: def.name,
    width,
    height,
    walls,
    robotStarts,
    droneBays,
    energyCells,
    airlockTiles,
  };
  for (const rule of VALIDATION_RULES) errors.push(...rule(raw));

  const robotStart = robotStarts[0];
  const droneBay = droneBays[0];
  if (errors.length > 0 || robotStart === undefined || droneBay === undefined) {
    return { ok: false, errors: errors.map((e) => `${def.name}: ${e}`) };
  }
  return {
    ok: true,
    deck: {
      name: def.name,
      width,
      height,
      walls,
      robotStart,
      droneBay,
      energyCells,
      airlocks: airlockPairs(airlockTiles),
    },
  };
}

/** Linked pairs; digits that don't appear exactly twice are left out (validation reports them). */
function airlockPairs(airlockTiles: ReadonlyMap<number, readonly TilePos[]>): AirlockPair[] {
  return [...airlockTiles.entries()]
    .sort(([a], [b]) => a - b)
    .flatMap(([digit, tiles]) => {
      const [a, b] = tiles;
      return tiles.length !== 2 || a === undefined || b === undefined
        ? []
        : [{ digit, tiles: [a, b] as const }];
    });
}

/**
 * The airlock tile linked to `tile`, or null when `tile` is no airlock.
 * Only robot movement and the reachability check use this; drones treat
 * airlock tiles as plain corridor.
 */
export function airlockPartner(deck: Pick<Deck, 'airlocks'>, tile: TilePos): TilePos | null {
  for (const { tiles: [a, b] } of deck.airlocks) {
    if (a.x === tile.x && a.y === tile.y) return b;
    if (b.x === tile.x && b.y === tile.y) return a;
  }
  return null;
}

function unpairedAirlocks(deck: RawDeck): string[] {
  return [...deck.airlockTiles.entries()]
    .filter(([, tiles]) => tiles.length !== 2)
    .sort(([a], [b]) => a - b)
    .map(
      ([digit, tiles]) =>
        `airlock '${digit}' must appear exactly twice: found ${tiles.length} at ${tiles.map(fmt).join(', ')}`,
    );
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

/** Flood fill over corridor tiles; a paired airlock also leads to its partner. */
function reachableTiles(deck: RawDeck, start: TilePos): Set<string> {
  const airlocks = { airlocks: airlockPairs(deck.airlockTiles) };
  const seen = new Set([key(start)]);
  const queue = [start];
  for (let pos = queue.shift(); pos !== undefined; pos = queue.shift()) {
    const partner = airlockPartner(airlocks, pos);
    const neighbours = DIRECTIONS.map((dir) => step(pos, dir));
    if (partner !== null) neighbours.push(partner);
    for (const next of neighbours) {
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
