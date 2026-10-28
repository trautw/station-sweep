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
} from './types';

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
  private deck: Deck;
  private robot: Robot;
  private lastEvents: GameEvent[] = [];

  constructor(
    _decks: readonly Deck[],
    private readonly levelTable: readonly LevelRow[],
    firstDeck: Deck,
  ) {
    this.deck = firstDeck;
    this.robot = createRobot(firstDeck.robotStart);
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
    for (let i = 0; i < ticks; i++) this.step();
    this.lastEvents = events;
  }

  state(): GameState {
    return {
      phase: 'playing',
      level: this.level,
      deck: {
        name: this.deck.name,
        width: this.deck.width,
        height: this.deck.height,
        walls: this.deck.walls,
      },
      robot: robotSnapshot(this.robot),
    };
  }

  events(): readonly GameEvent[] {
    return this.lastEvents;
  }

  private step(): void {
    moveRobot(this.robot, this.deck, this.levelRow().robotSpeed / TICKS_PER_SECOND);
  }

  private levelRow(): LevelRow {
    const index = Math.min(this.level, this.levelTable.length) - 1;
    const row = this.levelTable[index];
    if (row === undefined) throw new Error('level table is empty');
    return row;
  }
}
