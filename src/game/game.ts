import { parseDeck, type Deck } from './deck';
import {
  createDrones,
  dronePosition,
  droneSnapshot,
  isActive,
  isShutDown,
  resetDrone,
  salvage,
  shutDown,
  updateDrone,
  type Drone,
} from './drone';
import { createRobot, giveDirection, moveRobot, robotSnapshot, type Robot } from './robot';
import {
  DECK_CLEARED_TICKS,
  DRONE_SPEED_CAP,
  EXTRA_LIFE_POINTS,
  MAX_CARRIED_EMP_CHARGES,
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
/** A salvaged drone scores this times its position in the salvage chain. */
const POINTS_PER_SALVAGE = 250;
/** Clearing a deck scores this, plus DECK_BONUS_PER_CHARGE per carried EMP charge. */
const DECK_BONUS = 1000;
const DECK_BONUS_PER_CHARGE = 500;

const tileKey = (t: TilePos): string => `${t.x},${t.y}`;

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
  private phase: Phase = 'title';
  /** The phase a 'paused' game goes back to on resume. */
  private pausedPhase: 'playing' | 'deckCleared' = 'playing';
  private score = 0;
  private lives = START_LIVES;
  /** Index of the current deck in the cycle. */
  private deckIndex = 0;
  private deck: Deck;
  private robot: Robot;
  private drones: Drone[];
  /** Ticks spent in the current 'deckCleared' phase. */
  private deckClearedTicks = 0;
  /** Energy cells still on the deck, keyed by tile. Insertion order is row-major. */
  private energyCells = new Map<string, TilePos>();
  /** EMP charges lying on the deck, keyed by tile (row-major). */
  private empCharges = new Map<string, TilePos>();
  private carriedEmpCharges = 0;
  /** An EMP trigger command waiting for the next tick. */
  private empTriggerPending = false;
  /** EMPs triggered on this deck; numbers each EMP so a shutdown knows which one caused it. */
  private empsTriggered = 0;
  /** Drones salvaged so far per EMP number: the salvage chain of each EMP. */
  private salvageChains = new Map<number, number>();
  /** Ticks since the deck started or since the robot was last caught. */
  private elapsedTicks = 0;
  private lastEvents: GameEvent[] = [];

  constructor(
    private readonly decks: readonly Deck[],
    private readonly levelTable: readonly LevelRow[],
    firstDeck: Deck,
  ) {
    this.deck = firstDeck;
    this.robot = createRobot(firstDeck.robotStart);
    this.drones = createDrones(firstDeck);
    this.loadDeck(firstDeck);
  }

  /**
   * Put `deck` in play: robot (stopped) and drones at their starts, energy
   * cells and EMP charges as authored, Hunter release timer reset.
   * Carried EMP charges, score, lives and level are kept.
   */
  private loadDeck(deck: Deck): void {
    this.deck = deck;
    this.robot = createRobot(deck.robotStart);
    this.drones = createDrones(deck);
    this.energyCells.clear();
    this.empCharges.clear();
    for (const cell of deck.energyCells) this.energyCells.set(tileKey(cell), cell);
    for (const charge of deck.empCharges) this.empCharges.set(tileKey(charge), charge);
    this.elapsedTicks = 0;
    this.empsTriggered = 0;
    this.salvageChains.clear();
    this.empTriggerPending = false;
  }

  /** Back to the start of the game: first deck, level 1, full lives, no score or charges. */
  private newRun(): void {
    const first = this.decks[0];
    if (first === undefined) throw new Error('no decks');
    this.level = 1;
    this.score = 0;
    this.lives = START_LIVES;
    this.carriedEmpCharges = 0;
    this.deckIndex = 0;
    this.loadDeck(first);
    this.phase = 'playing';
  }

  /** The next deck of the cycle; after the last deck the first comes back one level higher. */
  private startNextDeck(events: GameEvent[]): void {
    this.deckIndex++;
    if (this.deckIndex >= this.decks.length) {
      this.deckIndex = 0;
      this.level++;
    }
    const deck = this.decks[this.deckIndex];
    if (deck === undefined) throw new Error('no decks');
    this.loadDeck(deck);
    this.phase = 'playing';
    events.push({ type: 'deckStarted', deck: deck.name, level: this.level });
  }

  send(command: Command): void {
    switch (command.type) {
      case 'start':
        if (this.phase === 'title') this.phase = 'playing';
        return;
      case 'pause':
        if (this.phase === 'playing' || this.phase === 'deckCleared') {
          this.pausedPhase = this.phase;
          this.phase = 'paused';
        }
        return;
      case 'resume':
        if (this.phase === 'paused') this.phase = this.pausedPhase;
        return;
      case 'playAgain':
        if (this.phase === 'gameOver') this.newRun();
        return;
    }
    if (this.phase !== 'playing' && this.phase !== 'deckCleared') return;
    switch (command.type) {
      case 'direction':
        giveDirection(this.robot, command.direction);
        break;
      case 'triggerEmp':
        // Applied at the start of the next tick, so its event shows up in that tick.
        this.empTriggerPending = true;
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
        airlocks: this.deck.airlocks,
      },
      robot: robotSnapshot(this.robot),
      drones: this.drones.map(droneSnapshot),
      energyCells: [...this.energyCells.values()],
      empCharges: [...this.empCharges.values()],
      carriedEmpCharges: this.carriedEmpCharges,
      score: this.score,
      lives: this.lives,
    };
  }

  events(): readonly GameEvent[] {
    return this.lastEvents;
  }

  private step(events: GameEvent[]): void {
    if (this.phase === 'deckCleared') {
      this.empTriggerPending = false;
      this.deckClearedTicks++;
      if (this.deckClearedTicks >= DECK_CLEARED_TICKS) this.startNextDeck(events);
      return;
    }
    if (this.phase !== 'playing') {
      this.empTriggerPending = false;
      return;
    }
    const row = this.levelRow();
    this.elapsedTicks++;
    if (this.empTriggerPending) this.triggerEmp(row, events);
    const robotBefore = robotSnapshot(this.robot).position;
    const dronesBefore = this.drones.map(dronePosition);
    const robotJumped = moveRobot(this.robot, this.deck, row.robotSpeed / TICKS_PER_SECOND);
    this.pickUpEmpCharge(events);
    this.collectEnergyCell(events);
    if (this.phase !== 'playing') return;

    const droneSpeed = Math.min(row.droneSpeed, row.robotSpeed * DRONE_SPEED_CAP);
    const ctx = {
      deck: this.deck,
      robotTile: robotSnapshot(this.robot).tile,
      elapsedTicks: this.elapsedTicks,
      hunterReleaseDelayTicks: row.hunterReleaseDelay * TICKS_PER_SECOND,
      sentinelTriggerDistance: row.sentinelTriggerDistance,
      distance: droneSpeed / TICKS_PER_SECOND,
    };
    for (const drone of this.drones) updateDrone(drone, ctx);

    // An airlock jump is no swap: before the jump is not where the robot came from.
    const robotFrom = robotJumped ? null : robotBefore;
    this.salvageDrones(row, robotFrom, dronesBefore, events);
    if (this.robotCaught(robotFrom, dronesBefore)) this.catchRobot(events);
  }

  /** Use up one carried charge and shut down every drone within the level's EMP radius of the robot. */
  private triggerEmp(row: LevelRow, events: GameEvent[]): void {
    this.empTriggerPending = false;
    if (this.carriedEmpCharges === 0) return;
    this.carriedEmpCharges--;
    const emp = ++this.empsTriggered;
    const robot = robotSnapshot(this.robot).tile;
    const ticks = Math.round(row.shutdownTime * TICKS_PER_SECOND);
    for (const drone of this.drones) {
      const { tile } = droneSnapshot(drone);
      if (Math.hypot(tile.x - robot.x, tile.y - robot.y) <= row.empRadius + 1e-6) shutDown(drone, ticks, emp);
    }
    events.push({ type: 'empTriggered' });
  }

  /** The robot picks up the EMP charge on its tile, unless it already carries the maximum. */
  private pickUpEmpCharge(events: GameEvent[]): void {
    if (this.carriedEmpCharges >= MAX_CARRIED_EMP_CHARGES) return;
    const key = tileKey(robotSnapshot(this.robot).tile);
    const charge = this.empCharges.get(key);
    if (charge === undefined) return;
    this.empCharges.delete(key);
    this.carriedEmpCharges++;
    events.push({ type: 'empPickedUp', tile: charge });
  }

  /** The robot collects the energy cell on the tile it is on (its nearest tile). */
  private collectEnergyCell(events: GameEvent[]): void {
    const { tile } = robotSnapshot(this.robot);
    const key = tileKey(tile);
    const cell = this.energyCells.get(key);
    if (cell === undefined) return;
    this.energyCells.delete(key);
    this.addScore(POINTS_PER_CELL, events);
    events.push({ type: 'cellCollected', tile: cell });
    if (this.energyCells.size === 0) {
      this.phase = 'deckCleared';
      this.deckClearedTicks = 0;
      const bonus = DECK_BONUS + DECK_BONUS_PER_CHARGE * this.carriedEmpCharges;
      events.push({ type: 'deckCleared', bonus });
      this.addScore(bonus, events);
    }
  }

  /** Add points; one extra life for every multiple of EXTRA_LIFE_POINTS the score crosses. */
  private addScore(points: number, events: GameEvent[]): void {
    const before = Math.floor(this.score / EXTRA_LIFE_POINTS);
    this.score += points;
    const after = Math.floor(this.score / EXTRA_LIFE_POINTS);
    for (let i = before; i < after; i++) {
      this.lives++;
      events.push({ type: 'extraLife' });
    }
  }

  /** Salvage every shut-down drone the robot runs into (same overlap rule as being caught). */
  private salvageDrones(
    row: LevelRow,
    robotBefore: TilePos | null,
    dronesBefore: readonly TilePos[],
    events: GameEvent[],
  ): void {
    const ticks = Math.round(row.rebuildDelay * TICKS_PER_SECOND);
    this.drones.forEach((drone, i) => {
      if (!isShutDown(drone) || !this.touches(drone, robotBefore, dronesBefore[i])) return;
      const { tile } = droneSnapshot(drone);
      const chain = (this.salvageChains.get(drone.shutdownBy) ?? 0) + 1;
      this.salvageChains.set(drone.shutdownBy, chain);
      const points = POINTS_PER_SALVAGE * chain;
      this.addScore(points, events);
      salvage(drone, this.deck.droneBay, ticks);
      events.push({ type: 'droneSalvaged', tile, points });
    });
  }

  /**
   * Caught by an active drone that overlaps the robot by more than half a
   * tile, or that swapped positions with it during this tick.
   */
  private robotCaught(robotBefore: TilePos | null, dronesBefore: readonly TilePos[]): boolean {
    return this.drones.some(
      (drone, i) => isActive(drone) && this.touches(drone, robotBefore, dronesBefore[i]),
    );
  }

  /**
   * The robot overlaps `drone` by more than half a tile, or they swapped
   * positions this tick. `robotBefore` is null after an airlock jump.
   */
  private touches(drone: Drone, robotBefore: TilePos | null, droneBefore: TilePos | undefined): boolean {
    const robot = robotSnapshot(this.robot).position;
    const pos = dronePosition(drone);
    if (Math.hypot(pos.x - robot.x, pos.y - robot.y) < CATCH_DISTANCE) return true;
    return robotBefore !== null && swapped(robotBefore, robot, droneBefore ?? pos, pos);
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

/**
 * Robot and drone passed through each other during the tick, along a row,
 * a column or around a junction: the drone's position relative to the robot
 * flipped to the other side, and on the way (moving in a straight line from
 * the tick's start to its end) the two came closer than half a tile.
 */
function swapped(robotFrom: TilePos, robotTo: TilePos, droneFrom: TilePos, droneTo: TilePos): boolean {
  const from = { x: robotFrom.x - droneFrom.x, y: robotFrom.y - droneFrom.y };
  const to = { x: robotTo.x - droneTo.x, y: robotTo.y - droneTo.y };
  if (from.x * to.x + from.y * to.y >= 0) return false;
  const d = { x: to.x - from.x, y: to.y - from.y };
  const t = Math.min(1, Math.max(0, -(from.x * d.x + from.y * d.y) / (d.x * d.x + d.y * d.y)));
  return Math.hypot(from.x + t * d.x, from.y + t * d.y) < CATCH_DISTANCE;
}
