# 09: EMP: collect, trigger, shutdown, salvage

**What to build:** `E` in the grid places an EMP charge. The robot picks one up by driving over it and can carry at most 2; any further charge stays where it lies. The trigger command (Space on desktop, double tap on mobile) uses up one charge and shuts down every drone within about 5 tiles. Triggering with no charges does nothing. Shut-down drones stand still for the shutdown time, the state exposes the time left so rendering can flicker in the last second, and shut-down drones can't catch the robot. Driving into a shut-down drone salvages it: 250 × its position in the chain points within one EMP. A salvaged drone is rebuilt in the drone bay after a delay. A rebuilt Hunter hunts again right away. (Rebuilt Patrollers and Sentinels are handled in ticket 10.) The bottom strip shows the carried charges (0–2). Validation includes EMP charges in the reachability check.

**Blocked by:** 02, 06

**Status:** ready-for-agent

- [x] Tests: picking up a charge; at most 2 carried and a third stays on the deck; triggering with no charges does nothing; only drones within the radius are shut down; a shut-down drone stands still and can't catch the robot; it wakes up after the shutdown time; the salvage chain scores 250, 500, 750; a salvaged Hunter is rebuilt in the drone bay after the delay and hunts again
- [ ] Space and double tap trigger an EMP; shut-down drones flicker in their last second; the bottom strip shows the charges
