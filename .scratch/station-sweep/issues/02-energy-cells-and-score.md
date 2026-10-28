# 02: Collect energy cells and score points

**What to build:** `.` in the deck grid places an energy cell. The robot collects a cell by driving over it, which adds 10 points and emits a "cell collected" event. When every energy cell has been collected, the game switches to the "deck cleared" phase. The top strip shows the score.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Energy cells are drawn and disappear when collected
- [ ] The score in the top strip goes up by 10 for each energy cell
- [ ] Tests: collecting a cell adds 10 points and emits an event; collecting the last cell moves the game to "deck cleared"
