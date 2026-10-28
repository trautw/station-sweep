# Spec: Station Sweep

Status: ready-for-human

## Problem Statement

I want to make and play my own browser game in the maze-chase genre: steering through a maze, collecting things, avoiding chasers, and turning the tables with a power-up. Existing games are someone else's design, so they're no use for learning or for having fun with my own ideas. I want an original game that plays well with a keyboard on desktop and with swipes on a phone, and whose logic I can understand and test.

## Solution

**Station Sweep** is an original single-player maze-chase game that runs in desktop and mobile browsers. The player steers the maintenance robot Unit-7 across the decks of a space station and collects every energy cell on each deck. Three kinds of drones hunt the robot: Patrollers, Sentinels and Hunters. The robot can carry up to two EMP charges and trigger them deliberately. An EMP shuts down nearby drones, and the robot can then salvage them for points. Airlocks give the robot escape routes that drones cannot follow. Decks run in a cycle, and each completed cycle raises the level, which makes the drones more dangerous. Graphics are drawn in code, sound is generated with Web Audio, and the highscore is stored in the browser.

## User Stories

### Starting and flow

1. As a player, I want a title screen showing the game name, a Start action and my highscore, so that I know what I'm playing and what score to beat.
2. As a player, I want the game to start on the first deck at level 1 with 3 lives, so that every run starts the same way.
3. As a player, I want a short "Deck cleared" message after collecting every energy cell on a deck, so that I notice my progress before the next deck starts.
4. As a player, I want the next deck to start automatically after the "Deck cleared" message, so that the flow isn't interrupted.
5. As a player, I want the game to return to the first deck at a higher level after the last deck of the cycle, so that the game goes on and gets harder.
6. As a player, I want a game over screen with my final score and a "Play again" action, so that I can start a new run quickly.
7. As a player, I want to see on the game over screen when I've set a new highscore, so that the achievement is recognised.

### Moving the robot

8. As a player, I want the robot to keep moving in its current direction until it hits a wall, so that I don't have to hold a key down.
9. As a player, I want a direction I give early to be remembered and taken at the next junction where it's possible (buffered turn), so that I can corner smoothly without pixel-perfect timing.
10. As a player, I want a new direction input to replace the buffered turn I gave before, so that I can change my mind.
11. As a player, I want to reverse direction immediately in a straight corridor, so that I can escape a drone in front of me.
12. As a player, I want the robot to stop at a wall and keep the buffered turn, so that it moves on as soon as I give a possible direction.
13. As a desktop player, I want to steer with both the arrow keys and WASD, so that I can use whichever layout I'm used to.
14. As a mobile player, I want to swipe anywhere on the screen to give a direction, so that my finger doesn't cover the deck.
15. As a mobile player, I want a single swipe to count as one direction input, so that I don't have to keep my finger on the screen.

### Airlocks

16. As a player, I want the robot to come out of the paired airlock when it enters one, so that I can cross the deck quickly.
17. As a player, I want drones to be unable to use airlocks, so that airlocks are a real escape route.
18. As a player, I want the robot to keep its direction when it leaves an airlock, so that the jump stays predictable.
19. As a player, I want airlock pairs to be visually recognisable, so that I can see which airlock leads where.

### Energy cells

20. As a player, I want the robot to collect an energy cell by driving over it, so that collecting needs no extra action.
21. As a player, I want 10 points per energy cell, so that steady collecting pays off.
22. As a player, I want energy cells I've collected to stay collected when I lose a life, so that progress on a deck isn't lost.

### Drones

23. As a player, I want Patrollers to fly a fixed route, so that I can learn their movement and slip past them.
24. As a player, I want a Patroller to chase the robot as soon as it has line of sight to it, so that I'm punished for carelessly running into its corridor.
25. As a player, I want a Patroller to return to its route after losing line of sight, so that its behaviour stays readable.
26. As a player, I want Sentinels to stay in their guarded area, so that I know which regions are dangerous.
27. As a player, I want a Sentinel to leave its guarded area only when the robot comes close, so that I can bait it out on purpose.
28. As a player, I want a Sentinel to return to its guarded area once the robot is gone, so that the area stays guarded.
29. As a player, I want Hunters to take the shortest path to the robot, so that they put steady pressure on me.
30. As a player, I want Hunters to be slower than the robot, so that I can outrun them by playing well.
31. As a player, I want Hunters to wait in the drone bay and be released one after another after a delay, so that each deck starts calmly before the pressure builds.
32. As a player, I want each drone type to be clearly distinguishable by its look, so that I can predict its behaviour.
33. As a player, I want drones to be able to pass through each other, so that they don't block each other in unexpected ways.

