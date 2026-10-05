import { describe, expect, it } from 'vitest';
import { bot } from './helpers';

describe('room 1-1 First Light (headless playthrough)', () => {
  it('climb → splice → bloom → clouds → wall → exit', () => {
    const b = bot('1-1');
    b.walkTo(400);
    b.climb();
    expect(b.sim.p.y).toBe(9 * 32 + 8); // standing on the pole top
    b.holdE();
    expect(b.sim.circuits.powered('c1')).toBe(true);
    b.step(180);
    expect(b.sim.lampLit(0)).toBe(true);
    b.step(1, { right: true });
    b.walkTo(745);
    b.hop(770);
    expect(b.sim.p.y).toBe(16 * 32 + 8); // on the low cloud
    b.hop(880);
    b.hop(1000);
    b.walkTo(1260);
    b.step(5);
    expect(b.sim.done).toBe(true);
  });
  it('clouds are not solid in the dark', () => {
    const b = bot('1-1');
    b.walkTo(745);
    b.hop(770);
    expect(b.sim.p.y).toBe(19 * 32 + 8); // fell through to the ground
  });
});

describe('room 1-3 The Live Line', () => {
  it('shock → breaker off → splice → breaker on → grind across the pit', () => {
    const b = bot('1-3');
    b.walkTo(9 * 32 + 16);
    b.climb(160);
    b.holdE(10);
    expect(b.sim.circuits.isSpliced([9, 8])).toBe(false); // shocked instead
    expect(b.sim.bubbles.some((x) => x.tip)).toBe(true);
    b.step(60);
    b.walkTo(5 * 32 + 16);
    b.tapE(); // open
    expect(b.sim.circuits.isClosed('c1')).toBe(false);
    b.walkTo(9 * 32 + 16);
    b.climb(160);
    b.holdE();
    expect(b.sim.circuits.isSpliced([9, 8])).toBe(true);
    b.step(1, { down: true });
    b.step(120, { down: true });
    b.walkTo(5 * 32 + 16);
    b.tapE(); // close → power on
    b.step(200);
    expect(b.sim.lampLit(0)).toBe(true);
    b.walkTo(9 * 32 + 16);
    b.climb(160);
    b.step(1, { right: true });
    expect(b.sim.p.grind).not.toBeNull();
    b.step(120);
    expect(b.sim.p.climb?.x).toBe(31);
    b.step(1, { down: true });
    b.step(150, { down: true });
    b.walkTo(39 * 32 + 10);
    b.step(5);
    expect(b.sim.done).toBe(true);
  });
});
