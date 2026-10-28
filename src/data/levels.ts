import type { LevelRow } from '../game';

/**
 * Difficulty per level: row 0 is level 1, the last row repeats for higher
 * levels. Tune the game here, not in code.
 */
export const levelTable: readonly LevelRow[] = [
  { robotSpeed: 7, droneSpeed: 5, hunterReleaseDelay: 4 },
];