### Being caught and lives

34. As a player, I want the robot to be caught when it overlaps an active drone by more than half a tile, so that collisions feel fair.
35. As a player, I want the robot also to be caught when it and a drone pass through each other between two tiles, so that a drone can't "tunnel through" the robot.
36. As a player, I want to lose a life when caught, with the robot and all drones going back to their start positions, so that I can try again without the deck being reset.
37. As a player, I want to keep my carried EMP charges when I lose a life, so that losing a life isn't a disaster.
38. As a player, I want the game to end when no lives are left, so that there is a clear failure state.
39. As a player, I want an extra life every 5,000 points, so that good play is rewarded with more playing time.
40. As a player, I want a shut-down drone to never catch me, so that an EMP gives me safety.

### EMP charges

41. As a player, I want to pick up an EMP charge by driving over it, so that collecting it needs no extra action.
42. As a player, I want to carry at most two EMP charges, so that I have to decide when to use one.
43. As a player, I want EMP charges to stay where they lie when I'm already carrying two, so that I can come back for them later.
44. As a desktop player, I want to trigger an EMP with the Space key, so that I can trigger it at exactly the right moment.
45. As a mobile player, I want to trigger an EMP with a double tap, so that I can trigger it without a button.
46. As a player, I want triggering with no charges carried to do nothing, so that an accidental double tap does no harm.
47. As a player, I want an EMP to shut down every drone within about 5 tiles of the robot, so that the position where I trigger it matters.
48. As a player, I want shut-down drones to stand still for about 5 seconds, so that I have a window to get away or attack.
49. As a player, I want shut-down drones to flicker in the last second, so that I can see when they're about to wake up.
50. As a player, I want EMP charges I haven't used to carry over to the next deck, so that saving them pays off.

### Salvage and drone bay

51. As a player, I want the robot to salvage a shut-down drone by driving into it, so that I can turn the tables.
52. As a player, I want 250 points for the first salvaged drone of an EMP, plus 250 more for each further one (250, 500, 750, …), so that bold multiple salvages are worth it.
53. As a player, I want a salvaged drone to be rebuilt in the drone bay after a delay, so that the deck doesn't stay empty.
54. As a player, I want a rebuilt drone to keep its type and go back to its route or guarded area along the shortest path, so that the deck stays readable.
55. As a player, I want a rebuilt Hunter to start hunting again right away, so that the pressure comes back.

### Scoring and progress

56. As a player, I want a bonus of 1,000 points plus 500 for each EMP charge I'm carrying when I clear a deck, so that I have to weigh using a charge against saving it.
57. As a player, I want my highscore saved in the browser, so that it's still there next time I play.
58. As a player, I want the game to stay playable when the browser can't save the highscore (e.g. private mode), so that a storage error never stops the game.
59. As a player, I want drones to get faster as the level rises (but never faster than the robot), so that the challenge grows.
60. As a player, I want shutdowns to get shorter as the level rises, so that the EMP takes more skill later on.
61. As a player, I want Hunters to be released sooner as the level rises, so that pressure starts earlier on later decks.

### Status display and screens

62. As a player, I want a strip above the deck showing my score, the highscore, the level and my remaining lives, so that I know where I stand at all times.
63. As a player, I want a strip below the deck showing my carried EMP charges (0–2), so that I know whether I can trigger one.
64. As a player, I want the status strips never to cover the deck, so that nothing important is hidden.
65. As a mobile player, I want the deck to fill the screen width in portrait format and stay sharp, so that I can play comfortably on a phone.
66. As a desktop player, I want the deck to scale sensibly in the browser window, so that it looks good at any window size.

### Pause and sound

