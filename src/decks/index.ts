import type { DeckDefinition } from '../game';
import { testDeck } from './test-deck';

/** All decks, in cycle order. Add new deck modules here. */
export const decks: readonly DeckDefinition[] = [testDeck];
