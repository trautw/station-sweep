import { parseDeck, type Deck } from './deck';
import {
  createDrones,
  dronePosition,
  droneSnapshot,
  isActive,
  resetDrone,
  updateDrone,
  type Drone,
} from './drone';
import { createRobot, giveDirection, moveRobot, robotSnapshot, type Robot } from './robot';
import {
  DRONE_SPEED_CAP,
  START_LIVES,
  TICKS_PER_SECOND,
  type Command,
  type CreateGameResult,
  type DeckDefinition,
  type Game,
  type GameEvent,
  type GameState,
  type LevelRow,
  type Phase,
  type TilePos,
} from './types';

const POINTS_PER_CELL = 10;

const tileKey = (t: TilePos): string => `${t.x},${t.y}`;

/** Fallbacks for optional level table fields. Real values live in src/data/levels.ts. */
const DEFAULT_DRONE_SPEED = 5;
const DEFAULT_HUNTER_RELEASE_DELAY = 3;

/** Caught when robot and an active drone are closer than this (overlap of more than half a tile). */
const CATCH_DISTANCE = 0.5 - 1e-6;

/**
 * Create a game from its decks (in cycle order) and the level table.
 * Returns the list of deck errors instead of a game when any deck is invalid.
 */
export function createGame(
  deckDefs: readonly DeckDefinition[],
  levelTable: readonly LevelRow[],
): CreateGameResult {
  const errors: string[] = [];
  const decks: Deck[] = [];
  if (deckDefs.length === 0) errors.push('no decks given');
  if (levelTable.length === 0) errors.push('level table is empty');
  for (const def of deckDefs) {
    const parsed = parseDeck(def);
    if (parsed.ok) decks.push(parsed.deck);
    else errors.push(...parsed.errors);
  }
  const firstDeck = decks[0];
  if (errors.length > 0 || firstDeck === undefined) return { ok: false, errors };
  return { ok: true, game: new Simulation(decks, levelTable, firstDeck) };
}

class Simulation implements Game {
  private level = 1;
  private phase: Phase = 'playing';
  private score = 0;
  private lives = START_LIVES;
  private deck: Deck;
  private robot: Robot;
  private drones: Drone[];
  /** Energy cells still on the deck, keyed by tile. Insertion order is row-major. */
  private energyCells = new Map<string, TilePos>();
  /** Ticks since the deck started or since the robot was last caught. */
  private elapsedTicks = 0;
  private lastEvents: GameEvent[] = [];

  constructor(
    _decks: readonly Deck[],
    private readonly levelTable: readonly LevelRow[],
    firstDeck: Deck,
  ) {
    this.deck = firstDeck;
    this.robot = createRobot(firstDeck.robotStart);
    this.drones = createDrones(firstDeck);
    for (const cell of firstDeck.energyCells) this.energyCells.set(tileKey(cell), cell);
  }

  send(command: Command): void {
    if (this.phase === 'gameOver') return;
    switch (command.type) {
      case 'direction':
        giveDirection(this.robot, command.direction);
        break;
    }
  }

  tick(ticks = 1): void {
    const events: GameEvent[] = [];
    for (let i = 0; i < ticks; i++) this.step(events);
    this.lastEvents = events;
  }

  state(): GameState {
    return {
      phase: this.phase,
      level: this.level,
      deck: {
        name: this.deck.name,
        width: this.deck.width,
        height: this.deck.height,
        walls: this.deck.walls,
      },
      robot: robotSnapshot(this.robot),
      drones: this.drones.map(droneSnapshot),
      energyCells: [...this.energyCells.values()],
      score: this.score,
      lives: this.lives,
    };
  }

  events(): readonly GameEvent[] {
    return this.lastEvents;
  }

