import { describe, expect, it } from 'vitest';
import { bot, FEET, X } from './helpers';

const down = (b: ReturnType<typeof bot>, f = 150) => {
  b.step(1, { down: true });
  b.step(f, { down: true });
};
const waitJustStruck = (b: ReturnType<typeof bot>, col = 0) => {
  let n = 0;
  while (n++ < 400) {
    const s = b.sim.strikeStates()[col]!;
    if (s.state === 'quiet' && s.k < 0.05) break;
    b.step(1);
  }
};

describe('harder rooms (playtest: "still too easy and short")', () => {
  it('2-2b Night Market: hop the dark snake to work the breaker, splice, grind, bounce the lit snake', () => {
    const b = bot('2-2b');
    b.walkTo(X(5), true);
    b.hop(X(10));
    expect(b.sim.dying).toBeNull();
    b.walkTo(X(11), true);
    b.climb(160);
    b.holdE(10);
    expect(b.sim.circuits.isSpliced([11, 8])).toBe(false); // live: shocked
    b.step(60);
    expect(b.sim.dying).toBeNull(); // the knockback never throws you onto the snake
    b.walkTo(X(10), true);
    b.hop(X(5));
    b.walkTo(X(4), true);
    b.tapE();
    expect(b.sim.circuits.isClosed('c1')).toBe(false);
    b.walkTo(X(5), true);
    b.hop(X(10));
    b.walkTo(X(11), true);
    b.climb(160);
    b.holdE();
    expect(b.sim.circuits.isSpliced([11, 8])).toBe(true);
    down(b, 160);
    b.walkTo(X(10), true);
    b.hop(X(5));
    b.walkTo(X(4), true);
    b.tapE();
    b.step(200);
    expect(b.sim.lampLit(0)).toBe(true);
    b.walkTo(X(5), true);
    b.hop(X(10));
    b.walkTo(X(11), true);
    b.climb(160);
    b.step(1, { right: true });
    expect(b.sim.p.grind).not.toBeNull();
    b.step(120);
    expect(b.sim.p.climb?.x).toBe(28);
    down(b);
    b.walkTo(X(30), true);
    let n = 0;
    while (!(b.sim.p.ground && b.sim.p.y === FEET(14)) && n++ < 160) b.step(1, { right: b.sim.p.x < X(35), jumpHeld: true });
    expect(b.sim.p.y).toBe(FEET(14));
    b.walkTo(1262);
    b.step(5);
    expect(b.sim.done).toBe(true);
    expect(b.sim.deaths).toBe(0);
  });

  it('3-1b Flooded Crossing: breaker off, splice between strikes in the water, breaker on, cross the clouds between strikes', () => {
    const b = bot('3-1b');
    b.walkTo(X(7), true);
    b.tapE();
    expect(b.sim.waterLive()).toBe(false);
    b.walkTo(X(10), true);
    down(b, 120);
    b.walkTo(X(16), true);
    waitJustStruck(b);
    b.walkTo(X(19), true);
    b.climb(70);
    b.holdE();
    expect(b.sim.circuits.isSpliced([19, 14])).toBe(true);
    down(b, 70);
    b.walkTo(X(15), true);
    expect(b.sim.dying).toBeNull();
    b.walkTo(X(10), true);
    b.climb(140);
    b.walkTo(X(7), true);
    b.tapE();
    expect(b.sim.waterLive()).toBe(true);
    b.step(200);
    expect(b.sim.lampLit(0)).toBe(true);
    b.walkTo(X(10), true);
    b.hop(X(12) + 16);
    b.hop(X(16) + 16);
    waitJustStruck(b);
    b.hop(X(21) + 16);
    b.hop(X(25) + 16);
    b.hop(X(31));
    expect(b.sim.dying).toBeNull();
    b.walkTo(1262);
    b.step(5);
    expect(b.sim.done).toBe(true);
  });

  it('a death undoes the repair in progress, but lit lamps are checkpoints', () => {
    const b = bot('1-3');
    b.walkTo(X(5), true);
    b.tapE(); // breaker OFF: work in progress
    expect(b.sim.circuits.isClosed('c1')).toBe(false);
    b.sim.p.y = 900; // fall out of the world
    b.step(60);
    expect(b.sim.deaths).toBe(1);
    expect(b.sim.circuits.isClosed('c1')).toBe(true); // breaker back as authored
    const c = bot('1-1');
    c.walkTo(400);
    c.climb();
    c.holdE();
    expect(c.sim.circuits.powered('c1')).toBe(true);
    c.sim.p.y = 900;
    c.step(60);
    expect(c.sim.deaths).toBe(1);
    expect(c.sim.circuits.powered('c1')).toBe(true); // the lit lamp stays lit
  });

  it('the hospital backup timer runs out → death, and stops once both lines are powered', () => {
    const b = bot('3-2b');
    expect(b.sim.timeLeft).toBe(100);
    b.step(60 * 101);
    expect(b.sim.deaths).toBeGreaterThan(0);
    const c = bot('3-2b');
    c.sim.debugPowerAll();
    const t0 = c.sim.timeLeft;
    c.step(120);
    expect(c.sim.timeLeft).toBe(t0);
  });
});
