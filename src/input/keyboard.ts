import type { Command, Direction, Phase } from '../game';

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

/**
 * Turns keyboard events into game commands. `phase` is read (never changed) so
 * one key can mean the command that fits: Enter/Space start on the title
 * screen, Enter plays again after game over, Space triggers an EMP, and
 * P/Escape pause or resume.
 * Returns a function that detaches the listener.
 */
export function attachKeyboard(
  target: Window,
  send: (command: Command) => void,
  phase: () => Phase,
): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    const command = commandFor(event.code, phase());
    if (command === undefined) return;
    event.preventDefault();
    if (!event.repeat) send(command);
  };
  target.addEventListener('keydown', onKeyDown);
  return () => target.removeEventListener('keydown', onKeyDown);
}

function commandFor(code: string, phase: Phase): Command | undefined {
  if (code === 'KeyP' || code === 'Escape') {
    return phase === 'paused' ? { type: 'resume' } : { type: 'pause' };
  }
  if (code === 'Enter' || code === 'Space') {
    if (phase === 'title') return { type: 'start' };
    // Only Enter: a Space meant as a last-second EMP must not skip the game over screen.
    if (phase === 'gameOver') return code === 'Enter' ? { type: 'playAgain' } : undefined;
    if (code === 'Space') return { type: 'triggerEmp' };
    return undefined;
  }
  const direction = DIRECTION_KEYS[code];
  return direction === undefined ? undefined : { type: 'direction', direction };
}
