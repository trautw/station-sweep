import type { DeckDefinition } from '../game';
import { cargoHold } from './cargo-hold';
import { dockingSpine } from './docking-spine';
import { habRing } from './hab-ring';
import { reactorCore } from './reactor-core';

/** All decks, in cycle order (easiest first). Add new deck modules here. */
export const decks: readonly DeckDefinition[] = [habRing, cargoHold, reactorCore, dockingSpine];
