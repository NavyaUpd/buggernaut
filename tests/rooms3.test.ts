import { describe, expect, it } from 'vitest';
import { bot, FEET, X } from './helpers';

const downPole = (b: ReturnType<typeof bot>, frames = 150) => {
  b.step(1, { down: true });
  b.step(frames, { down: true });
};

describe('3-2b City Hospital', () => {
  it('breaker off → splice in the flooded pit → breaker on → clouds → splice the ward line → exit', () => {
    const b = bot('3-2b');
    b.walkTo(X(7));
    b.tapE();
    expect(b.sim.waterLive()).toBe(false);
    b.walkTo(X(10)); // the ladder
    downPole(b, 120);
    b.walkTo(X(16));
    b.climb(80);
    b.holdE();
    expect(b.sim.circuits.isSpliced([16, 14])).toBe(true);
    downPole(b, 60);
    b.walkTo(X(10));
    b.climb(120);
    b.walkTo(X(7));
    b.tapE();
    expect(b.sim.waterLive()).toBe(true);
    b.step(200);
    expect(b.sim.lampLit(0)).toBe(true);
    // lit clouds carry her over the live water
    b.walkTo(X(9));
    for (const x of [X(13) + 20, X(18) + 28, X(23) + 20, X(27) + 20]) b.hop(x);
    expect(b.sim.dying).toBeNull();
    b.hop(X(31));
    expect(b.sim.p.y).toBe(FEET(11));
    b.walkTo(X(32));
    b.climb(110);
    b.holdE();
    expect(b.sim.circuits.isSpliced([32, 6])).toBe(true);
    downPole(b);
    b.step(200);
    expect(b.sim.lampLit(1)).toBe(true);
    expect(b.sim.lampLit(2)).toBe(true);
    expect(b.sim.exitOpen()).toBe(true);
    b.step(80, { right: true });
    expect(b.sim.done).toBe(true);
  });

  it('the exit stays shut until the ward line is spliced', () => {
    const b = bot('3-2b');
    expect(b.sim.exitOpen()).toBe(false);
    b.sim.debugPowerAll();
    b.step(200);
    expect(b.sim.exitOpen()).toBe(true);
  });

  it('wading into the pit while the breaker is closed is deadly', () => {
    const b = bot('3-2b');
    b.walkTo(X(7));
    b.walkTo(X(11));
    let cause: string | undefined;
    for (let i = 0; i < 160; i++) {
      b.step(1, { down: true });
      cause ??= b.sim.dying?.cause;
    }
    expect(cause).toBe('water');
  });
});
