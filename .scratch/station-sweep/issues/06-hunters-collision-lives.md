# 06: Hunters, drone bay, getting caught, lives

**What to build:** `B` is the drone bay. A deck defines how many Hunters it has. Hunters wait in the drone bay, are released one after another after a delay, and then head for the robot along the shortest path without airlocks, slower than the robot. The robot is caught when it overlaps an active drone by more than half a tile, or when the two swap positions within one tick. Being caught costs a life and puts the robot and all drones back at their start positions, while collected energy cells stay collected. The game starts with 3 lives, and with no lives left it switches to the "game over" phase. The top strip shows the lives. Drones can pass through each other. Put the delay and speed values where ticket 11's level table can take them over later.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Tests: Hunters are released one after another after the delay; a Hunter moves along the shortest path to the robot; a Hunter is slower than the robot; an overlap of more than half a tile counts as caught; swapping positions counts as caught; being caught costs a life and resets positions but not energy cells; losing the last life ends the game
- [ ] Hunters are drawn with their own recognisable look
