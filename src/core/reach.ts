// Coarse reachability validator for room design (§8.3). Pure TS.
// Jump envelopes are simulated from the real PLAYER constants. "conservative" scales horizontal reach down (used to
// prove something IS reachable); "optimistic" scales it up (used to prove something is NOT reachable).
import { PLAYER, VIEW } from '../config';
import type { Tile } from '../levels/rooms';
import { inQuad } from './geom';
import { COLS, ROWS, type ParsedRoom } from './roomParse';

const T = VIEW.tile;
const OY = VIEW.offsetY;

/** Simulate a held jump: returns samples of [time, height above takeoff] until it falls 12 tiles below. */
function arc(vy0: number, varTime: number, second?: { vy: number; varTime: number }): [number, number][] {
  const dt = 1 / 480;
  let y = 0;
  let vy = -vy0;
  let varT = varTime;
  let t = 0;
  let usedSecond = false;
  const out: [number, number][] = [];
  while (y < 12 * T && t < 3) {
    let g = PLAYER.gravity;
    if (Math.abs(vy) < PLAYER.halfGravThreshold) g *= 0.5;
    vy = Math.min(PLAYER.maxFall, vy + g * dt);
    if (varT > 0) {
      vy = Math.min(vy, -(usedSecond ? second!.vy : vy0));
      varT -= dt;
    }
    if (second && !usedSecond && vy >= 0) {
      usedSecond = true;
      vy = -second.vy;
      varT = second.varTime;
    }
    y += vy * dt;
    t += dt;
    out.push([t, -y]);
  }
  return out;
}

/** Horizontal distance covered after time t, starting at vx0 and settling to maxRun in the air. */
function horiz(t: number, vx0: number): number {
  const dt = 1 / 480;
  let x = 0;
  let vx = vx0;
  for (let s = 0; s < t; s += dt) {
    const target = PLAYER.maxRun;
    const acc = vx > target ? PLAYER.runReduce : PLAYER.runAccel;
    vx += Math.sign(target - vx) * Math.min(Math.abs(target - vx), acc * PLAYER.airMult * dt);
    x += vx * dt;
  }
  return x;
}

interface Envelope {
  maxUp: number; // px
  /** max horizontal px reachable when landing at height dy (px, + = up), on the way down */
  reach(dy: number): number;
}

function envelope(vy0: number, varTime: number, vx0: number, second?: { vy: number; varTime: number }): Envelope {
  const pts = arc(vy0, varTime, second);
  const maxUp = Math.max(...pts.map((p) => p[1]));
  const cache = new Map<number, number>();
  return {
    maxUp,
    reach(dy: number) {
      const k = Math.round(dy);
      if (cache.has(k)) return cache.get(k)!;
      let tHit = -1;
      let peaked = false;
      for (let i = 1; i < pts.length; i++) {
        if (pts[i]![1] < pts[i - 1]![1]) peaked = true;
        if (peaked && pts[i]![1] <= dy) {
          tHit = pts[i]![0];
          break;
        }
      }
      const r = tHit < 0 ? -1 : horiz(tHit, vx0);
      cache.set(k, r);
      return r;
    },
  };
}

const ENV = {
  jump: envelope(PLAYER.jumpSpeed, PLAYER.varJumpTime, PLAYER.maxRun + PLAYER.jumpHBoost),
  pole: envelope(PLAYER.poleJumpOff.vy, 0.12, PLAYER.poleJumpOff.vx),
  bounce: envelope(PLAYER.bounceSpeed, 0, PLAYER.maxRun),
  double: envelope(PLAYER.jumpSpeed, PLAYER.varJumpTime, PLAYER.maxRun + PLAYER.jumpHBoost, {
    vy: PLAYER.doubleJumpSpeed,
    varTime: PLAYER.doubleJumpVarTime,
  }),
};

export interface Scenario {
  /** Circuit ids that are powered (their lamps light their panels). */
  powered: Set<string>;
  bijli: boolean;
  waterLive: boolean;
  mode: 'conservative' | 'optimistic';
}

type Node = string; // "s,x,y" standing | "c,x,y" climbing