  private step(events: GameEvent[]): void {
    if (this.phase !== 'playing') return;
    const row = this.levelRow();
    this.elapsedTicks++;
    const robotBefore = robotSnapshot(this.robot).position;
    const dronesBefore = this.drones.map(dronePosition);
    moveRobot(this.robot, this.deck, row.robotSpeed / TICKS_PER_SECOND);
    this.collectEnergyCell(events);
    if (this.phase !== 'playing') return;

    const droneSpeed = Math.min(
      row.droneSpeed ?? DEFAULT_DRONE_SPEED,
      row.robotSpeed * DRONE_SPEED_CAP,
    );
    const ctx = {
      deck: this.deck,
      robotTile: robotSnapshot(this.robot).tile,
      elapsedTicks: this.elapsedTicks,
      hunterReleaseDelayTicks:
        (row.hunterReleaseDelay ?? DEFAULT_HUNTER_RELEASE_DELAY) * TICKS_PER_SECOND,
      distance: droneSpeed / TICKS_PER_SECOND,
    };
    for (const drone of this.drones) updateDrone(drone, ctx);

    if (this.robotCaught(robotBefore, dronesBefore)) this.catchRobot(events);
  }

  /** The robot collects the energy cell on the tile it is on (its nearest tile). */
  private collectEnergyCell(events: GameEvent[]): void {
    const { tile } = robotSnapshot(this.robot);
    const key = tileKey(tile);
    const cell = this.energyCells.get(key);
    if (cell === undefined) return;
    this.energyCells.delete(key);
    this.score += POINTS_PER_CELL;
    events.push({ type: 'cellCollected', tile: cell });
    if (this.energyCells.size === 0) {
      this.phase = 'deckCleared';
      events.push({ type: 'deckCleared' });
    }
  }

  /**
   * Caught by an active drone that overlaps the robot by more than half a
   * tile, or that swapped positions with it during this tick.
   */
  private robotCaught(robotBefore: TilePos, dronesBefore: readonly TilePos[]): boolean {
    const robot = robotSnapshot(this.robot).position;
    return this.drones.some((drone, i) => {
      if (!isActive(drone)) return false;
      const pos = dronePosition(drone);
      if (Math.hypot(pos.x - robot.x, pos.y - robot.y) < CATCH_DISTANCE) return true;
      const before = dronesBefore[i] ?? pos;
      return swapped(robotBefore, robot, before, pos);
    });
  }

  /** Lose a life; reset robot and drones to their start positions. Energy cells stay as they are. */
  private catchRobot(events: GameEvent[]): void {
    this.lives--;
    events.push({ type: 'robotCaught' });
    if (this.lives <= 0) {
      this.phase = 'gameOver';
      events.push({ type: 'gameOver' });
      return;
    }
    this.robot = createRobot(this.deck.robotStart);
    for (const drone of this.drones) resetDrone(drone);
    this.elapsedTicks = 0;
  }

  private levelRow(): LevelRow {
    const index = Math.min(this.level, this.levelTable.length) - 1;
    const row = this.levelTable[index];
    if (row === undefined) throw new Error('level table is empty');
    return row;
  }
}

/** Robot and drone stayed on one row (or column) and passed through each other along it. */
function swapped(robotFrom: TilePos, robotTo: TilePos, droneFrom: TilePos, droneTo: TilePos): boolean {
  const same = (a: number, b: number, c: number, d: number) =>
    Math.abs(a - b) < 1e-6 && Math.abs(a - c) < 1e-6 && Math.abs(a - d) < 1e-6;
  const crossed = (r0: number, r1: number, d0: number, d1: number) =>
    Math.sign(r0 - d0) * Math.sign(r1 - d1) < 0;
  if (same(robotFrom.y, robotTo.y, droneFrom.y, droneTo.y)) {
    return crossed(robotFrom.x, robotTo.x, droneFrom.x, droneTo.x);
  }
  if (same(robotFrom.x, robotTo.x, droneFrom.x, droneTo.x)) {
    return crossed(robotFrom.y, robotTo.y, droneFrom.y, droneTo.y);
  }
  return false;
}
