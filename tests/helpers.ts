import { NO_INPUT, RoomSim, type SimInput } from '../src/game/RoomSim';
import { ROOM_BY_ID } from '../src/levels/rooms';

/** Tiny scripted player for headless room tests. */
export function bot(roomId: string) {
  const sim = new RoomSim(ROOM_BY_ID[roomId]!);
  const dt = 1 / 60;
  const step = (n: number, inp: Partial<SimInput> = {}) => {
    for (let i = 0; i < n; i++) sim.update(dt, { ...NO_INPUT, ...inp });
  };
  const walkTo = (x: number) => {
    let n = 0;
    while (Math.abs(sim.p.x - x) > 6 && n++ < 900) {
      const r = x > sim.p.x;
      const stuck = sim.p.ground && Math.abs(sim.p.vx) < 1 && n > 2;
      step(1, { right: r, left: !r, jumpPressed: stuck, jumpHeld: true });
    }
  };
  const hop = (tx: number) => {
    step(1, { jumpPressed: true, jumpHeld: true });
    let n = 0;
    while (n++ < 60) {
      step(1, { right: tx > sim.p.x + 4, left: tx < sim.p.x - 4, jumpHeld: true });
      if (sim.p.ground && n > 5) break;
    }
  };
  const climb = (frames = 120) => {
    step(1, { up: true, upPressed: true });
    step(frames, { up: true });
  };
  const holdE = (frames = 70) => step(frames, { interact: true, interactPressed: true });
  const tapE = () => {
    step(1, { interact: true, interactPressed: true });
    step(2);
  };
  return { sim, step, walkTo, hop, climb, holdE, tapE };
}

export const X = (tx: number) => tx * 32 + 16;
export const FEET = (row: number) => row * 32 + 8; // feet y when standing on top of `row`
