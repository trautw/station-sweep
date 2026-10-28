import type { Command, Direction } from '../game';

/** Finger travel (CSS px) before a gesture counts as a swipe. */
const SWIPE_THRESHOLD = 24;
/** Two taps (gestures that never became a swipe) within this many ms trigger an EMP. */
const DOUBLE_TAP_MS = 300;
/** ...and no further apart than this (CSS px). */
const DOUBLE_TAP_DISTANCE = 40;

/**
 * Turns swipes anywhere on `target` into direction commands. Each gesture
 * (finger down -> finger up) sends at most one command, as soon as the finger
 * has travelled far enough; the dominant axis decides the direction.
 * A double tap (two quick taps close together) sends `triggerEmp`.
 * Mouse pointers are ignored (desktop uses the keyboard).
 * Returns a function that detaches the listeners.
 */
export function attachSwipe(target: Window | HTMLElement, send: (command: Command) => void): () => void {
  let active: { id: number; x: number; y: number; sent: boolean } | null = null;
  let lastTap: { time: number; x: number; y: number } | null = null;

  const onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' || !e.isPrimary) return;
    active = { id: e.pointerId, x: e.clientX, y: e.clientY, sent: false };
  };
  const onMove = (e: PointerEvent) => {
    if (!active || e.pointerId !== active.id || active.sent) return;
    const direction = swipeDirection(e.clientX - active.x, e.clientY - active.y);
    if (direction === null) return;
    active.sent = true;
    send({ type: 'direction', direction });
  };
  const onEnd = (e: PointerEvent) => {
    if (!active || e.pointerId !== active.id) return;
    if (e.type === 'pointerup') {
      onMove(e); // a quick flick may end before a move crossed the threshold
      if (!active.sent) onTap(e);
    }
    active = null;
  };

  const onTap = (e: PointerEvent) => {
    // Taps on buttons (pause, mute) are theirs, not a half of a double tap.
    if (e.target instanceof Element && e.target.closest('button')) return;
    const tap = { time: e.timeStamp, x: e.clientX, y: e.clientY };
    if (
      lastTap &&
      tap.time - lastTap.time <= DOUBLE_TAP_MS &&
      Math.hypot(tap.x - lastTap.x, tap.y - lastTap.y) <= DOUBLE_TAP_DISTANCE
    ) {
      send({ type: 'triggerEmp' });
      lastTap = null;
      return;
    }
    lastTap = tap;
  };

  const listeners: [string, (e: PointerEvent) => void][] = [
    ['pointerdown', onDown],
    ['pointermove', onMove],
    ['pointerup', onEnd],
    ['pointercancel', onEnd],
  ];
  for (const [type, fn] of listeners) target.addEventListener(type, fn as EventListener);
  return () => {
    for (const [type, fn] of listeners) target.removeEventListener(type, fn as EventListener);
  };
}

function swipeDirection(dx: number, dy: number): Direction | null {
  if (Math.hypot(dx, dy) < SWIPE_THRESHOLD) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}
