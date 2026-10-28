// Test-only helper: a complete level table row with readable defaults, so a
// test only spells out the values it depends on.
import type { LevelRow } from './index';

/** Robot 6 tiles/s (10 ticks per tile), drones 5 tiles/s, every delay 5 s except Hunter release (3 s). */
export function levelRow(overrides: Partial<LevelRow> = {}): LevelRow {
  return {
    robotSpeed: 6,
    droneSpeed: 5,
    hunterReleaseDelay: 3,
    shutdownTime: 5,
    rebuildDelay: 5,
    sentinelTriggerDistance: 4,
    empRadius: 5,
    ...overrides,
  };
}
