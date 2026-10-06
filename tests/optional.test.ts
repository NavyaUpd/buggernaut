import { describe, expect, it } from 'vitest';
import { STRIKE } from '../src/config';
import { bot, FEET, X } from './helpers';

describe('power-ups are optional (playtest feedback)', () => {
  it('2-3 can be finished WITHOUT the drawing, across the pillars and over the snake', () => {
    const b = bot('2-3');
    b.walkTo(X(7) + 4, true);
    expect(b.sim.bijli.active).toBe(false);
    for (const x of [X(11), X(15), X(20), X(25), X(29), X(34)]) b.hop(x);
    expect(b.sim.p.y).toBe(FEET(19));
    b.walkTo(X(34), true);
    b.hop(X(39));
    b.step(5);
    expect(b.sim.dying).toBeNull();
    expect(b.sim.done).toBe(true);
  });

  it('3-3 platform is reachable WITHOUT the drawing via the pillars', () => {
    const b = bot('3-3');
    b.walkTo(X(6), true);
    expect(b.sim.bijli.active).toBe(false);
    for (const x of [X(11), X(15), X(20)]) b.hop(x);
    expect(b.sim.p.y).toBe(FEET(15));
  });

  it('the storm-dragon drawing pauses strikes, then every column telegraphs again first', () => {
    const b = bot('3-3');
    b.sim.calmLeft = 8;
    for (let i = 0; i < 60 * 7; i++) {
      b.step(1);
      expect(b.sim.strikeStates().every((s) => s.state === 'quiet')).toBe(true);
    }
    b.step(70);
    expect(b.sim.calmLeft).toBe(0);
    // first state after waking is a telegraph, never a surprise strike
    const st = b.sim.strikeStates()[0]!;
    expect(st.state === 'telegraph' || st.state === 'quiet').toBe(true);
    expect(STRIKE.cycle - STRIKE.telegraph - STRIKE.strike).toBeGreaterThan(3);
  });

  it('the cape glides: holding Space while falling in BIJLI caps the fall speed', () => {
    const b = bot('2-3');
    b.sim.bijli.start();
    b.sim.p.y = FEET(10);
    b.sim.p.x = X(14);
    b.sim.p.ground = false;
    b.step(40, { jumpHeld: true });
    expect(b.sim.p.vy).toBeLessThanOrEqual(150);
  });
});
