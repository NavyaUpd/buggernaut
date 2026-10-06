import { describe, expect, it } from 'vitest';
import { bot, FEET, X } from './helpers';

const downPole = (b: ReturnType<typeof bot>, frames = 150) => {
  b.step(1, { down: true });
  b.step(frames, { down: true });
};

describe('headless playthroughs', () => {
  it('1-2 The Flash: splice → clouds over the pit → ladder → exit', () => {
    const b = bot('1-2');
    b.walkTo(X(6));
    b.climb();
    b.holdE();
    b.step(200);
    expect(b.sim.lampLit(0)).toBe(true);
    downPole(b);
    b.walkTo(430);
    for (const x of [505, 640, 768, 900]) b.hop(x);
    expect(b.sim.p.y).toBe(FEET(19));
    b.walkTo(X(32));
    b.climb(150);
    b.walkTo(1262);
    b.step(5);
    expect(b.sim.done).toBe(true);
  });

  it('2-1 Taar-Naag: the dark wire kills, the lit snake bounces you up the wall', () => {
    const d = bot('2-1');
    let k = 0;
    while (!d.sim.dying && k++ < 300) d.step(1, { right: true });
    expect(d.sim.dying?.cause).toBe('snake');
    const b = bot('2-1');
    b.walkTo(X(8));
    b.climb();
    b.holdE();
    b.step(200);
    downPole(b);
    b.walkTo(X(25));
    let n = 0;
    while (!(b.sim.p.ground && b.sim.p.y === FEET(14)) && n++ < 120) b.step(1, { right: true, jumpHeld: true });
    expect(b.sim.p.y).toBe(FEET(14));
    b.walkTo(1262);
    b.step(5);
    expect(b.sim.done).toBe(true);
  });

  it('2-2 Rooftop Rails: A → grind → breaker off → B → breaker on → clouds', () => {
    const b = bot('2-2');
    b.walkTo(X(6));
    b.climb();
    b.holdE();
    b.step(200);
    b.step(1, { right: true });
    expect(b.sim.p.grind).not.toBeNull();
    b.step(90);
    expect(b.sim.p.climb?.x).toBe(20);
    downPole(b);
    b.walkTo(X(23));
    b.tapE();
    expect(b.sim.circuits.isClosed('cB')).toBe(false);
    b.walkTo(X(20));
    b.climb(100);
    b.holdE();
    expect(b.sim.circuits.isSpliced([20, 9])).toBe(true);
    downPole(b);
    b.walkTo(X(23));
    b.tapE();
    b.step(200);
    expect(b.sim.lampLit(1)).toBe(true);
    b.walkTo(X(24));
    // the snake at the end of the roof is lit now: walk into it and BOING up to the cloud
    b.step(1, { right: true });
    let n = 0;
    while (!(b.sim.p.ground && b.sim.p.y === FEET(11)) && n++ < 200) b.step(1, { right: b.sim.p.x < 1010, jumpHeld: true });
    expect(b.sim.dying).toBeNull();
    expect(b.sim.p.y).toBe(FEET(11));
    b.hop(1150);
    b.step(80, { right: true });
    expect(b.sim.done).toBe(true);
  });

  it('2-2: the roof snake is deadly until its lamp is lit', () => {
    const b = bot('2-2');
    b.sim.p.x = X(24);
    b.sim.p.y = FEET(15);
    b.sim.p.vx = 0;
    b.step(1);
    b.step(20, { right: true });
    expect(b.sim.dying?.cause).toBe('snake');
  });

  it('2-3 Chinni\'s Drawing: BIJLI grinds two dead wires', () => {
    const b = bot('2-3');
    b.grabDrawing(X(4));
    expect(b.sim.bijli.active).toBe(true);
    b.walkTo(X(6));
    b.climb(110);
    b.step(1, { right: true });
    expect(b.sim.p.grind).not.toBeNull();
    b.step(100);
    expect(b.sim.p.climb?.x).toBe(34);
    downPole(b);
    // BIJLI still has a few seconds: the snake before the exit is a BOING, not a hazard
    expect(b.sim.bijli.active).toBe(true);
    b.step(120, { right: true, jumpHeld: true });
    expect(b.sim.dying).toBeNull();
    expect(b.sim.done).toBe(true);
  });

  it('2-3: once BIJLI ends the snake is deadly; it can be jumped', () => {
    const run = (jump: boolean) => {
      const b = bot('2-3');
      b.grabDrawing(X(4));
      b.walkTo(X(6));
      b.climb(110);
      b.step(1, { right: true });
      b.step(100);
      downPole(b);
      b.sim.bijli.stop();
      b.walkTo(X(34));
      if (jump) b.step(1, { right: true, jumpPressed: true, jumpHeld: true });
      let cause: string | undefined;
      for (let i = 0; i < 80 && !b.sim.done; i++) {
        b.step(1, { right: true, jumpHeld: jump && i < 25 });
        cause ??= b.sim.dying?.cause;
      }
      return { cause, done: b.sim.done };
    };
    expect(run(false)).toEqual({ cause: 'snake', done: false });
    expect(run(true)).toEqual({ cause: undefined, done: true });
  });

  it('3-1 Underpass: breaker off → wade → splice → ladder → breaker on → clouds over live water', () => {
    const b = bot('3-1');
    b.walkTo(X(8));
    b.tapE();
    expect(b.sim.waterLive()).toBe(false);
    b.walkTo(X(12));
    downPole(b, 120);
    b.walkTo(X(18));
    b.climb(80);
    b.holdE();
    downPole(b, 60);
    b.walkTo(X(12));
    b.climb(120);
    b.walkTo(X(8));
    b.tapE();
    expect(b.sim.waterLive()).toBe(true);
    b.step(200);
    expect(b.sim.lampLit(0)).toBe(true);
    b.walkTo(X(12));
    for (const x of [500, 660, 790, 925]) b.hop(x);
    expect(b.sim.dying).toBeNull();
    b.walkTo(1262);
    b.step(5);
    expect(b.sim.done).toBe(true);
  });

  it('3-2 Strikes: time the columns, splice between strikes', () => {
    const b = bot('3-2');
    const waitJustStruck = (col: number) => {
      let n = 0;
      while (n++ < 400) {
        const s = b.sim.strikeStates()[col]!;
        if (s.state === 'quiet' && s.k < 0.05) break;
        b.step(1);
      }
    };
    b.walkTo(X(7));
    waitJustStruck(0);
    b.walkTo(X(11));
    waitJustStruck(1);
    b.hop(X(15)); // the dark snake sits between columns 0 and 1
    expect(b.sim.dying).toBeNull();
    waitJustStruck(1);
    b.walkTo(X(20));
    waitJustStruck(2);
    b.walkTo(X(24));
    b.climb(60);
    b.holdE();
    expect(b.sim.circuits.isSpliced([24, 14])).toBe(true);
    b.step(1, { right: true, jumpPressed: true, jumpHeld: true });
    b.step(40, { right: true, jumpHeld: true });
    expect(b.sim.dying).toBeNull();
    b.walkTo(X(26));
    b.step(160);
    expect(b.sim.lampLit(0)).toBe(true);
    b.hop(X(27) + 10);
    b.hop(X(29) + 10);
    b.hop(1090);
    b.walkTo(1262);
    b.step(5);
    expect(b.sim.done).toBe(true);
  });

  it('3-2: the dark snake between the strike columns is deadly', () => {
    const b = bot('3-2');
    b.walkTo(X(11));
    let cause: string | undefined;
    for (let i = 0; i < 60; i++) {
      b.step(1, { right: true });
      cause ??= b.sim.dying?.cause;
    }
    expect(cause).toBe('snake');
  });

  it('3-3 Substation: drawing → grind → drawing → splice in the strike → master breaker → skyline', () => {
    const b = bot('3-3');
    b.grabDrawing(X(4));
    expect(b.sim.bijli.active).toBe(true);
    b.walkTo(X(7), true);
    b.climb(110);
    b.step(1, { right: true });
    expect(b.sim.p.grind).not.toBeNull();
    b.step(60);
    expect(b.sim.p.climb?.x).toBe(20);
    downPole(b, 80);
    b.walkTo(X(23));
    b.walkTo(X(27));
    b.climb(100);
    b.holdE();
    expect(b.sim.circuits.isSpliced([27, 9])).toBe(true);
    downPole(b, 80);
    b.walkTo(X(31));
    b.tapE();
    expect(b.sim.circuits.powered('c1')).toBe(true);
    b.step(60 * 7);
    expect(b.sim.skylineFull()).toBe(true);
    expect(b.sim.done).toBe(true);
  });

  it('4-1 Ghar: door is shut in the dark, opens when the house lights', () => {
    const d = bot('4-1');
    d.walkTo(X(34));
    d.step(10);
    expect(d.sim.done).toBe(false);
    const b = bot('4-1');
    b.walkTo(X(12));
    b.climb();
    b.holdE();
    b.step(200);
    downPole(b);
    b.walkTo(X(34));
    b.step(5);
    expect(b.sim.done).toBe(true);
  });
});
