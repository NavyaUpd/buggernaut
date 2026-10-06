// ALL tunables live here (CLAUDE.md §12). Units: px, px/s, px/s², s.

export const VIEW = { width: 1280, height: 720, tile: 32, cols: 40, rows: 22, offsetY: 8 } as const;

/** Player feel (§5): Celeste ×4. Rooms were validated against these — don't change without replaying. */
export const PLAYER = {
  hitbox: { w: 22, h: 56 },
  sprite: { w: 40, h: 64 }, // anchor bottom-centre
  maxRun: 300,
  runAccel: 3600,
  runReduce: 1600,
  airMult: 0.65,
  gravity: 3200,
  halfGravThreshold: 160, // gravity ×0.5 while jump held and |vy| < 160
  maxFall: 640,
  fastMaxFall: 900, // fast fall while holding down
  jumpSpeed: 420,
  jumpHBoost: 120,
  varJumpTime: 0.2, // hold jump: vy stays ≤ -420 for up to 0.2 s
  coyoteTime: 0.1,
  jumpBuffer: 0.12,
  climbUp: 190,
  climbDown: 260,
  poleJumpOff: { vx: 240, vy: 380 },
  grindSpeed: 520,
  grindSpeedBijli: 620,
  doubleJumpSpeed: 380,
  doubleJumpVarTime: 0.15, // BIJLI only
  bounceSpeed: 1100, // snake bounce
  respawnFreeze: 0.15,
  respawnFade: 0.3,
} as const;

export const COLORS = {
  real: {
    night: 0x141a2e,
    wetBlock: 0x2b3550,
    edge: 0x5c6b8a,
    sodium: 0xffb347,
    liveArc: 0x7fe3ff,
    danger: 0xff4d4d,
    window: 0xffd58a,
    rain: 0x8fa3c7,
  },
  comic: {
    paper: 0xffffff,
    ink: 0x000000,
    yellow: 0xffd400,
    red: 0xff3b30,
    blue: 0x2f6bff,
    green: 0x2ecc71,
    sky: 0x9ed8ff,
    bijliCyan: 0x4ff0ff,
    capeMagenta: 0xff3e9a,
  },
} as const;

/** CSS versions of the palettes for canvas drawing. */
export const CSS = {
  ink: '#000',
  paper: '#fff',
  sky: '#9ed8ff',
  dot: '#7cc6f5',
  yellow: '#ffd400',
  orange: '#ff9f1c',
  red: '#ff3b30',
  blue: '#2f6bff',
  green: '#2ecc71',
  cyan: '#4ff0ff',
  magenta: '#ff3e9a',
  sodium: '#ffb347',
  arc: '#7fe3ff',
  danger: '#ff4d4d',
  window: '#ffd58a',
  rain: '#8fa3c7',
} as const;

export const FONTS = {
  hand: '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive',
  ui: '"Trebuchet MS", sans-serif',
  comic: '"Trebuchet MS", "Arial Black", sans-serif',
} as const;

/** Splicing (§6.2). */
export const SPLICE = {
  holdTime: 1.0,
  beats: [0.33, 0.66, 1.0],
  hitStop: 0.08,
  reachPx: 12, // hitbox is grown by this much when testing overlap with X / B cells
  shockKnock: { vx: 300, vy: 300 },
} as const;

export const BREAKER = { cooldown: 0.25 } as const;

/** Power-on → comic panel sequence (§9.3, prototype SEQ). Seconds from power-on. */
export const SEQ = {
  pulse: 0.3, // energy pulse along the wire before the lamp starts
  flick: [0, 0.08, 0.16, 0.22, 0.3],
  pool: 0.55,
  sketch0: 0.55,
  sketch1: 1.15,
  color0: 1.05,
  color1: 1.85,
  offFade: 0.25, // reverse bloom
} as const;

export const PANEL = {
  left: 1.06,
  right: 1.04,
  top: 0.95,
  // corner nudges TL, TR, BR, BL (hand-ruled tilt)
  nudge: [
    [6, 10],
    [0, -4],
    [-4, 0],
    [-4, 0],
  ] as readonly (readonly [number, number])[],
  wipeSlant: 0.42,
} as const;

export const RAIL = { attachPx: 12 } as const;

/** Ambient lightning = comic peek (§6.7). */
export const LIGHTNING = {
  interval: [10, 16] as const,
  firstAt: 4,
  telegraph: 1.2,
  peek: 0.55, // envelope; lit-only objects do NOT become solid
  thunderDelay: [0.3, 1.5] as const,
} as const;

/** Strike columns (§6.7). */
export const STRIKE = { cycle: 3.6, telegraph: 1.2, strike: 0.25, offsets: [0, 1.2, 2.4] } as const;

/** Chinni's drawing power-up (§6.6). */
export const BIJLI = { duration: 8, warn: 2, drawingRespawn: 10 } as const;

export const DARKNESS = { alpha: 0.78, headlampDeg: 35, headlampLen: 320 } as const;

export const FX = { maxShake: 6, slideMs: 400 } as const;

export const PERF = { maxRain: 1200, downgradeFps: 50 } as const;
