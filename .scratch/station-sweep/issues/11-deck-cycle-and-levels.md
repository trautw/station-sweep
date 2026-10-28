# 11: Deck cycle, level table, bonuses, extra lives

**What to build:** The game plays its decks in order. After the last deck, the cycle starts again on a level one higher. One level table holds, per level: drone speed (always capped below the robot's speed), shutdown time, Hunter release delay, rebuild delay and Sentinel trigger distance. Its last row also applies to all higher levels. Clearing a deck awards 1,000 points plus 500 per EMP charge still carried. Charges carry over to the next deck. An extra life is awarded each time the score crosses a multiple of 5,000. The top strip shows the level.

**Blocked by:** 09

**Status:** ready-for-agent

- [ ] Tests: clearing a deck moves to the next deck; after the last deck, the level goes up and the first deck comes back; values are taken from the level table, with the last row used beyond its end; drone speed never reaches the robot's speed; the deck bonus counts carried charges; charges carry over; an extra life is awarded at 5,000 and 10,000 points
