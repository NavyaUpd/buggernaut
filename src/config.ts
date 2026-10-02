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
  real: {
    maxRun: 210,
    accel: 1800,
    decel: 2400,
    airControl: 0.75,
    jumpVelocity: 600,
    gravity: 1700,
    fallMultiplier: 1.6,
    maxFall: 900,
    climbSpeed: 140,
    ziplineSpeed: 360,
  },
  comic: {
    maxRun: 270,
    accel: 2600,
    decel: 3000,
    airControl: 0.95,
    jumpVelocity: 680,
    doubleJumpVelocity: 560,
    gravity: 1500,
    fallMultiplier: 1.4,
    maxFall: 820,
    climbSpeed: 180,
    boltDashSpeed: 950,
  },
  coyoteMs: 100,
  jumpBufferMs: 120,
  jumpCutMultiplier: 0.45,
  iFramesMs: 900,
} as const;

export const HEALTH = { maxSparks: 3 } as const;

/** Hausla (courage) meter (§6.3). */
export const HAUSLA = {
  max: 100,
  drainPerSec: 12,
  refillPerSec: 4,
  crayonBonus: 50,
  spliceBonus: 30,
  lightningBonus: 100,
  emptyLockoutMs: 1500,
} as const;

/** World switch (§6.4, §10.3). */
export const TWIST = {
  wipeMs: 280,
  cooldownMs: 300,
  rimPx: 6,
  zoomPunch: 1.03,
  musicCrossfadeMs: 120,
} as const;

/** Splicing (§7.3). */
export const SPLICE = {
  twistsRequired: 3,
  degreesPerAlternation: 90,
  assistHoldMs: 1200,
  hitStopMs: 80,
} as const;

/** Lighting + lightning (§6.1, §7.5). */
export const LIGHT = {
  darknessAlpha: 0.88,
  headlampAngleDeg: 35,
  headlampLength: 320,
  lightningIntervalSec: [10, 16] as const,
  lightningTelegraphMs: 1200,
  lightningRevealMs: 350,
  lightningFadeMs: 600,
} as const;

/** Comic combat (§7.6). */
export const COMBAT = {
  comboKnockback: [12, 12, 20] as const,
  punchRange: 48,
  punchIntervalMs: 250,
  hitStopMs: 60,
  taarNaagStunMs: 6000,
} as const;

export const PERF = {
  maxRainParticles: 1500,
  autoDowngradeFps: 50,
  autoDowngradeWindowMs: 3000,
} as const;
