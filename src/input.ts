// Global keyboard state. Used by every scene instead of Phaser's keyboard plugin so the room sim stays plain TS.

const GAME_KEYS = new Set([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);

class Input {
  private down = new Set<string>();
  private pressedQ = new Set<string>();
  private anyQ = false;
  private listeners: ((key: string) => void)[] = [];

  constructor() {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (GAME_KEYS.has(k)) e.preventDefault();
      if (!this.down.has(k)) {
        this.pressedQ.add(k);
        this.anyQ = true;
        for (const l of [...this.listeners]) l(k);
      }
      this.down.add(k);
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.down.clear());
  }

  isDown(k: string): boolean {
    return this.down.has(k);
  }
  /** True once per physical press; cleared by endFrame(). */
  pressed(k: string): boolean {
    return this.pressedQ.has(k);
  }
  anyPressed(): boolean {
    return this.anyQ;
  }
  endFrame(): void {
    this.pressedQ.clear();
    this.anyQ = false;
  }
  /** Called on every fresh keydown (before endFrame). Returns an unsubscribe function. */
  onKey(fn: (key: string) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  get left() {
    return this.isDown('a') || this.isDown('arrowleft');
  }
  get right() {
    return this.isDown('d') || this.isDown('arrowright');
  }
  get up() {
    return this.isDown('w') || this.isDown('arrowup');
  }
  get downKey() {
    return this.isDown('s') || this.isDown('arrowdown');
  }
  get interact() {
    return this.isDown('e');
  }
}

export const input = new Input();

/** Settings shared by all scenes. */
export const settings = { reduceFlashing: false, muted: false };