67. As a desktop player, I want to pause and resume with P or Escape, so that I can take a break.
68. As a mobile player, I want a ⏸ button that's easy to tap, so that I can pause without a keyboard.
69. As a player, I want the game to pause automatically when I switch tabs or apps, so that I don't lose a life while I'm away.
70. As a player, I want simple sound effects for collecting, triggering an EMP, salvaging, being caught and clearing a deck, so that the game feels lively.
71. As a player, I want a 🔊 button that's always visible to mute and unmute sound, so that I can play quietly.
72. As a mobile player, I want sound to start working after my first tap, so that the browser's audio restrictions don't cause errors.

### Making and maintaining decks

73. As a developer, I want to describe a deck as a readable text grid (`#` wall, `.` energy cell, `E` EMP charge, `R` robot start, `B` drone bay, digit pairs for airlocks), so that I can design decks without tooling.
74. As a developer, I want to define each deck's drones in a type-safe way (Patrollers with route waypoints, Sentinels with a guarded area, the number of Hunters), so that mistakes are caught when the code compiles.
75. As a developer, I want to get clear errors when loading an invalid deck (unreachable energy cells, unpaired airlocks, not exactly one `R`/`B`, waypoints in walls), so that broken decks never reach the game.
76. As a developer, I want all difficulty values per level in one data table, so that I can tune the game without changing code.
77. As a developer, I want 3 to 4 hand-made decks of about 19 × 23 tiles in portrait format, so that the game has enough variety.

## Implementation Decisions

- **Tech stack:** TypeScript, HTML5 Canvas, Vite, Vitest. No game engine, no image or audio files.
- **Layers:** the game is split into four parts:
  - **Game logic (Simulation):** pure TypeScript with no access to DOM, canvas, audio, timers or storage. This is the only module with real behaviour, and the only test seam.
  - **Rendering:** draws a read-only snapshot of the game state onto the canvas. Shapes and glow effects are drawn in code, and it takes the device pixel ratio into account so the image stays sharp.
  - **Input:** turns keyboard events (arrow keys and WASD, Space, P and Escape) and touch events (swipe and double tap) into commands to the game logic. Input never changes the game state directly.
  - **Sound:** reacts to game events from the game logic and plays effects generated with Web Audio. It has a mute setting and starts only after the first user interaction.
- **Game logic interface:**
  - **Create:** a game is created with its decks (in cycle order) and the level table. When a deck is invalid, creation returns a list of errors instead of a game.
  - **Commands:** the game accepts a small set of commands: give a direction, trigger an EMP, pause, resume, start, start again.
  - **Ticks:** the game advances by an explicit number of fixed ticks (60 per second). The game logic never reads the clock itself; a thin game loop (e.g. `requestAnimationFrame` with a time accumulator) converts real time into ticks.
  - **Reading state:** after each tick, the game exposes a read-only state snapshot. It contains the robot (position, direction, buffered turn), every drone (type, mode, position), the remaining energy cells, EMP charges lying on the deck and carried, score, lives, level, the current deck, and the phase (title, playing, paused, deck cleared, game over).
  - **Events:** the game also lists the game events produced in that tick, e.g. energy cell collected, EMP picked up, EMP triggered, drone salvaged, robot caught, deck cleared, extra life, game over. Sound and visual effects react to these events.
- **Movement:** grid-based on tiles with smooth movement between tile centres. A buffered turn is taken at the next junction that allows it. A reversal is possible at any time. Speeds are given in tiles per second, and drone speed is capped below robot speed.
- **Drone behaviour** is modelled per drone as a small set of modes:
  - **Patroller:** patrols its route, chases while it has line of sight, then returns to the route.
  - **Sentinel:** guards its area, chases once the robot comes within a fixed distance, then returns to its area.
  - **Hunter:** waits in the drone bay, then hunts by the shortest path.
  - **All types:** shutdown, salvaged and waiting for rebuild, and returning to the route or guarded area after a rebuild.

  Paths are found by shortest path on the tile grid (e.g. breadth-first search), without airlocks.
- **Line of sight:** the robot and the drone are in the same row or column, with no wall tile between them.
- **Collision:** the robot is caught when it overlaps an active drone by more than half a tile, or when the two swap positions within one tick. Salvaging a shut-down drone uses the same overlap rule.
- **EMP:**
  - **Effect:** shuts down every drone within a radius of about 5 tiles (distance between tile centres) for a shutdown time taken from the level table.
  - **Flicker:** the state includes how much shutdown time is left, so rendering can show the flicker in the last second.
  - **Salvage chain:** salvages within one EMP count up a chain multiplier (250 × n points).
