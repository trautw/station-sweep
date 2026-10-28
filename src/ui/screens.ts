import type { Command, GameState } from '../game';

export interface ScreenInfo {
  readonly highscore: number;
  /** The run that just ended set a new highscore (shown on the game over screen). */
  readonly newHighscore: boolean;
}

/**
 * HTML overlays over the deck for the game phases: title, paused, deck cleared
 * and game over. Buttons send commands; the game logic decides the phase.
 */
export class Screens {
  private readonly root: HTMLElement;
  private readonly title: HTMLElement;
  private readonly paused: HTMLElement;
  private readonly cleared: HTMLElement;
  private readonly over: HTMLElement;
  private readonly titleHighscore: HTMLElement;
  private readonly finalScore: HTMLElement;
  private readonly newHighscore: HTMLElement;
  private shown: HTMLElement | null = null;

  constructor(container: HTMLElement, send: (command: Command) => void) {
    this.root = el('div', 'screens');
    this.title = screen('title-screen', [
      el('h1', 'game-name', 'STATION SWEEP'),
      el('p', 'tagline', 'Unit-7 reporting for maintenance'),
      button('Start', () => send({ type: 'start' })),
      el('p', 'hint', 'Swipe or arrows / WASD to steer · Space or double tap: EMP'),
      (this.titleHighscore = el('p', 'screen-highscore')),
    ]);
    this.paused = screen('paused-screen', [
      el('h2', '', 'PAUSED'),
      button('Resume', () => send({ type: 'resume' })),
      el('p', 'hint', 'P or Esc to resume'),
    ]);
    this.cleared = screen('cleared-screen', [el('h2', '', 'DECK CLEARED')]);
    this.over = screen('over-screen', [
      el('h2', 'game-over', 'GAME OVER'),
      (this.finalScore = el('p', 'final-score')),
      (this.newHighscore = el('p', 'new-highscore', 'NEW HIGHSCORE!')),
      button('Play again', () => send({ type: 'playAgain' })),
    ]);
    this.root.append(this.title, this.paused, this.cleared, this.over);
    container.append(this.root);
  }

  update(state: GameState, info: ScreenInfo): void {
    const next = this.screenFor(state.phase);
    if (next !== this.shown) {
      this.shown?.classList.remove('visible');
      next?.classList.add('visible');
      this.shown = next;
    }
    this.titleHighscore.textContent = `HIGHSCORE ${info.highscore}`;
    this.finalScore.textContent = `SCORE ${state.score}`;
    this.newHighscore.hidden = !info.newHighscore;
  }

  private screenFor(phase: GameState['phase']): HTMLElement | null {
    switch (phase) {
      case 'title':
        return this.title;
      case 'paused':
        return this.paused;
      case 'deckCleared':
        return this.cleared;
      case 'gameOver':
        return this.over;
      case 'playing':
        return null;
    }
  }
}

function el(tag: string, className: string, text?: string): HTMLElement {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

function screen(id: string, children: HTMLElement[]): HTMLElement {
  const s = el('div', 'screen');
  s.id = id;
  s.append(...children);
  return s;
}

/**
 * A button that drops focus after a click, so a later Space (EMP) or Enter
 * key press goes to the keyboard handler instead of clicking it again.
 */
export function button(label: string, onClick: () => void, className = 'screen-button'): HTMLElement {
  const b = el('button', className, label);
  b.setAttribute('type', 'button');
  b.addEventListener('click', () => {
    b.blur();
    onClick();
  });
  return b;
}
