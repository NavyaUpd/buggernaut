import { describe, expect, it } from 'vitest';
import { STRIKE } from '../src/config';
import { Circuits } from '../src/core/circuits';
import { checkRoom } from '../src/core/reach';
import { COLS, ROWS, parseRoom } from '../src/core/roomParse';
import { BijliTimer, strikeOffset, strikePhase } from '../src/core/timers';
import { ROOMS } from '../src/levels/rooms';

describe('circuits', () => {
  const defs = [
    { id: 'a', splices: [[1, 1] as const] },
    { id: 'b', splices: [[2, 2] as const, [3, 3] as const], breaker: [4, 4] as const, closed: true, water: true },
  ];
  it('shocks when the breaker is closed, never without a breaker', () => {
    const c = new Circuits(defs);
    expect(c.wouldShock([1, 1])).toBe(false);
    expect(c.wouldShock([2, 2])).toBe(true);
    c.toggle([4, 4]);
    expect(c.wouldShock([2, 2])).toBe(false);
  });
  it('is powered only when complete and closed', () => {
    const c = new Circuits(defs);
    expect(c.splice([1, 1])).toBe(true);
    expect(c.powered('a')).toBe(true);
    c.toggle([4, 4]); // open
    c.splice([2, 2]);
    expect(c.splice([3, 3])).toBe(false); // complete but open
    expect(c.powered('b')).toBe(false);
    c.toggle([4, 4]); // close
    expect(c.powered('b')).toBe(true);
    expect(c.allPowered()).toBe(true);
  });
  it('water is live whenever the water circuit breaker is closed, spliced or not', () => {
    const c = new Circuits(defs);
    expect(c.waterLive()).toBe(true);
    c.toggle([4, 4]);
    expect(c.waterLive()).toBe(false);
    c.splice([2, 2]);
    c.splice([3, 3]);
    c.toggle([4, 4]);
    expect(c.waterLive()).toBe(true);
  });
});

describe('roomParse', () => {
  for (const def of ROOMS) {
    it(`${def.id} is ${COLS}x${ROWS} with one P, an E, and markers matching metadata`, () => {
      const r = parseRoom(def);
      expect(def.map.length).toBe(ROWS);
      for (const row of def.map) expect(row.length).toBe(COLS);
      expect(r.errors).toEqual([]);
      expect(r.exits.length).toBeGreaterThan(0);
    });
  }
});

describe('validator (§8.3)', () => {
  for (const def of ROOMS) {
    it(`${def.id} passes the reachability rules`, () => {
      expect(checkRoom(parseRoom(def)).errors).toEqual([]);
    });
  }
  it('catches a room whose exit is reachable in the dark', () => {
    const def = ROOMS[0]!;
    const stairs = def.map.map((row) => row.replace(/c/g, '#')); // clouds become permanent blocks
    expect(checkRoom(parseRoom({ ...def, map: stairs })).errors.join()).toContain('exit reachable in the dark');
  });
});

describe('strike timing', () => {
  it('telegraphs 1.2 s, strikes 0.25 s, then is quiet, every 3.6 s', () => {
    expect(strikePhase(0, 0).state).toBe('telegraph');
    expect(strikePhase(1.19, 0).state).toBe('telegraph');
    expect(strikePhase(1.21, 0).state).toBe('strike');
    expect(strikePhase(1.46, 0).state).toBe('quiet');
    expect(strikePhase(3.59, 0).state).toBe('quiet');
    expect(strikePhase(STRIKE.cycle + 1.3, 0).state).toBe('strike');
  });
  it('columns are offset 0 / 1.2 / 2.4 s in listed order', () => {
    expect([0, 1, 2].map(strikeOffset)).toEqual([...STRIKE.offsets]);
    expect(strikePhase(1.3 + STRIKE.offsets[1], strikeOffset(1)).state).toBe("strike");
    expect(strikePhase(1.3 + STRIKE.offsets[2], strikeOffset(2)).state).toBe("strike");
  });
  it('BIJLI lasts 8 s', () => {
    const b = new BijliTimer();
    b.start();
    let ended = false;
    for (let i = 0; i < 479; i++) if (b.update(1 / 60) === 'ended') ended = true;
    expect(ended).toBe(false);
    expect(b.update(2 / 60)).toBe('ended');
  });
});
