# 05: Airlocks

**What to build:** A digit (`1`–`9`) that appears twice in the grid marks a linked pair of airlocks. When the robot enters one, it comes out of the other and keeps its direction. Drones can't use airlocks: shortest-path searches and drone movement treat them as plain corridor tiles without the link. The two airlocks of a pair look alike. Validation reports digits that don't appear exactly twice, and the reachability check takes airlocks into account.

**Blocked by:** 01, 03

**Status:** done

- [x] Tests: the robot entering an airlock leaves through its partner in the same direction; an unpaired digit produces a validation error; an energy cell reachable only through an airlock counts as reachable
- [x] Airlock pairs are visible and can be told apart in the browser