- **Deck format:**
  - **File:** each deck is a TypeScript module containing a text grid and typed drone definitions.
  - **Grid characters:** `#` wall, `.` energy cell, `E` EMP charge, `R` robot start, `B` drone bay, `1`–`9` airlock pairs, and a space for an empty corridor.
  - **Parsing:** a parser turns the grid into the game's internal deck model.
  - **Validation:** checks for exactly one `R` and one `B`, airlock digits that appear exactly twice, every energy cell and EMP charge reachable from `R` (airlocks included), and drone waypoints and guarded areas lying on corridor tiles.
- **Level table:** one data table, with one row per level and the last row repeating for higher levels. It holds drone speed, shutdown time, Hunter release delay, rebuild delay and Sentinel trigger distance.
- **Scoring:**

  | Event | Points |
  | --- | --- |
  | Energy cell | 10 |
  | Salvaged drone | 250 × position in the salvage chain |
  | Deck cleared | 1,000 + 500 per carried EMP charge |

  An extra life is awarded each time the score crosses a multiple of 5,000.
- **Highscore:** stored in localStorage. The game logic only reports the score; the shell layer reads and writes the highscore, guarded with try/catch.
- **Pause:** pause is a phase of the game logic. P, Escape, the ⏸ button and the browser's `visibilitychange` event all trigger the pause command.
- **Layout:** portrait format. A status strip above the deck (score, highscore, level, lives), the deck itself scaled to fit the available width and height, and a status strip below (EMP charges, ⏸ and 🔊 buttons). The buttons are part of the HTML/canvas UI, not of the game logic.
- **Decks:** 3 to 4 hand-made decks of about 19 × 23 tiles. They are original layouts, not modelled on any existing game.

## Testing Decisions

- **The only test seam is the game logic interface:** create a game from a deck, send commands, advance ticks, then check the state snapshot and events. Tests never look at internal helper functions, internal modes or data structures, only at what can be observed from outside.
- **Good tests:**
  - describe behaviour from the player's point of view, e.g. "a buffered turn is taken at the next junction", "a Patroller starts chasing once it has line of sight", "a robot and a drone swapping positions counts as caught", "unused EMP charges carry over to the next deck";
  - use small test decks written as text grids directly in the test, so the setup is readable at a glance;
  - control time only through ticks, so every test is deterministic.
- **Covered in tests:**
  - movement and buffered turns
  - airlocks
  - collecting
  - all three drone types, including line of sight, guarded area, release from the drone bay, rebuild and return
  - collision, including swapping positions
  - EMP (radius, shutdown time, salvage chain, maximum of two carried, carry-over)
  - lives and resets
  - scoring and extra lives
  - deck cycle and level increase from the level table
  - pause phase
  - deck validation, through the error list returned on creation
- **Deck check:** one test loads every real deck and expects zero validation errors.
- **Not tested:** rendering, input, sound and the game loop. They're thin, so they are checked by hand in the browser.
- **Prior art:** none yet, because the repo has no code. The first game logic tests set the pattern.

## Out of Scope

- Multiplayer of any kind (local or online)
- A server, accounts, or online highscore lists
- Gamepad support
- An on-screen D-pad or landscape format
- Image or audio files, sprite sheets, music
- A settings menu (beyond the mute button)
- A level editor or randomly generated decks
- The battery mechanic and bulkheads (ideas for a later version)
- Publishing on the web (runs locally for now; a static Vite build can be published later)
- Copying Pac-Man elements: names, sprites, maze layouts, ghost behaviours, side tunnels or point values

## Further Notes

- The domain vocabulary is defined in `GLOSSARY.md`. Code and tickets should use these terms: deck, robot, drone, Patroller, Hunter, Sentinel, energy cell, EMP charge, shutdown, salvage, drone bay, airlock, buffered turn, junction, tile, level.
- Approximate values (EMP radius 5 tiles, shutdown about 5 seconds, drone speeds) are starting values. They live in the level table and are expected to change during play-testing.
- Each deck should have 2 to 4 EMP charges, at least one airlock pair and a mix of drone types. Decks should be designed to feel fair: no energy cells in dead ends that a Hunter can easily seal off.
