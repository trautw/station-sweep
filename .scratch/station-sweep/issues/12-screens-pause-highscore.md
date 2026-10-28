# 12: Screens, pause, highscore

**What to build:**
- **Title screen:** shows the game name, a Start action and the highscore.
- **Deck cleared:** a short message, after which the next deck starts automatically.
- **Game over:** shows the final score, a "Play again" action, and a notice when a new highscore was set.
- **Pause:** a phase of the game logic. P, Escape, the ⏸ button in the bottom strip and switching tabs (`visibilitychange`) all pause the game. P, Escape and the button resume it.
- **Highscore:** shown in the top strip. The shell layer stores it in localStorage, guarded with try/catch so the game keeps working when storage is unavailable.

**Blocked by:** 11

**Status:** done

- [x] Tests: the start and play-again commands produce the right phases; while paused, ticks change nothing; resuming continues the game
- [x] In the browser, every screen works with both keyboard and touch; switching tabs pauses the game; the highscore survives a reload; the game runs without errors when storage is blocked
