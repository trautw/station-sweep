# 08: Sentinel with guarded area

**What to build:** A deck can define Sentinels, each with a guarded area. A Sentinel moves within its area. When the robot comes within the Sentinel trigger distance, the Sentinel leaves its area and chases the robot. Once the robot is out of range, it returns to its area. Validation reports guarded areas that contain no corridor tile, or wall tiles used as the Sentinel's start.

**Blocked by:** 06

**Status:** ready-for-agent

- [x] Tests: a Sentinel stays in its guarded area while the robot is far away; it chases once the robot is within the trigger distance; it returns to its area once the robot is out of range; an invalid guarded area produces a validation error
- [x] Sentinels have their own recognisable look
