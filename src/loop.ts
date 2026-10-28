import { TICKS_PER_SECOND } from './game';

const TICK_MS = 1000 / TICKS_PER_SECOND;
/** Cap catch-up after a long frame (e.g. a background tab) so we never spiral. */
const MAX_TICKS_PER_FRAME = 10;

/**
 * Converts real time into fixed game ticks with requestAnimationFrame and a
 * time accumulator. Calls `tick(n)` with whole ticks, then `render()`.
 */
export function startLoop(tick: (ticks: number) => void, render: () => void): () => void {
  let last = performance.now();
  let accumulator = 0;
  let frame = 0;

  const onFrame = (now: number) => {
    accumulator += now - last;
    last = now;
    let ticks = Math.floor(accumulator / TICK_MS);
    accumulator -= ticks * TICK_MS;
    if (ticks > MAX_TICKS_PER_FRAME) {
      ticks = MAX_TICKS_PER_FRAME;
      accumulator = 0;
    }
    if (ticks > 0) tick(ticks);
    render();
    frame = requestAnimationFrame(onFrame);
  };
  frame = requestAnimationFrame(onFrame);
  return () => cancelAnimationFrame(frame);
}
