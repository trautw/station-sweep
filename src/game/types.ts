// Public types of the game logic interface. Everything a caller (tests,
// rendering, input, sound) may see is declared here.

export const TICKS_PER_SECOND = 60;

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface TilePos {
  readonly x: number;
  readonly y: number;
}

/** A deck as authored: a text grid (one string per row) plus, later, typed drone definitions. */
export interface DeckDefinition {
  readonly name: string;
  readonly grid: readonly string[];
}

/**
 * Difficulty values for one level. Row i applies to level i + 1; the last row
 * repeats for all higher levels. Later tickets add drone speed, shutdown time,
 * hunter release delay, rebuild delay and sentinel trigger distance.
 */
export interface LevelRow {
  /** Robot speed in tiles per second. */
  readonly robotSpeed: number;
}

export type Command = { readonly type: 'direction'; readonly direction: Direction };

export type GameEvent =
  | { readonly type: 'cellCollected'; readonly tile: TilePos }
  | { readonly type: 'deckCleared' };

export type Phase = 'playing' | 'deckCleared';

export interface RobotState {
  /** Smooth position in tile units; tile centres are at whole numbers. */
  readonly position: TilePos;
  /** The tile the robot is on (nearest tile centre). */
  readonly tile: TilePos;
  /** Facing direction; kept while stopped. */
  readonly direction: Direction;
  readonly moving: boolean;
  readonly bufferedTurn: Direction | null;
}

/** Two linked airlock tiles, marked in the grid by the same digit. */
export interface AirlockPair {
  readonly digit: number;
  readonly tiles: readonly [TilePos, TilePos];
}

export interface DeckState {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  /** Row-major wall map: walls[y][x]. */
  readonly walls: readonly (readonly boolean[])[];
  /** Linked airlock pairs, ordered by digit. Airlock tiles are corridor tiles. */
  readonly airlocks: readonly AirlockPair[];
}

export interface GameState {
  readonly phase: Phase;
  readonly level: number;
  readonly deck: DeckState;
  readonly robot: RobotState;
  /** Energy cells still lying on the deck, in row-major order. */
  readonly energyCells: readonly TilePos[];
  readonly score: number;
}

export interface Game {
  send(command: Command): void;
  /** Advance the simulation by `ticks` fixed ticks (1/60 s each). */
  tick(ticks?: number): void;
  /** Read-only snapshot of the current state. */
  state(): GameState;
  /** Game events produced during the most recent `tick()` call. */
  events(): readonly GameEvent[];
}

export type CreateGameResult =
  | { readonly ok: true; readonly game: Game }
  | { readonly ok: false; readonly errors: readonly string[] };