export function reachable(room: ParsedRoom, sc: Scenario): Set<Node> {
  const scale = sc.mode === 'conservative' ? 0.85 : 1.12;
  const upSlack = sc.mode === 'conservative' ? -6 : 6;
  const lit = (x: number, y: number) => {
    if (sc.bijli) return true;
    const px = x * T + T / 2;
    const py = y * T + OY + T / 2;
    return room.lamps.some((l) => sc.powered.has(l.circuit) && inQuad(px, py, l.quad));
  };
  const blocked = (x: number, y: number) => room.solid(x, y);
  const deadly = (x: number, y: number) => {
    if (y >= ROWS) return true;
    if (room.water(x, y) && sc.waterLive && !sc.bijli) return true;
    if (room.cell(x, y) === 'n' && !lit(x, y)) return true;
    return false;
  };
  const poleTopCell = (x: number, y: number) => room.climbable(x, y) && !room.climbable(x, y - 1);
  const support = (x: number, y: number) =>
    room.solid(x, y) || room.oneway(x, y) || (room.cloud(x, y) && lit(x, y)) || poleTopCell(x, y);
  const canStand = (x: number, y: number) =>
    x >= 0 && x < COLS && y >= 1 && y < ROWS - 1 && !blocked(x, y) && !blocked(x, y - 1) && !deadly(x, y) && !deadly(x, y - 1) && support(x, y + 1);
  const snakeAt = (x: number, y: number) => room.cell(x, y) === 'n' && lit(x, y);

  const seen = new Set<Node>();
  const queue: Node[] = [];
  const push = (n: Node) => {
    if (!seen.has(n)) {
      seen.add(n);
      queue.push(n);
    }
  };

  // Land targets for a jump of envelope `env` from feet row y at column x (feet at top of row y+1).
  const jumpFrom = (x: number, y: number, env: Envelope) => {
    for (let ty = 1; ty < ROWS - 1; ty++) {
      const dy = (y - ty) * T; // + = up
      if (dy > env.maxUp + upSlack) continue;
      for (let tx = 0; tx < COLS; tx++) {
        if (tx === x && ty === y) continue;
        const gap = Math.abs(tx - x);
        const need = Math.max(0, gap * T - 22 + 2);
        const r = env.reach(dy);
        if (r < 0 || need > r * scale) continue;
        // clearance: columns between must be open at the higher body's head row
        const headRow = Math.min(y, ty) - 1;
        let clear = true;
        for (let cx = Math.min(x, tx) + 1; cx < Math.max(x, tx); cx++) {
          if (blocked(cx, headRow) || blocked(cx, headRow - 1)) clear = false;
        }
        // rising straight up out of the origin
        for (let k = 1; k <= Math.ceil(Math.max(0, dy) / T) + 1 && clear; k++) if (blocked(x, y - 1 - k)) clear = false;
        if (!clear) continue;
        if (canStand(tx, ty)) push(`s,${tx},${ty}`);
        if (room.climbable(tx, ty) && !deadly(tx, ty)) push(`c,${tx},${ty}`);
        if (snakeAt(tx, ty + 1) || snakeAt(tx, ty)) push(`b,${tx},${ty}`);
      }
    }
  };

  const [sx, sy] = room.spawn;
  push(`s,${sx},${sy}`);
  while (queue.length) {
    const n = queue.shift()!;
    const [kind, xs, ys] = n.split(',');
    const x = Number(xs);
    const y = Number(ys);
    if (kind === 's') {
      for (const dx of [-1, 1]) {
        const nx = x + dx;
        if (blocked(nx, y) || blocked(nx, y - 1) || deadly(nx, y)) continue;
        if (snakeAt(nx, y)) push(`b,${nx},${y}`);
        if (canStand(nx, y)) push(`s,${nx},${y}`);
        else {
          let fy = y;
          while (fy < ROWS - 1 && !support(nx, fy + 1) && !room.climbable(nx, fy)) fy++;
          if (room.climbable(nx, fy) && !deadly(nx, fy)) push(`c,${nx},${fy}`);
          else if (canStand(nx, fy)) push(`s,${nx},${fy}`);
        }
      }
      jumpFrom(x, y, sc.bijli ? ENV.double : ENV.jump);
      if (room.climbable(x, y) || room.climbable(x, y - 1) || room.climbable(x, y + 1)) {
        const cy = room.climbable(x, y) ? y : room.climbable(x, y - 1) ? y - 1 : y + 1;
        push(`c,${x},${cy}`);
      }
      // rails from a pole top
      for (const rl of room.rails) {
        const grind = sc.bijli || (rl.circuit !== null && sc.powered.has(rl.circuit) && railLit(room, rl.idx, sc.powered));
        if (!grind) continue;
        const a: Tile = [Math.floor(rl.ax / T), Math.round((rl.ay - OY) / T)];
        const b: Tile = [Math.floor(rl.bx / T), Math.round((rl.by - OY) / T)];
        if (x === a[0] && y === a[1] - 1) push(`c,${b[0]},${b[1]}`);
        if (x === b[0] && y === b[1] - 1) push(`c,${a[0]},${a[1]}`);
      }
    } else if (kind === 'c') {
      for (const dy of [-1, 1]) if (room.climbable(x, y + dy) && !deadly(x, y + dy)) push(`c,${x},${y + dy}`);
      if (!room.climbable(x, y - 1) && canStand(x, y - 1)) push(`s,${x},${y - 1}`);
      if (canStand(x, y)) push(`s,${x},${y}`);
      if (canStand(x, y + 1)) push(`s,${x},${y + 1}`);
      // drop off: fall straight down from here
      let fy = y;
      while (fy < ROWS - 1 && !support(x, fy + 1)) fy++;
      if (canStand(x, fy)) push(`s,${x},${fy}`);
      jumpFrom(x, y, sc.bijli ? ENV.double : ENV.pole);
    } else if (kind === 'b') {
      jumpFrom(x, y, ENV.bounce);
    }
  }
  return seen;
}

