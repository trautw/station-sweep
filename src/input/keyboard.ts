import type { Command, Direction } from '../game';

const DIRECTION_KEYS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
};

/** Turns keyboard events into game commands. Returns a function that detaches the listener. */
export function attachKeyboard(target: Window, send: (command: Command) => void): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.code === 'Space') {
      event.preventDefault();
      if (!event.repeat) send({ type: 'triggerEmp' });
      return;
    }
    const direction = DIRECTION_KEYS[event.code];
    if (direction === undefined) return;
    event.preventDefault();
    if (!event.repeat) send({ type: 'direction', direction });
  };
  target.addEventListener('keydown', onKeyDown);
  return () => target.removeEventListener('keydown', onKeyDown);
}
