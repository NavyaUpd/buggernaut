// Circuit state: splices, breakers, powered rule, shock rule, live-water rule (§6.2, §6.3). Pure TS.
import type { CircuitDef, Tile } from '../levels/rooms';

const key = (t: Tile) => `${t[0]},${t[1]}`;

export class Circuits {
  private spliced = new Set<string>();
  private closed = new Map<string, boolean>();
  readonly defs: readonly CircuitDef[];

  constructor(defs: readonly CircuitDef[]) {
    this.defs = defs;
    for (const c of defs) this.closed.set(c.id, c.breaker ? (c.closed ?? true) : true);
  }

  get(id: string): CircuitDef | undefined {
    return this.defs.find((c) => c.id === id);
  }
  circuitOfSplice(t: Tile): CircuitDef | undefined {
    return this.defs.find((c) => c.splices.some((s) => key(s) === key(t)));
  }
  circuitOfBreaker(t: Tile): CircuitDef | undefined {
    return this.defs.find((c) => c.breaker && key(c.breaker) === key(t));
  }

  isSpliced(t: Tile): boolean {
    return this.spliced.has(key(t));
  }
  /** Breaker closed (= live). Circuits without a breaker count as closed. */
  isClosed(id: string): boolean {
    return this.closed.get(id) ?? true;
  }
  hasBreaker(id: string): boolean {
    return !!this.get(id)?.breaker;
  }
  complete(id: string): boolean {
    const c = this.get(id);
    return !!c && c.splices.every((s) => this.spliced.has(key(s)));
  }
  /** Powered = all splices done and breaker (if any) closed. */
  powered(id: string): boolean {
    return this.complete(id) && this.isClosed(id);
  }
  allPowered(): boolean {
    return this.defs.every((c) => this.powered(c.id));
  }

  /** Splicing while the circuit's breaker is closed shocks you (circuits without a breaker never shock). */
  wouldShock(t: Tile): boolean {
    const c = this.circuitOfSplice(t);
    return !!c && !!c.breaker && this.isClosed(c.id);
  }

  /** Completes a splice. Returns true if this made the circuit powered. */
  splice(t: Tile): boolean {
    const c = this.circuitOfSplice(t);
    if (!c || this.spliced.has(key(t))) return false;
    const before = this.powered(c.id);
    this.spliced.add(key(t));
    return !before && this.powered(c.id);
  }

  /** Toggles a breaker. Returns the new closed state, or null if `t` isn't a breaker. */
  toggle(t: Tile): boolean | null {
    const c = this.circuitOfBreaker(t);
    if (!c) return null;
    const v = !this.isClosed(c.id);
    this.closed.set(c.id, v);
    return v;
  }

  /** Puts one circuit back to its initial state (splices undone, breaker as authored). */
  reset(id: string): void {
    const c = this.get(id);
    if (!c) return;
    for (const s of c.splices) this.spliced.delete(key(s));
    this.closed.set(c.id, c.breaker ? (c.closed ?? true) : true);
  }

  /** Room water is deadly whenever the water circuit's breaker is closed, spliced or not. */
  waterLive(): boolean {
    return this.defs.some((c) => c.water && this.isClosed(c.id));
  }
}
