import './style.css';
import { levelTable } from './data/levels';
import { decks } from './decks';
import { createGame } from './game';
import { attachKeyboard } from './input/keyboard';
import { attachSwipe } from './input/swipe';
import { startLoop } from './loop';
import { Renderer } from './render/renderer';

const canvas = document.querySelector<HTMLCanvasElement>('#deck');
const deckArea = document.querySelector<HTMLElement>('#deck-area');
if (!canvas || !deckArea) throw new Error('missing #deck canvas or #deck-area');

const result = createGame(decks, levelTable);
if (!result.ok) {
  document.body.style.whiteSpace = 'pre-wrap';
  document.body.textContent = `Invalid decks:\n${result.errors.join('\n')}`;
  throw new Error(result.errors.join('\n'));
}
const game = result.game;
const renderer = new Renderer(canvas);

// The deck fills the space the top and bottom strips leave free. Refit whenever
// that space changes (window resize, rotation, strip content growing) or the
// device pixel ratio changes (browser zoom, moving to another screen).
const fit = () => renderer.resize(game.state(), deckArea.clientWidth, deckArea.clientHeight);
fit();
new ResizeObserver(fit).observe(deckArea);
window.addEventListener('resize', fit);

const send = game.send.bind(game);
attachKeyboard(window, send);
attachSwipe(window, send);
startLoop(
  (ticks) => game.tick(ticks),
  () => renderer.draw(game.state()),
);
