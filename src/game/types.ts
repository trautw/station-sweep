// Public types of the game logic interface. Everything a caller (tests,
// rendering, input, sound) may see is declared here.

export const TICKS_PER_SECOND = 60;

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface TilePos {
  readonly x: number;
  readonly y: number;
}

/** A rectangle of tiles, corners inclusive. It may contain walls, but needs at least one corridor tile. */
export interface GuardedArea {
  readonly from: TilePos;
  readonly to: TilePos;
}

/** A Sentinel: starts on `start` (a corridor tile inside `area`) and guards `area`. */
export interface SentinelDefinition {
  readonly start: TilePos;
  readonly area: GuardedArea;
}

/**
 * The drones of one deck. Ticket 07 adds `patrollers` (route waypoints) here.
 */
export interface DeckDrones {
  /** Number of Hunters; they wait in the drone bay `B` and are released one after another. */
  readonly hunters?: number;
  /** Sentinels, each bound to its guarded area. */
  readonly sentinels?: readonly SentinelDefinition[];
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
  /** Seconds a drone hit by an EMP stays shut down (default 5). */
  readonly shutdownTime?: number;
  /** Seconds until a salvaged drone is rebuilt in the drone bay (default 5). */
  readonly rebuildDelay?: number;
  /**
   * A Sentinel chases the robot once the robot is at most this many tiles
   * away (distance between tile centres; default 4).
   */
  readonly sentinelTriggerDistance?: number;
}

/** Lives at the start of a game. */
export const START_LIVES = 3;

/** The robot carries at most this many EMP charges; further charges stay on the deck. */
export const MAX_CARRIED_EMP_CHARGES = 2;

/** Drone speed never exceeds this fraction of the robot speed. */
export const DRONE_SPEED_CAP = 0.9;

export type Command =
  | { readonly type: 'direction'; readonly direction: Direction }
  /** Use up one carried EMP charge (Space / double tap). Does nothing without a charge. */
  | { readonly type: 'triggerEmp' };

/** An EMP shuts down every drone whose tile centre is at most this many tiles from the robot's. */
export const EMP_RADIUS = 5;

export type GameEvent =
  | { readonly type: 'cellCollected'; readonly tile: TilePos }
  | { readonly type: 'empPickedUp'; readonly tile: TilePos }
  | { readonly type: 'empTriggered' }
  /** `points` = 250 x the drone's position in the salvage chain of the current EMP. */
  | { readonly type: 'droneSalvaged'; readonly tile: TilePos; readonly points: number }
  | { readonly type: 'deckCleared' }
  | { readonly type: 'robotCaught' }
  | { readonly type: 'gameOver' };

export type Phase = 'playing' | 'deckCleared' | 'gameOver';

/** Ticket 07 adds 'patroller'. */
export type DroneType = 'hunter' | 'sentinel';

/**
 * What a drone is doing. 'waiting': in the drone bay, not active (cannot catch).
 * 'hunting': heading for the robot by the shortest path.
 * Later tickets add patrolling.
 */
export type DroneMode =
  | 'waiting'
  | 'hunting'
  /** Sentinel moving around inside its guarded area. */
  | 'guarding'
  /** Sentinel (or Patroller) heading for the robot by the shortest path. */
  | 'chasing'
  /** Sentinel heading back to its guarded area after the robot got out of range. */
  | 'returning'
  /** Any type: hit by an EMP, stands still, cannot catch, can be salvaged; then resumes its mode. */
  | 'shutdown'
  /** Any type: salvaged, waiting in the drone bay to be rebuilt; not active. */
  | 'salvaged';

export interface DroneState {
  readonly type: DroneType;
  readonly mode: DroneMode;
  /** Smooth position in tile units; tile centres are at whole numbers. */
  readonly position: TilePos;
  /** The tile the drone is on (nearest tile centre). */
  readonly tile: TilePos;
  readonly direction: Direction;
  /** Seconds of shutdown left (0 unless mode is 'shutdown'); rendering flickers in the last second. */
  readonly shutdownTimeLeft: number;
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
  /** EMP charges still lying on the deck, in row-major order. */
  readonly empCharges: readonly TilePos[];
  /** EMP charges the robot carries (0 to MAX_CARRIED_EMP_CHARGES). */
  readonly carriedEmpCharges: number;
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
