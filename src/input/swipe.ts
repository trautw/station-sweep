import type { Command, Direction } from '../game';

/** Finger travel (CSS px) before a gesture counts as a swipe. */
const SWIPE_THRESHOLD = 24;

/**
 * Turns swipes anywhere on `target` into direction commands. Each gesture
 * (finger down -> finger up) sends at most one command, as soon as the finger
 * has travelled far enough; the dominant axis decides the direction.
 * Mouse pointers are ignored (desktop uses the keyboard).
 * Returns a function that detaches the listeners.
 */
export function attachSwipe(target: Window | HTMLElement, send: (command: Command) => void): () => void {
  let active: { id: number; x: number; y: number; sent: boolean } | null = null;

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
    if (e.type === 'pointerup') onMove(e); // a quick flick may end before a move crossed the threshold
    active = null;
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
