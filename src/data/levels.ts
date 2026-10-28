import type { LevelRow } from '../game';

/**
 * Difficulty per level: row 0 is level 1, the last row repeats for higher
 * levels. Tune the game here, not in code. Drone speed is also capped in code
 * at DRONE_SPEED_CAP x robotSpeed (6.3 here), so it never reaches the robot's.
 */
export const levelTable: readonly LevelRow[] = [
  { robotSpeed: 7, droneSpeed: 5, hunterReleaseDelay: 4, sentinelTriggerDistance: 4, shutdownTime: 5, rebuildDelay: 5 },
  { robotSpeed: 7, droneSpeed: 5.4, hunterReleaseDelay: 3.5, sentinelTriggerDistance: 4.5, shutdownTime: 4.5, rebuildDelay: 4.5 },
  { robotSpeed: 7, droneSpeed: 5.8, hunterReleaseDelay: 3, sentinelTriggerDistance: 5, shutdownTime: 4, rebuildDelay: 4 },
  { robotSpeed: 7, droneSpeed: 6.1, hunterReleaseDelay: 2.5, sentinelTriggerDistance: 5, shutdownTime: 3.5, rebuildDelay: 3.5 },
];
