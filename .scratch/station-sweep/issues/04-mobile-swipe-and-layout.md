# 04: Mobile: swipe and portrait layout

**What to build:** Swiping anywhere on the screen gives one direction input. The layout is portrait: the deck scales to fit the available width and height, the top and bottom strips never cover it, and the canvas uses the device pixel ratio so the image stays sharp. On desktop, the deck scales sensibly to the window.

**Blocked by:** 01

**Status:** ready-for-agent

- [x] One swipe sends exactly one turn command; the input layer only sends commands and never changes the state directly
- [x] The deck fills the width of a phone in portrait format, stays sharp on high-DPI screens, and the page doesn't scroll
- [x] The desktop window can be resized without distorting the deck
