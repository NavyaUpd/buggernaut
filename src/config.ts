// ALL tunables live here — single source of truth (CLAUDE.md §17).
// Owned by the Levels & story lead when conflicts arise (§15).

export const VIEW = { width: 1280, height: 720, tile: 32 } as const;

export const COLORS = {
  real: {
    night: 0x141a2e,
    rainSlate: 0x5c6b8a,
    wetHighlight: 0x2b3550,
    sodium: 0xffb347,
    liveArc: 0x7fe3ff,
    danger: 0xff4d4d,
    window: 0xffd58a,
  },
  comic: {
    paper: 0xffffff,
    ink: 0x000000,
    yellow: 0xffd400,
    red: 0xff3b30,
    blue: 0x2f6bff,
    green: 0x2ecc71,
    bijliCyan: 0x4ff0ff,
    capeMagenta: 0xff3e9a,
  },
} as const;

/** Platforming feel (§7.1). Units: px, px/s, px/s², ms. */
export const MOVE = {
  normal: {
    maxRun: 220,
    accel: 1900,
    decel: 2400,
    airControl: 0.8,
    jumpVelocity: 620,
    gravity: 1700,
    fallMultiplier: 1.6,
    maxFall: 900,
    climbSpeed: 150,
    grindSpeed: 520,
  },
  bijli: {
    maxRun: 275,
    accel: 2600,
    decel: 3000,
    airControl: 0.95,
    jumpVelocity: 690,
    doubleJumpVelocity: 560,
    gravity: 1550,
    fallMultiplier: 1.45,
    maxFall: 840,
    climbSpeed: 190,
    grindSpeed: 620,
  },
  coyoteMs: 100,
  jumpBufferMs: 120,
  jumpCutMultiplier: 0.45,
  iFramesMs: 900,
} as const;

export const HEALTH = { maxSparks: 3 } as const;

/** Light field: the mask that turns the world into Chinni's comic (§6.1, §10.3, §14). */
export const LIGHT = {
  maskScale: 0.5,
  gridCellPx: 16,
  solidThreshold: 0.5,
  lampRadius: { min: 180, max: 260, default: 220 },
  wireBandPx: 40,
  bloomMs: 450,
  boundary: { lo: 0.45, hi: 0.55, noiseScale: 8, noiseAmount: 0.12 },
  headlampAngleDeg: 35,
  headlampLength: 320,
  batteryMs: 20000,
} as const;

/** Lightning flashes = comic peek (§6.3). */
export const LIGHTNING = {
  intervalSec: [10, 16] as const,
  telegraphMs: 1200,
  peekMs: 400,
  thunderDelaySec: [0.3, 1.5] as const,
} as const;

/** Chinni's drawing power-up (§6.4). */
export const BIJLI_MODE = {
  durationMs: 8000,
  warnMs: 2000,
} as const;

/** Storm knocking lamps out, L4+ (§6.5). */
export const STORM = { lampFlickerMs: 1000, lampOutMs: 6000 } as const;

/** Splicing: hold E (§7.3). */
export const SPLICE = {
  holdMs: 1000,
  twistBeats: 3,
  hitStopMs: 80,
} as const;

/** Comic twins (§8). */
export const TWINS = { crocSinkMs: 1500 } as const;

export const LEVEL_RULES = { floodRiseTilesPerMin: 2, hospitalTimerSec: 210, hospitalBonusSec: 60 } as const;

export const PERF = {
  maxRainParticles: 1500,
  autoDowngradeFps: 50,
  autoDowngradeWindowMs: 3000,
} as const;