/** Rail fully inside the light of its own circuit's lamps. */
export function railLit(room: ParsedRoom, idx: number, powered?: Set<string>): boolean {
  const r = room.rails[idx];
  if (!r || r.circuit === null) return false;
  const lamps = room.lamps.filter((l) => l.circuit === r.circuit && (!powered || powered.has(l.circuit)));
  for (let i = 0; i <= 20; i++) {
    const k = i / 20;
    const px = r.ax + (r.bx - r.ax) * k;
    const py = r.ay + (r.by - r.ay) * k - 20;
    if (!lamps.some((l) => inQuad(px, py, l.quad))) return false;
  }
  return true;
}

/** Can the player get their body onto tile t (standing or climbing on/next to it)? */
export function touches(seen: Set<Node>, t: Tile): boolean {
  const [tx, ty] = t;
  for (const n of seen) {
    const [kind, xs, ys] = n.split(',');
    if (kind === 'b') continue;
    const x = Number(xs);
    const y = Number(ys);
    // standing in column x the 22 px body can overlap a neighbouring column; body rows y-1..y, plus the reach below
    if (Math.abs(x - tx) <= (kind === 's' ? 1 : 0) && ty >= y - 1 && ty <= y + 1) return true;
  }
  return false;
}

export interface RoomCheck {
  id: string;
  errors: string[];
}

/** The §8.3 rules for one room. */
export function checkRoom(room: ParsedRoom): RoomCheck {
  const errors = [...room.errors];
  const def = room.def;
  const hasD = room.drawings.length > 0;
  const initialWater = def.circuits.some((c) => c.water && (c.closed ?? true));
  const all = new Set(def.circuits.map((c) => c.id));

  // rails with a circuit must be fully lit by that circuit's lamps
  room.rails.forEach((r, i) => {
    if (r.circuit !== null && !railLit(room, i)) errors.push(`rail ${i} is not fully inside its circuit's light`);
  });

  // exit must NOT be reachable in the dark (any breaker state), unless the exit is gated by logic
  // every crayon cloud must be inside some lamp's panel, or it can never become solid (an unfair fake platform)
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) {
      if (!room.cloud(x, y)) continue;
      const px = x * T + T / 2;
      const py = y * T + OY + T / 2;
      if (!room.lamps.some((l) => inQuad(px, py, l.quad))) errors.push(`cloud at ${x},${y} is outside every lamp's light`);
    }
  // (rooms without circuits, like 2-3, are a pure traversal challenge and may be crossed in the dark)
  if (!def.gatedExit && def.circuits.length > 0) {
    for (const waterLive of [initialWater, false]) {
      const dark = reachable(room, { powered: new Set(), bijli: false, waterLive, mode: 'optimistic' });
      if (room.exits.some((e) => touches(dark, e))) errors.push(`exit reachable in the dark (waterLive=${waterLive})`);
    }
  }
  // each circuit's splice + breaker reachable, given the earlier circuits are powered (water safe: breaker open)
  const poweredSoFar = new Set<string>();
  for (const c of def.circuits) {
    // power-ups are optional: every splice and breaker must be reachable WITHOUT a drawing
    const seen = reachable(room, { powered: new Set(poweredSoFar), bijli: false, waterLive: false, mode: 'conservative' });
    for (const s of c.splices) if (!touches(seen, s)) errors.push(`circuit ${c.id}: splice ${s.join(',')} unreachable`);
    if (c.breaker && !touches(seen, c.breaker)) errors.push(`circuit ${c.id}: breaker unreachable`);
    poweredSoFar.add(c.id);
  }
  // exit reachable once everything is powered (water live if its circuit is on)
  const waterOn = def.circuits.some((c) => c.water);
  const litSeen = reachable(room, { powered: all, bijli: false, waterLive: waterOn, mode: 'conservative' });
  if (!room.exits.some((e) => touches(litSeen, e))) errors.push('exit unreachable after power-on');
  // breakers must be reachable again to switch back on after splicing (no water while switching)
  // a drawing must still be reachable without BIJLI (it is a choice, not a reward for already having it)
  if (hasD) {
    const plain = reachable(room, { powered: new Set(), bijli: false, waterLive: initialWater, mode: 'conservative' });
    for (const d of room.drawings) {
      // a drawing may float up to a full jump (3 tiles) above where you can stand
      const ok = [...plain].some((n) => {
        const [kind, xs, ys] = n.split(',');
        return kind === 's' && Math.abs(Number(xs) - d[0]) <= 1 && d[1] >= Number(ys) - 4 && d[1] <= Number(ys) + 1;
      });
      if (!ok) errors.push(`drawing at ${d.join(',')} unreachable`);
    }
  }
  return { id: def.id, errors };
}
