# 07: Patroller with line of sight

**What to build:** A deck can define Patrollers, each with a route given as waypoints. A Patroller flies its route in a loop. While it has line of sight to the robot (same row or column, no wall between), it chases the robot. Once line of sight is lost, it goes back to the nearest point of its route and carries on. Validation reports waypoints that lie in walls.

**Blocked by:** 06

**Status:** ready-for-agent

- [ ] Tests: a Patroller follows its route; it starts chasing as soon as it has line of sight; a wall between them blocks line of sight; it returns to its route after losing line of sight; a waypoint in a wall produces a validation error
- [ ] Patrollers have their own recognisable look
