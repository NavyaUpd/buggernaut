// RoomDef → parsed room: cell queries, markers, px geometry. Pure TS (§12).
import { VIEW } from '../config';
import type { RoomDef, Tile } from '../levels/rooms';
import { panelQuad, quadBox, tileCentre, type Box, type Quad } from './geom';

const T = VIEW.tile;
const OY = VIEW.offsetY;
export const COLS = VIEW.cols;
export const ROWS = VIEW.rows;

export interface PoleRun {
  x: number;
  top: number; // topmost climbable row
  bottom: number; // bottom climbable row
  ladder: boolean;
}

export interface SnakeDef {
  x0: number; // tile run [x0, x1] on row y
  x1: number;
  y: number;
}

export interface ParsedLamp {
  idx: number;
  tx: number;
  ty: number;
  r: number;
  circuit: string;
  kind: 'lamp' | 'house' | 'ward';
  /** Lamp head (light source) in px. */
  hx: number;
  hy: number;
  /** Ground y under the head (first solid below, or room bottom). */
  groundY: number;
  quad: Quad;
  box: Box;
}

export interface ParsedRail {
  idx: number;
  ax: number;
  ay: number;
  bx: number;
  by: number;
  circuit: string | null;
}

export interface ParsedRoom {
  def: RoomDef;
  id: string;
  cell(x: number, y: number): string;
  solid(x: number, y: number): boolean;
  oneway(x: number, y: number): boolean;
  cloud(x: number, y: number): boolean;
  climbable(x: number, y: number): boolean;
  water(x: number, y: number): boolean;
  spawn: Tile;
  exits: Tile[];
  splices: Tile[];
  breakers: Tile[];
  drawings: Tile[];
  /** Z: the storm-dragon drawing (calms the storm for a while). */
  dragons: Tile[];
  snakes: SnakeDef[];
  poles: PoleRun[];
  lamps: ParsedLamp[];
  rails: ParsedRail[];
  waterCells: Tile[];
  errors: string[];
}

const CLIMB = new Set(['|', 'H']);

