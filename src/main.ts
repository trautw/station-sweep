import './style.css';
import { levelTable } from './data/levels';
import { decks } from './decks';
import { createGame, MAX_CARRIED_EMP_CHARGES } from './game';
import { Sound } from './audio/sound';
import { attachKeyboard } from './input/keyboard';
import { attachSwipe } from './input/swipe';
import { startLoop } from './loop';
import { Renderer } from './render/renderer';
import { Highscore } from './ui/highscore';
import { button, Screens } from './ui/screens';

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

const scoreEl = document.querySelector<HTMLElement>('#score');
const highscoreEl = document.querySelector<HTMLElement>('#highscore');
const livesEl = document.querySelector<HTMLElement>('#lives');
const levelEl = document.querySelector<HTMLElement>('#level');
const empEl = document.querySelector<HTMLElement>('#emp-charges');

// The deck fills the space the top and bottom strips leave free. Refit whenever
// that space changes (window resize, rotation, strip content growing) or the
// device pixel ratio changes (browser zoom, moving to another screen).
const fit = () => renderer.resize(game.state(), deckArea.clientWidth, deckArea.clientHeight);
fit();
// Decks may differ in size: refit whenever another deck comes into play.
const deckKey = () => {
  const { deck } = game.state();
  return `${deck.name}:${deck.width}x${deck.height}`;
};
let fittedDeck = deckKey();
new ResizeObserver(fit).observe(deckArea);
window.addEventListener('resize', fit);

const send = game.send.bind(game);
const phase = () => game.state().phase;
attachKeyboard(window, send, phase);
attachSwipe(window, send);

// Pause: the ⏸ button toggles; leaving the tab or app always pauses.
const togglePause = () => send(phase() === 'paused' ? { type: 'resume' } : { type: 'pause' });
const pauseButton = button('\u23F8', togglePause, 'strip-button');
pauseButton.id = 'pause-button';
pauseButton.setAttribute('aria-label', 'Pause');
document.querySelector('#strip-buttons')?.append(pauseButton);
// Sound: starts on the first interaction; the 🔊 button mutes and unmutes.
const sound = new Sound(window);
const toggleMute = () => {
  sound.toggleMute();
  showMute();
};
const muteButton = button('', toggleMute, 'strip-button');
muteButton.id = 'mute-button';
const showMute = () => {
  muteButton.textContent = sound.isMuted() ? '\u{1F507}' : '\u{1F50A}';
  muteButton.setAttribute('aria-label', sound.isMuted() ? 'Unmute' : 'Mute');
  muteButton.setAttribute('aria-pressed', String(sound.isMuted()));
};
showMute();
document.querySelector('#strip-buttons')?.append(muteButton);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) send({ type: 'pause' });
});

// The highscore lives in the shell; the game logic only reports the score.
const highscore = new Highscore();
let newHighscore = false;
const screens = new Screens(deckArea, send);

startLoop(
  (ticks) => {
    game.tick(ticks);
    sound.play(game.events());
    if (game.events().some((e) => e.type === 'gameOver')) {
      newHighscore = highscore.submit(game.state().score);
    }
  },
  () => {
    const state = game.state();
    if (deckKey() !== fittedDeck) {
      fittedDeck = deckKey();
      fit();
    }
    renderer.draw(state);
    screens.update(state, { highscore: highscore.get(), newHighscore });
    pauseButton.textContent = state.phase === 'paused' ? '\u25B6' : '\u23F8';
    pauseButton.setAttribute('aria-label', state.phase === 'paused' ? 'Resume' : 'Pause');
    if (scoreEl) scoreEl.textContent = String(state.score);
    if (highscoreEl) highscoreEl.textContent = String(Math.max(highscore.get(), state.score));
    if (levelEl) levelEl.textContent = String(state.level);
    if (livesEl) livesEl.textContent = '\u25C6'.repeat(state.lives) || '-';
    if (empEl) {
      empEl.textContent =
        '\u26A1'.repeat(state.carriedEmpCharges) +
        '\u00B7'.repeat(MAX_CARRIED_EMP_CHARGES - state.carriedEmpCharges);
    }
  },
);
