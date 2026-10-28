// Public types of the game logic interface. Everything a caller (tests,
// rendering, input, sound) may see is declared here.

export const TICKS_PER_SECOND = 60;

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface TilePos {
  readonly x: number;
  readonly y: number;
}

/**
 * The drones of one deck. Tickets 07/08 add `patrollers` (route waypoints)
 * and `sentinels` (guarded area) here.
 */
export interface DeckDrones {
  /** Number of Hunters; they wait in the drone bay `B` and are released one after another. */
  readonly hunters?: number;
}

/** A deck as authored: a text grid (one string per row) plus typed drone definitions. */
export interface DeckDefinition {
  readonly name: string;
  readonly grid: readonly string[];
  readonly drones?: DeckDrones;
}

/**
 * Difficulty values for one level. Row i applies to level i + 1; the last row
 * repeats for all higher levels. Later tickets add drone speed, shutdown time,
 * hunter release delay, rebuild delay and sentinel trigger distance.
 */
export interface LevelRow {
  /** Robot speed in tiles per second. */
  readonly robotSpeed: number;
  /**
   * Drone speed in tiles per second (default 5). Always capped below the
   * robot speed (see DRONE_SPEED_CAP).
   */
  readonly droneSpeed?: number;
  /** Seconds between Hunter releases from the drone bay (default 3). */
  readonly hunterReleaseDelay?: number;
}

/** Lives at the start of a game. */
export const START_LIVES = 3;

/** Drone speed never exceeds this fraction of the robot speed. */
export const DRONE_SPEED_CAP = 0.9;

export type Command = { readonly type: 'direction'; readonly direction: Direction };

export type GameEvent =
  | { readonly type: 'cellCollected'; readonly tile: TilePos }
  | { readonly type: 'deckCleared' }
  | { readonly type: 'robotCaught' }
  | { readonly type: 'gameOver' };

export type Phase = 'playing' | 'deckCleared' | 'gameOver';

/** Tickets 07/08 add 'patroller' | 'sentinel'. */
export type DroneType = 'hunter';

/**
 * What a drone is doing. 'waiting': in the drone bay, not active (cannot catch).
 * 'hunting': heading for the robot by the shortest path. Later tickets add
 * patrolling/chasing/guarding/returning and shutdown/salvaged.
 */
export type DroneMode = 'waiting' | 'hunting';

export interface DroneState {
  readonly type: DroneType;
  readonly mode: DroneMode;
  /** Smooth position in tile units; tile centres are at whole numbers. */
  readonly position: TilePos;
  /** The tile the drone is on (nearest tile centre). */
  readonly tile: TilePos;
  readonly direction: Direction;
}

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
  readonly drones: readonly DroneState[];
  /** Energy cells still lying on the deck, in row-major order. */
  readonly energyCells: readonly TilePos[];
  readonly score: number;
  readonly lives: number;
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
