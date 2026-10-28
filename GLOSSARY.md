# Station Sweep

An original single-player maze-chase game set on a space station: a maintenance robot collects energy cells on the station's decks while hunted by drones.

## Language

### Structure

**Deck**:
One maze layout of the station; the game moves from deck to deck.
_Avoid_: Maze, map, stage, board

**Level**:
How far the player has progressed in difficulty, counted across all decks played.
_Avoid_: Round, wave

### Actors

**Robot**:
The player-controlled maintenance unit, named Unit-7.
_Avoid_: Player, hero, Pac-Man

**Drone**:
A hostile machine on a deck that hunts the robot; every drone is a Patroller, Hunter or Sentinel.
_Avoid_: Ghost, enemy, monster

**Patroller**:
A drone that follows a fixed route and only chases the robot while it has line of sight.
_Avoid_: Guard, walker

**Hunter**:
A drone that always heads for the robot by the shortest path, slower than the robot.
_Avoid_: Chaser, seeker

**Sentinel**:
A drone bound to a guarded area that it only leaves when the robot comes close.
_Avoid_: Guard, turret

**Line of sight**:
The robot is in line of sight of a drone when both are in the same straight corridor with no wall between them.
_Avoid_: Vision, detection

**Guarded area**:
The region of a deck a sentinel is bound to.
_Avoid_: Zone, territory

**Shutdown**:
The state of a drone hit by an EMP: it stops moving for a short time and can be salvaged.
_Avoid_: Frightened, scared, stunned, vulnerable

**Salvage**:
The robot removing a shut-down drone by driving into it.
_Avoid_: Eat, kill, destroy

**Drone bay**:
The place on a deck where salvaged drones are rebuilt and from which hunters are released.
_Avoid_: Ghost house, pen, spawn

### Items

**Energy cell**:
A collectible lying in the corridors; collecting all of them clears the deck.
_Avoid_: Dot, pellet, pill

**EMP charge**:
A collectible the robot carries (at most two) and triggers deliberately to shut down drones.
_Avoid_: Power pellet, power-up, energizer, bomb

### Movement

**Tile**:
One cell of the grid a deck is built from; every position on a deck is a tile.
_Avoid_: Cell, square, field

**Junction**:
A tile where the robot can change direction because more than one way out is open.
_Avoid_: Intersection, crossing

**Airlock**:
One of a linked pair of tiles; the robot entering one leaves through the other. Drones cannot use airlocks.
_Avoid_: Tunnel, portal, teleporter, warp

**Buffered turn**:
A direction the player gave early, which the robot takes at the next junction that allows it.
_Avoid_: Queued input, pre-turn
