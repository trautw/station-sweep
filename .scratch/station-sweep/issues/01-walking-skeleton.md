# 01: Walking skeleton: robot moves on a deck

**What to build:** Set up the project (TypeScript, Vite, Vitest, HTML5 Canvas). Build the pure game logic behind the single test seam described in the spec: create a game from decks plus a level table, send commands, advance fixed ticks, then read the state snapshot and events. Parse a deck text grid with walls (`#`), corridors (space) and the robot start (`R`). The robot moves on its own along corridors, takes buffered turns at the next junction that allows them, stops at walls, and can reverse at any time. Wire up a thin game loop (requestAnimationFrame with a time accumulator), keyboard input (arrow keys and WASD), and canvas rendering of the deck and robot, drawn in code. Use one simple test deck for now.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `npm run dev` shows a deck with walls and the robot, and the robot can be steered with the arrow keys and WASD
- [x] `npm test` runs Vitest tests against the game logic interface only
- [x] The game logic has no access to DOM, canvas, audio, timers or storage
- [x] Tests: the robot keeps moving until a wall; a buffered turn is taken at the next junction; a newer direction input replaces the buffered turn; reversing works immediately; the robot stops at a wall and keeps the buffered turn
- [x] Uses the vocabulary from GLOSSARY.md (deck, robot, tile, junction, buffered turn)
