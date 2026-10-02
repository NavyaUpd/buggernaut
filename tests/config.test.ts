import { describe, expect, it } from 'vitest';
import { BIJLI_MODE, LIGHT, MOVE } from '../src/config';

describe('config', () => {
  it('BIJLI mode is faster and jumps higher than normal', () => {
    expect(MOVE.bijli.maxRun).toBeGreaterThan(MOVE.normal.maxRun);
    expect(MOVE.bijli.jumpVelocity).toBeGreaterThan(MOVE.normal.jumpVelocity);
  });

  it('BIJLI mode lasts 8 s with a 2 s warning', () => {
    expect(BIJLI_MODE.durationMs).toBe(8000);
    expect(BIJLI_MODE.warnMs).toBeLessThan(BIJLI_MODE.durationMs);
  });

  it('light boundary straddles the solidity threshold', () => {
    expect(LIGHT.boundary.lo).toBeLessThan(LIGHT.solidThreshold);
    expect(LIGHT.boundary.hi).toBeGreaterThan(LIGHT.solidThreshold);
  });
});
