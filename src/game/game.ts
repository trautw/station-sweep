import { parseDeck, type Deck } from './deck';
import { createRobot, giveDirection, moveRobot, robotSnapshot, type Robot } from './robot';
import {
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
  private deck: Deck;
  private robot: Robot;
  /** Energy cells still on the deck, keyed by tile. Insertion order is row-major. */
  private energyCells = new Map<string, TilePos>();
  private lastEvents: GameEvent[] = [];

  constructor(
    _decks: readonly Deck[],
    private readonly levelTable: readonly LevelRow[],
    firstDeck: Deck,
  ) {
    this.deck = firstDeck;
    this.robot = createRobot(firstDeck.robotStart);
    for (const cell of firstDeck.energyCells) this.energyCells.set(tileKey(cell), cell);
  }

  send(command: Command): void {
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
      energyCells: [...this.energyCells.values()],
      score: this.score,
    };
  }

  events(): readonly GameEvent[] {
    return this.lastEvents;
  }

  private step(events: GameEvent[]): void {
    if (this.phase !== 'playing') return;
    moveRobot(this.robot, this.deck, this.levelRow().robotSpeed / TICKS_PER_SECOND);
    this.collectEnergyCell(events);
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

  private levelRow(): LevelRow {
    const index = Math.min(this.level, this.levelTable.length) - 1;
    const row = this.levelTable[index];
    if (row === undefined) throw new Error('level table is empty');
    return row;
  }
}
