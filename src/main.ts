import './style.css';
import { levelTable } from './data/levels';
import { decks } from './decks';
import { createGame } from './game';
import { attachKeyboard } from './input/keyboard';
import { startLoop } from './loop';
import { Renderer } from './render/renderer';

const canvas = document.querySelector<HTMLCanvasElement>('#deck');
if (!canvas) throw new Error('missing #deck canvas');

const result = createGame(decks, levelTable);
if (!result.ok) {
  document.body.textContent = `Invalid decks:\n${result.errors.join('\n')}`;
  throw new Error(result.errors.join('\n'));
}
const game = result.game;
const renderer = new Renderer(canvas);

const scoreEl = document.querySelector<HTMLElement>('#score');
const TOP_STRIP_HEIGHT = 32;

const fit = () =>
  renderer.resize(game.state(), window.innerWidth - 32, window.innerHeight - 32 - TOP_STRIP_HEIGHT);
fit();
window.addEventListener('resize', fit);

attachKeyboard(window, (command) => game.send(command));
startLoop(
  (ticks) => game.tick(ticks),
  () => {
    const state = game.state();
    renderer.draw(state);
    if (scoreEl) scoreEl.textContent = String(state.score);
  },
);
