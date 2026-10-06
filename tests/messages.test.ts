import { beforeEach, describe, expect, it } from 'vitest';
import { MESSAGES } from '../src/config';
import { RoomSim } from '../src/game/RoomSim';
import { HINTS } from '../src/story/script';
import { bot, X } from './helpers';

/** Step a bot and record every message that is on screen, frame by frame. */
function watch(b: ReturnType<typeof bot>, frames: number, inp = {}) {
  const shown: { key: string; frame: number }[] = [];
  for (let f = 0; f < frames; f++) {
    b.step(1, inp);
    const m = b.sim.message();
    const key = m ? (m.kind === 'card' ? `card:${m.id}` : `caption:${m.text}`) : '';
    shown.push({ key, frame: f });
  }
  return shown;
}

/** Contiguous runs of the same on-screen message, with the empty frames between them. */
function runs(shown: { key: string }[]) {
  const out: { key: string; len: number }[] = [];
  for (const s of shown) {
    const last = out[out.length - 1];
    if (last && last.key === s.key) last.len++;
    else out.push({ key: s.key, len: 1 });
  }
  return out;
}

describe('one message queue (captions, beats, hint cards)', () => {
  beforeEach(() => RoomSim.resetRun());

  it('every hint card is one line of 10 words or fewer', () => {
    for (const [id, h] of Object.entries(HINTS)) {
      expect(h.text.includes('\n'), id).toBe(false);
      expect(h.text.trim().split(/\s+/).length, `${id}: "${h.text}"`).toBeLessThanOrEqual(10);
    }
  });

  it('caption, beat and a card never overlap, and there is a 0.4 s gap between them', () => {
    // 1-3 has a caption and a beat; the breaker card triggers on the first frame (the breaker is next to the spawn)
    // and queues right behind the room caption, ahead of the radio beat
    const b = bot('1-3');
    const r = runs(watch(b, 60 * 14));
    const visible = r.filter((x) => x.key);
    expect(visible.map((x) => x.key.split(':')[0])).toEqual(['caption', 'card', 'caption']);
    // between two visible messages there is always an empty run of ≥ 0.4 s (24 frames at 60 Hz, allow 1 frame slack)
    r.forEach((x, i) => {
      if (!x.key && i > 0 && i < r.length - 1) expect(x.len).toBeGreaterThanOrEqual(Math.round(MESSAGES.gap * 60) - 1);
    });
  });

  it('hint cards trigger by proximity, not on room entry', () => {
    // 2-1: the snake card waits until the player comes within 4 tiles of the snake
    const b = bot('2-1');
    b.step(60 * 9);
    expect(RoomSim.seenHints.has('snake')).toBe(false);
    b.walkTo(X(21));
    expect(RoomSim.seenHints.has('snake')).toBe(false); // 5 tiles away: not yet
    b.walkTo(X(22));
    expect(RoomSim.seenHints.has('snake')).toBe(true); // within 4 tiles
  });

  it('each card shows once per run, even across rooms', () => {
    const a = bot('1-3');
    a.step(60 * 12);
    expect(RoomSim.seenHints.has('breaker')).toBe(true);
    const b = bot('2-2'); // also has a breaker
    b.walkTo(X(23));
    b.step(60 * 4);
    expect(b.sim.messages.some((m) => m.kind === 'card' && m.id === 'breaker')).toBe(false);
  });

  it('cards stay first-come-first-served: a proximity card waits behind an entry card', () => {
    const b = bot('1-1'); // the move card is queued on entry; walking to the pole triggers the splice card
    b.walkTo(400);
    b.climb();
    const cards = b.sim.messages.filter((m) => m.kind === 'card').map((m) => (m.kind === 'card' ? m.id : ''));
    expect(cards.indexOf('move')).toBeLessThan(cards.indexOf('splice'));
  });

  it('a card is queued behind the message on screen instead of replacing it', () => {
    const b = bot('2-1'); // caption, then a radio beat; the snake is reached while the caption is still up
    b.step(30);
    b.walkTo(X(22));
    const m = b.sim.message();
    expect(m?.kind).toBe('caption');
    expect(b.sim.messages[1]?.kind).toBe('card'); // next in line, ahead of the waiting beat
    expect(b.sim.messages[2]?.kind).toBe('caption');
  });
});
