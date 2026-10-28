import type { GameEvent } from '../game';

const MUTED_KEY = 'station-sweep.muted';

/** One tone: a frequency sweep with a short attack and an exponential decay. */
interface Tone {
  readonly from: number;
  readonly to?: number;
  readonly duration: number;
  readonly wave?: OscillatorType;
  readonly volume?: number;
  /** Seconds after the effect starts. */
  readonly at?: number;
}

type Effect = readonly Tone[];

const EFFECTS = {
  cellCollected: [{ from: 880, to: 1320, duration: 0.05, wave: 'square', volume: 0.08 }],
  empPickedUp: [
    { from: 520, to: 780, duration: 0.08, wave: 'triangle' },
    { from: 780, to: 1170, duration: 0.1, wave: 'triangle', at: 0.08 },
  ],
  empTriggered: [
    { from: 1400, to: 60, duration: 0.45, wave: 'sawtooth', volume: 0.18 },
    { from: 90, to: 40, duration: 0.5, wave: 'sine', volume: 0.3 },
  ],
  droneSalvaged: [
    { from: 660, duration: 0.07, wave: 'square', volume: 0.1 },
    { from: 990, duration: 0.07, wave: 'square', volume: 0.1, at: 0.07 },
    { from: 1320, duration: 0.12, wave: 'square', volume: 0.1, at: 0.14 },
  ],
  robotCaught: [{ from: 600, to: 120, duration: 0.5, wave: 'square', volume: 0.15 }],
  deckCleared: [
    { from: 523, duration: 0.12, wave: 'triangle' },
    { from: 659, duration: 0.12, wave: 'triangle', at: 0.12 },
    { from: 784, duration: 0.12, wave: 'triangle', at: 0.24 },
    { from: 1047, duration: 0.3, wave: 'triangle', at: 0.36 },
  ],
  extraLife: [
    { from: 1047, duration: 0.08, wave: 'sine' },
    { from: 1568, duration: 0.15, wave: 'sine', at: 0.08 },
  ],
  gameOver: [
    { from: 392, to: 370, duration: 0.3, wave: 'square', volume: 0.12 },
    { from: 330, to: 311, duration: 0.3, wave: 'square', volume: 0.12, at: 0.3 },
    { from: 262, to: 131, duration: 0.8, wave: 'square', volume: 0.12, at: 0.6 },
  ],
} satisfies Partial<Record<GameEvent['type'], Effect>>;

type SoundEvent = keyof typeof EFFECTS;

const hasEffect = (type: GameEvent['type']): type is SoundEvent => type in EFFECTS;

/**
 * The sound layer: plays a short Web Audio effect per game event. No audio
 * files. The AudioContext is only created on the first user interaction, so
 * browsers with autoplay restrictions (mobile) never see audio before a tap.
 * The mute choice is remembered in localStorage when storage is available.
 */
export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted: boolean;

  constructor(
    target: EventTarget,
    private readonly storage: () => Storage = () => window.localStorage,
  ) {
    this.muted = this.loadMuted();
    const unlock = () => {
      if (!this.start()) return;
      for (const type of UNLOCK_EVENTS) target.removeEventListener(type, unlock, true);
    };
    for (const type of UNLOCK_EVENTS) target.addEventListener(type, unlock, true);
  }

  isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): void {
    this.muted = !this.muted;
    if (this.master && this.ctx) this.master.gain.setValueAtTime(this.muted ? 0 : 1, this.ctx.currentTime);
    try {
      this.storage().setItem(MUTED_KEY, this.muted ? '1' : '0');
    } catch {
      // Storage unavailable: the choice lasts for this page load only.
    }
  }

  /** Play the effects for the events of one tick() call. */
  play(events: readonly GameEvent[]): void {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
    // Losing the last life: the game over jingle replaces the caught sound.
    const gameOver = events.some((e) => e.type === 'gameOver');
    const played = new Set<SoundEvent>();
    for (const { type } of events) {
      if (!hasEffect(type) || played.has(type)) continue;
      if (gameOver && type === 'robotCaught') continue;
      played.add(type);
      this.playEffect(EFFECTS[type]);
    }
  }

  /** Create (or resume) the AudioContext inside a user gesture. True once running. */
  private start(): boolean {
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return true; // No Web Audio: stay silent, stop listening.
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 1;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state !== 'running') void this.ctx.resume().catch(() => undefined);
      return this.ctx.state === 'running';
    } catch {
      return false;
    }
  }

  private playEffect(effect: Effect): void {
    const { ctx, master } = this;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    for (const tone of effect) {
      const start = now + (tone.at ?? 0);
      const end = start + tone.duration;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tone.wave ?? 'sine';
      osc.frequency.setValueAtTime(tone.from, start);
      if (tone.to !== undefined) osc.frequency.exponentialRampToValueAtTime(tone.to, end);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(tone.volume ?? 0.15, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(gain).connect(master);
      osc.start(start);
      osc.stop(end + 0.02);
    }
  }

  private loadMuted(): boolean {
    try {
      return this.storage().getItem(MUTED_KEY) === '1';
    } catch {
      return false;
    }
  }
}

const UNLOCK_EVENTS = ['pointerdown', 'touchend', 'keydown', 'click'] as const;
