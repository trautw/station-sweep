const KEY = 'station-sweep.highscore';

/**
 * The highscore, kept in localStorage. Every storage access is guarded: when
 * storage is unavailable (private mode, blocked site data) the highscore only
 * lives for this page load and the game keeps working.
 */
export class Highscore {
  private value: number;

  constructor(private readonly storage: () => Storage = () => window.localStorage) {
    this.value = this.load();
  }

  get(): number {
    return this.value;
  }

  /** Record a final score. Returns true when it beats the previous highscore. */
  submit(score: number): boolean {
    if (score <= this.value) return false;
    this.value = score;
    try {
      this.storage().setItem(KEY, String(score));
    } catch {
      // Storage unavailable: keep the highscore in memory only.
    }
    return true;
  }

  private load(): number {
    try {
      const n = Number(this.storage().getItem(KEY));
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    } catch {
      return 0;
    }
  }
}
