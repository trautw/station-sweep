import type { Direction, DroneState, GameState } from '../game';

const COLORS = {
  background: '#05070f',
  wall: '#14305a',
  wallEdge: '#3fa9ff',
  robot: '#ffd23f',
  robotEye: '#05070f',
  hunter: '#ff3b5c',
  hunterEye: '#ffe6ea',
  sentinel: '#ffa630',
  sentinelCore: '#2a1500',
  overlay: 'rgba(5, 7, 15, 0.7)',
  text: '#ff3b5c',
  energyCell: '#5dffc8',
  empCharge: '#7fd4ff',
  shutdown: '#6c7a99',
};

/** Flicker period (s) of a shut-down drone in its last second of shutdown. */
const FLICKER_PERIOD = 0.125;

/** One colour per airlock pair (by digit), so pairs can be told apart. */
const AIRLOCK_COLORS = [
  '#ff5ec4',
  '#ff9f3f',
  '#b48cff',
  '#4fe0ff',
  '#ff6b6b',
  '#c6ff4f',
  '#ffffff',
  '#ffd0e8',
  '#8fb8ff',
];

const FACING_ANGLE: Record<Direction, number> = {
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
  up: -Math.PI / 2,
};

/** Draws a read-only game state snapshot onto a canvas, sharp at any device pixel ratio. */
export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private tileSize = 24;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas not supported');
    this.ctx = ctx;
  }

  /** Fit the deck into the given CSS-pixel box. */
  resize(state: GameState, maxWidth: number, maxHeight: number): void {
    const { width, height } = state.deck;
    const dpr = window.devicePixelRatio || 1;
    // Largest tile size that fits, snapped to whole device pixels so tile edges stay crisp.
    const fit = Math.min(maxWidth / width, maxHeight / height);
    this.tileSize = Math.max(4, Math.floor(fit * dpr) / dpr);
    const cssW = width * this.tileSize;
    const cssH = height * this.tileSize;
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  draw(state: GameState): void {
    const { ctx, tileSize: t } = this;
    const { deck, robot } = state;
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, deck.width * t, deck.height * t);

    ctx.fillStyle = COLORS.wall;
    ctx.strokeStyle = COLORS.wallEdge;
    ctx.lineWidth = Math.max(1, t / 12);
    for (let y = 0; y < deck.height; y++) {
      for (let x = 0; x < deck.width; x++) {
        if (!deck.walls[y]?.[x]) continue;
        ctx.fillRect(x * t, y * t, t, t);
        this.drawWallEdges(x, y, state);
      }
    }

    this.drawAirlocks(state);

    // Energy cells: small glowing diamonds at tile centres.
    ctx.save();
    ctx.fillStyle = COLORS.energyCell;
    ctx.shadowColor = COLORS.energyCell;
    ctx.shadowBlur = t / 4;
    const c = Math.max(1.5, t * 0.12);
    for (const cell of state.energyCells) {
      const x = (cell.x + 0.5) * t;
      const y = (cell.y + 0.5) * t;
      ctx.beginPath();
      ctx.moveTo(x, y - c);
      ctx.lineTo(x + c, y);
      ctx.lineTo(x, y + c);
      ctx.lineTo(x - c, y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    this.drawEmpCharges(state);

    for (const drone of state.drones) this.drawDrone(drone, state.robot.position);

    // Robot: rounded body with a "visor" pointing in its facing direction.
    const cx = (robot.position.x + 0.5) * t;
    const cy = (robot.position.y + 0.5) * t;
    const r = t * 0.4;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(FACING_ANGLE[robot.direction]);
    ctx.shadowColor = COLORS.robot;
    ctx.shadowBlur = t / 2;
    ctx.fillStyle = COLORS.robot;
    ctx.beginPath();
    ctx.roundRect(-r, -r, 2 * r, 2 * r, r * 0.4);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.robotEye;
    ctx.fillRect(r * 0.2, -r * 0.5, r * 0.5, r);
    ctx.restore();

    if (state.phase === 'gameOver') {
      ctx.fillStyle = COLORS.overlay;
      ctx.fillRect(0, 0, deck.width * t, deck.height * t);
      ctx.fillStyle = COLORS.text;
      ctx.font = `bold ${Math.round(t * 1.4)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GAME OVER', (deck.width * t) / 2, (deck.height * t) / 2);
    }
  }

  /** EMP charges: a pulsing ring with a lightning bolt. */
  private drawEmpCharges(state: GameState): void {
    const { ctx, tileSize: t } = this;
    const pulse = 0.8 + 0.2 * Math.sin(performance.now() / 180);
    ctx.save();
    ctx.strokeStyle = COLORS.empCharge;
    ctx.fillStyle = COLORS.empCharge;
    ctx.shadowColor = COLORS.empCharge;
    ctx.shadowBlur = t / 2;
    ctx.lineWidth = Math.max(1.5, t / 12);
    for (const charge of state.empCharges) {
      const x = (charge.x + 0.5) * t;
      const y = (charge.y + 0.5) * t;
      ctx.beginPath();
      ctx.arc(x, y, t * 0.3 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      const b = t * 0.18;
      ctx.beginPath();
      ctx.moveTo(x + b * 0.3, y - b);
      ctx.lineTo(x - b * 0.5, y + b * 0.15);
      ctx.lineTo(x, y + b * 0.15);
      ctx.lineTo(x - b * 0.3, y + b);
      ctx.lineTo(x + b * 0.5, y - b * 0.15);
      ctx.lineTo(x, y - b * 0.15);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private drawDrone(drone: DroneState, robot: { x: number; y: number }): void {
    // Salvaged drones are being rebuilt inside the drone bay: not drawn.
    if (drone.mode === 'salvaged') return;
    // Shut-down drones flicker in their last second, so the player sees them waking up.
    if (
      drone.mode === 'shutdown' &&
      drone.shutdownTimeLeft < 1 &&
      Math.floor(drone.shutdownTimeLeft / FLICKER_PERIOD) % 2 === 0
    ) {
      return;
    }
    // Every shut-down drone is drawn without colour.
    this.ctx.save();
    if (drone.mode === 'shutdown') this.ctx.filter = 'grayscale(1) brightness(0.7)';
    switch (drone.type) {
      case 'hunter':
        this.drawHunter(drone, robot);
        break;
      case 'sentinel':
        this.drawSentinel(drone, robot);
        break;
    }
    this.ctx.restore();
  }

  /**
   * Hunter: red spiked diamond with an eye that tracks the robot; dim while
   * waiting in the bay, grey and unlit while shut down.
   */
  private drawHunter(drone: DroneState, robot: { x: number; y: number }): void {
    const { ctx, tileSize: t } = this;
    const cx = (drone.position.x + 0.5) * t;
    const cy = (drone.position.y + 0.5) * t;
    const r = t * 0.45;
    ctx.save();
    const shutdown = drone.mode === 'shutdown';
    const color = shutdown ? COLORS.shutdown : COLORS.hunter;
    ctx.globalAlpha = drone.mode === 'waiting' ? 0.45 : 1;
    ctx.translate(cx, cy);
    ctx.shadowColor = color;
    ctx.shadowBlur = drone.mode === 'waiting' || shutdown ? 0 : t / 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const rr = i % 2 === 0 ? r : r * 0.6;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    const look = Math.atan2(robot.y - drone.position.y, robot.x - drone.position.x);
    ctx.fillStyle = COLORS.hunterEye;
    ctx.beginPath();
    ctx.arc(Math.cos(look) * r * 0.2, Math.sin(look) * r * 0.2, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * Sentinel: orange hexagon shield with a dark core and a lens. While guarding
   * the lens sweeps around; while chasing it locks on to the robot and the
   * glow widens; while returning it is slightly dimmed.
   */
  private drawSentinel(drone: DroneState, robot: { x: number; y: number }): void {
    const { ctx, tileSize: t } = this;
    const cx = (drone.position.x + 0.5) * t;
    const cy = (drone.position.y + 0.5) * t;
    const r = t * 0.44;
    const chasing = drone.mode === 'chasing';
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha = drone.mode === 'returning' ? 0.75 : 1;
    ctx.shadowColor = COLORS.sentinel;
    ctx.shadowBlur = chasing ? t : t / 3;
    ctx.fillStyle = COLORS.sentinel;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (i * Math.PI) / 3;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.sentinelCore;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    const look = chasing
      ? Math.atan2(robot.y - drone.position.y, robot.x - drone.position.x)
      : (drone.position.x + drone.position.y) * 1.5;
    ctx.fillStyle = COLORS.sentinel;
    ctx.beginPath();
    ctx.arc(Math.cos(look) * r * 0.25, Math.sin(look) * r * 0.25, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Both airlocks of a pair look alike: same colour ring and the pair's digit. */
  private drawAirlocks(state: GameState): void {
    const { ctx, tileSize: t } = this;
    ctx.save();
    ctx.lineWidth = Math.max(1.5, t / 10);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.round(t * 0.45)}px system-ui, sans-serif`;
    for (const { digit, tiles } of state.deck.airlocks) {
      const color = AIRLOCK_COLORS[(digit - 1) % AIRLOCK_COLORS.length] ?? '#ffffff';
      for (const tile of tiles) {
        const x = (tile.x + 0.5) * t;
        const y = (tile.y + 0.5) * t;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = t / 3;
        ctx.beginPath();
        ctx.arc(x, y, t * 0.42, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillText(String(digit), x, y + t * 0.02);
      }
    }
    ctx.restore();
  }

  private drawWallEdges(x: number, y: number, state: GameState): void {
    const { ctx, tileSize: t } = this;
    const walls = state.deck.walls;
    const open = (dx: number, dy: number) => walls[y + dy]?.[x + dx] === false;
    ctx.beginPath();
    if (open(0, -1)) { ctx.moveTo(x * t, y * t); ctx.lineTo((x + 1) * t, y * t); }
    if (open(0, 1)) { ctx.moveTo(x * t, (y + 1) * t); ctx.lineTo((x + 1) * t, (y + 1) * t); }
    if (open(-1, 0)) { ctx.moveTo(x * t, y * t); ctx.lineTo(x * t, (y + 1) * t); }
    if (open(1, 0)) { ctx.moveTo((x + 1) * t, y * t); ctx.lineTo((x + 1) * t, (y + 1) * t); }
    ctx.stroke();
  }
}