export function parseRoom(def: RoomDef): ParsedRoom {
  const errors: string[] = [];
  const map = def.map;
  if (map.length !== ROWS) errors.push(`map has ${map.length} rows, expected ${ROWS}`);
  map.forEach((row, i) => {
    if (row.length !== COLS) errors.push(`row ${i} has ${row.length} cols, expected ${COLS}`);
  });
  const raw = (x: number, y: number): string => (x < 0 || x >= COLS ? '#' : y < 0 || y >= ROWS ? '.' : (map[y]?.[x] ?? '.'));

  // X cells are climbable when they sit on (or under) a pole/ladder cell.
  const climbX = (x: number, y: number) => raw(x, y) === 'X' && (CLIMB.has(raw(x, y + 1)) || CLIMB.has(raw(x, y - 1)));
  const climbable = (x: number, y: number) => CLIMB.has(raw(x, y)) || climbX(x, y);
  // Water: '~' cells, plus pole cells standing in water (a '~' on both sides).
  const water = (x: number, y: number) =>
    raw(x, y) === '~' || (climbable(x, y) && raw(x - 1, y) === '~' && raw(x + 1, y) === '~');

  const spawn: Tile[] = [];
  const exits: Tile[] = [];
  const splices: Tile[] = [];
  const breakers: Tile[] = [];
  const drawings: Tile[] = [];
  const dragons: Tile[] = [];
  const waterCells: Tile[] = [];
  const snakes: SnakeDef[] = [];
  const lampMarks: Tile[] = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const c = raw(x, y);
      if (c === 'P') spawn.push([x, y]);
      else if (c === 'E') exits.push([x, y]);
      else if (c === 'X') splices.push([x, y]);
      else if (c === 'B' || c === 'M') breakers.push([x, y]);
      else if (c === 'D') drawings.push([x, y]);
      else if (c === 'Z') dragons.push([x, y]);
      else if (c === 'L') lampMarks.push([x, y]);
      if (water(x, y)) waterCells.push([x, y]);
      if (c === 'n' && raw(x - 1, y) !== 'n') {
        let x1 = x;
        while (raw(x1 + 1, y) === 'n') x1++;
        snakes.push({ x0: x, x1, y });
      }
    }
  }
  if (spawn.length !== 1) errors.push(`expected exactly one P, found ${spawn.length}`);
  if (exits.length < 1) errors.push('expected at least one E');

  const poles: PoleRun[] = [];
  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < ROWS; y++) {
      if (!climbable(x, y) || climbable(x, y - 1)) continue;
      let b = y;
      while (climbable(x, b + 1)) b++;
      poles.push({ x, top: y, bottom: b, ladder: raw(x, y) === 'H' || raw(x, b) === 'H' });
    }
  }

  const solid = (x: number, y: number) => raw(x, y) === '#';
  const lamps: ParsedLamp[] = def.lamps.map((l, idx) => {
    const [tx, ty] = l.at;
    const [hx, hy] = tileCentre(tx, ty);
    let gy = ty + 1;
    while (gy < ROWS && !solid(tx, gy)) gy++;
    const quad = panelQuad(tx, ty, l.r);
    return {
      idx,
      tx,
      ty,
      r: l.r,
      circuit: l.circuit,
      kind: l.kind ?? 'lamp',
      hx,
      hy,
      groundY: gy * T + OY,
      quad,
      box: quadBox(quad),
    };
  });
  const rails: ParsedRail[] = def.rails.map((r, idx) => {
    const [ax, ay] = r.a;
    const [bx, by] = r.b;
    return { idx, ax: ax * T + T / 2, ay: ay * T + OY, bx: bx * T + T / 2, by: by * T + OY, circuit: r.circuit ?? null };
  });

  // Markers must match metadata.
  const key = (t: Tile) => `${t[0]},${t[1]}`;
  const spliceKeys = new Set(splices.map(key));
  const breakerKeys = new Set(breakers.map(key));
  const circuitIds = new Set(def.circuits.map((c) => c.id));
  const usedSplices = new Set<string>();
  for (const c of def.circuits) {
    for (const s of c.splices) {
      if (!spliceKeys.has(key(s))) errors.push(`circuit ${c.id}: splice ${key(s)} is not an X in the map`);
      if (usedSplices.has(key(s))) errors.push(`splice ${key(s)} belongs to two circuits`);
      usedSplices.add(key(s));
    }
    if (c.breaker && !breakerKeys.has(key(c.breaker))) errors.push(`circuit ${c.id}: breaker ${key(c.breaker)} is not B/M`);
    if (c.master && c.breaker && raw(c.breaker[0], c.breaker[1]) !== 'M') errors.push(`circuit ${c.id}: master breaker must be M`);
  }
  for (const s of splices) if (!usedSplices.has(key(s))) errors.push(`X at ${key(s)} belongs to no circuit`);
  for (const b of breakers) {
    if (!def.circuits.some((c) => c.breaker && key(c.breaker) === key(b))) errors.push(`breaker at ${key(b)} belongs to no circuit`);
  }
  const lampKeys = new Set(def.lamps.map((l) => key(l.at)));
  for (const m of lampMarks) if (!lampKeys.has(key(m))) errors.push(`L at ${key(m)} has no lamp entry`);
  for (const l of def.lamps) {
    if (raw(l.at[0], l.at[1]) !== 'L') errors.push(`lamp at ${key(l.at)} has no L in the map`);
    if (!circuitIds.has(l.circuit)) errors.push(`lamp at ${key(l.at)}: unknown circuit ${l.circuit}`);
  }
  const poleTop = (t: Tile) => poles.some((p) => p.x === t[0] && p.top === t[1]);
  def.rails.forEach((r, i) => {
    if (!poleTop(r.a)) errors.push(`rail ${i}: end a ${key(r.a)} is not a pole top`);
    if (!poleTop(r.b)) errors.push(`rail ${i}: end b ${key(r.b)} is not a pole top`);
    if (r.circuit && !circuitIds.has(r.circuit)) errors.push(`rail ${i}: unknown circuit ${r.circuit}`);
  });
  def.strikes.forEach((s, i) => {
    if (s.x < 0 || s.x + s.w > COLS) errors.push(`strike ${i} out of bounds`);
  });
  if (waterCells.length && !def.circuits.some((c) => c.water)) errors.push('room has water but no water circuit');

  return {
    def,
    id: def.id,
    cell: raw,
    solid,
    oneway: (x, y) => raw(x, y) === '=',
    cloud: (x, y) => raw(x, y) === 'c',
    climbable,
    water,
    spawn: spawn[0] ?? [1, 1],
    exits,
    splices,
    breakers,
    drawings,
    dragons,
    snakes,
    poles,
    lamps,
    rails,
    waterCells,
    errors,
  };
}

/** Pole run containing tile (x, y), if any. */
export function poleAt(room: ParsedRoom, x: number, y: number): PoleRun | undefined {
  return room.poles.find((p) => p.x === x && y >= p.top && y <= p.bottom);
}
