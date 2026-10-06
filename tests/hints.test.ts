import { beforeEach, describe, expect, it } from 'vitest';
import { RoomSim } from '../src/game/RoomSim';
import { bot, X } from './helpers';

describe('first-time key hints', () => {
  beforeEach(() => RoomSim.resetRun());

  it('shows W at the first pole, then Space while climbing, and never again once done', () => {
    const b = bot('1-1');
    b.walkTo(X(12));
    b.step(2);
    expect(b.sim.prompt?.text).toBe('W to climb');
    b.climb(30);
    b.step(1, { up: true });
    expect(b.sim.p.climb).not.toBeNull();
    expect(b.sim.prompt?.text).toBe('Space to jump off');
    // jumping off ends the hint for good
    b.step(1, { jumpPressed: true, jumpHeld: true, right: true });
    b.step(2);
    expect(RoomSim.hintDone.jump).toBe(true);
    expect(RoomSim.hintDone.climb).toBe(true);
    const b2 = bot('1-1');
    b2.walkTo(X(12));
    b2.step(2);
    expect(b2.sim.prompt).toBeNull();
  });

  it('the splice prompt wins over a hint, and resetRun brings the hints back', () => {
    const b = bot('1-1');
    b.walkTo(X(12));
    b.climb();
    expect(b.sim.prompt?.text).toBe('Hold E');
    RoomSim.resetRun();
    expect(RoomSim.hintDone.climb).toBe(false);
  });

  it('shows the grind hint at a pole top where a lit rail starts', () => {
    const b = bot('1-3');
    b.sim.debugPowerAll();
    b.step(240);
    b.sim.p.x = 9 * 32 + 16;
    b.sim.p.y = 8 * 32 + 8; // standing on the pole top at (9, 8)
    b.sim.p.ground = true;
    RoomSim.hintDone.climb = true;
    b.step(2);
    expect(b.sim.prompt?.text).toContain('grind');
  });
});
