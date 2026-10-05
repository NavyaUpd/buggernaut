// Strike column phases and the BIJLI timer (§6.6, §6.7). Pure TS.
import { BIJLI, STRIKE } from '../config';

export type StrikeState = 'quiet' | 'telegraph' | 'strike';

export interface StrikePhase {
  state: StrikeState;
  /** Progress through the current state, 0..1. */
  k: number;
  /** Seconds into the cycle. */
  local: number;
}

/** Each column cycles every STRIKE.cycle s: telegraph, then strike, then quiet. */
export function strikePhase(t: number, offset: number): StrikePhase {
  const c = STRIKE.cycle;
  const local = (((t - offset) % c) + c) % c;
  if (local < STRIKE.telegraph) return { state: 'telegraph', k: local / STRIKE.telegraph, local };
  if (local < STRIKE.telegraph + STRIKE.strike) return { state: 'strike', k: (local - STRIKE.telegraph) / STRIKE.strike, local };
  return { state: 'quiet', k: (local - STRIKE.telegraph - STRIKE.strike) / (c - STRIKE.telegraph - STRIKE.strike), local };
}

export function strikeOffset(index: number): number {
  return STRIKE.offsets[index % STRIKE.offsets.length] ?? 0;
}

export class BijliTimer {
  left = 0;
  get active(): boolean {
    return this.left > 0;
  }
  /** In the last BIJLI.warn seconds (blink + tick). */
  get warning(): boolean {
    return this.left > 0 && this.left <= BIJLI.warn;
  }
  get fraction(): number {
    return Math.max(0, this.left / BIJLI.duration);
  }
  start(): void {
    this.left = BIJLI.duration;
  }
  stop(): void {
    this.left = 0;
  }
  /** Returns 'ended' on the tick BIJLI runs out, 'tick' on each whole warning second boundary. */
  update(dt: number): 'ended' | 'tick' | null {
    if (this.left <= 0) return null;
    const before = this.left;
    this.left = Math.max(0, this.left - dt);
    if (this.left === 0) return 'ended';
    if (before <= BIJLI.warn + 1e-9 || this.left <= BIJLI.warn) {
      if (Math.floor(before * 4) !== Math.floor(this.left * 4)) return 'tick';
    }
    return null;
  }
}
