import { DRONE_SPEED_CAP, TICKS_PER_SECOND, type LevelRow } from './types';

/** A level table row resolved into what the simulation works with: tiles per tick and ticks. */
export interface LevelSettings {
  readonly robotTilesPerTick: number;
  /** Drone speed, capped at DRONE_SPEED_CAP x robot speed. */
  readonly droneTilesPerTick: number;
  readonly hunterReleaseDelayTicks: number;
  readonly shutdownTicks: number;
  readonly rebuildTicks: number;
  /** In tiles, between tile centres. */
  readonly sentinelTriggerDistance: number;
  /** In tiles, between tile centres. */
  readonly empRadius: number;
}

/** Settings for `level` (1-based): row level - 1, the last row repeating for higher levels. */
export function levelSettings(table: readonly LevelRow[], level: number): LevelSettings {
  const row = table[Math.min(level, table.length) - 1];
  if (row === undefined) throw new Error('level table is empty');
  const droneSpeed = Math.min(row.droneSpeed, row.robotSpeed * DRONE_SPEED_CAP);
  return {
    robotTilesPerTick: row.robotSpeed / TICKS_PER_SECOND,
    droneTilesPerTick: droneSpeed / TICKS_PER_SECOND,
    hunterReleaseDelayTicks: row.hunterReleaseDelay * TICKS_PER_SECOND,
    shutdownTicks: Math.round(row.shutdownTime * TICKS_PER_SECOND),
    rebuildTicks: Math.round(row.rebuildDelay * TICKS_PER_SECOND),
    sentinelTriggerDistance: row.sentinelTriggerDistance,
    empRadius: row.empRadius,
  };
}
