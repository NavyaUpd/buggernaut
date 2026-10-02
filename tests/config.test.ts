import { describe, expect, it } from 'vitest';
import { HAUSLA, MOVE, TWIST } from '../src/config';

describe('config', () => {
  it('comic is faster and floatier than real', () => {
    expect(MOVE.comic.maxRun).toBeGreaterThan(MOVE.real.maxRun);
    expect(MOVE.comic.jumpVelocity).toBeGreaterThan(MOVE.real.jumpVelocity);
  });

  it('a full Hausla meter lasts about 8 s in comic', () => {
    expect(HAUSLA.max / HAUSLA.drainPerSec).toBeCloseTo(8.33, 1);
  });

  it('the wipe is under the 300 ms budget', () => {
    expect(TWIST.wipeMs).toBeLessThanOrEqual(300);
  });
});
