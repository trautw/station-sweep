# 03: Deck validation

**What to build:** Creating a game from an invalid deck returns a list of errors instead of a game. Initial rules: exactly one `R`, exactly one `B` (the drone bay; parse `B` here even if drones come later), and every energy cell reachable from `R`. Set the validation up so later tickets can add rules (airlocks, waypoints, guarded areas, EMP charges).

**Blocked by:** 01

**Status:** done

- [x] Tests: a missing or duplicated `R` or `B` produces a clear error; an unreachable energy cell produces an error naming its position; a valid deck produces no errors
- [x] The test deck used by the app passes validation
