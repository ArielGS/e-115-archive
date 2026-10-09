// @vitest-environment jsdom
// The echo on recorded samples (the zombie growl): a delay line that feeds
// back into itself through a low-pass, so every repeat is later, quieter and
// darker, and that is torn down once the last repeat has faded.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class FakeNode {
  out: FakeNode[] = [];
  disconnected = false;
  constructor(readonly kind: string) {}
  connect<T extends FakeNode>(node: T): T {
    this.out.push(node);
    return node;
  }
  disconnect() {
    this.disconnected = true;
  }
}
const param = (value = 0) => ({ value, setValueAtTime() {}, linearRampToValueAtTime() {} });
const nodes: FakeNode[] = [];
const make = <T extends object>(kind: string, extra: T) => {
  const n = Object.assign(new FakeNode(kind), extra);
  nodes.push(n);
  return n;
};
const contexts: FakeAudioContext[] = [];
class FakeAudioContext {
  constructor() {
    contexts.push(this);
  }
  state = 'running';
  currentTime = 0;
  destination = make('destination', {});
  resume() {}
  createGain = () => make('gain', { gain: param(1) });
  createDelay = (max: number) => make('delay', { max, delayTime: param() });
  createBiquadFilter = () => make('filter', { type: '', frequency: param(), Q: param() });
  createBufferSource = () => make('source', { buffer: null, start() {}, stop() {} });
  decodeAudioData = async () => ({ duration: 1.2 });
}

const byKind = (kind: string) => nodes.filter((n) => n.kind === kind) as (FakeNode & Record<string, any>)[];

beforeEach(() => {
  vi.useFakeTimers();
  nodes.length = 0;
  vi.stubGlobal('AudioContext', FakeAudioContext);
  vi.stubGlobal('fetch', async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }));
  localStorage.setItem('archivo115:sound', 'on');
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  localStorage.clear();
});

const { playSample, echoTail } = await import('../../src/scripts/samples');
const ECHO = { delay: 0.25, feedback: 0.5, wet: 0.6, tone: 1500 };

describe('sample echo', () => {
  it('without echo: just the sound, no delay line', async () => {
    await playSample('/sounds/a.mp3');
    expect(byKind('delay')).toHaveLength(0);
  });

  it('builds a feedback loop through a low-pass, plus a wet send to the speakers', async () => {
    await playSample('/sounds/b.mp3', { volume: 0.8, echo: ECHO });
    const [delay] = byKind('delay');
    const [tone] = byKind('filter');
    const [dry, feedback, wet] = byKind('gain');
    const destination = contexts.at(-1)!.destination;
    expect(delay.delayTime.value).toBe(0.25);
    expect(tone.type).toBe('lowpass');
    expect(tone.frequency.value).toBe(1500);
    expect(feedback.gain.value).toBe(0.5);
    expect(wet.gain.value).toBe(0.6);
    // dry sound → speakers, and into the delay
    expect(dry.out).toContain(destination);
    expect(dry.out).toContain(delay);
    // delay → low-pass → feedback → back into the delay (the loop)
    expect(delay.out).toEqual([tone]);
    expect(tone.out).toContain(feedback);
    expect(feedback.out).toEqual([delay]);
    // low-pass → wet → speakers
    expect(tone.out).toContain(wet);
    expect(wet.out).toEqual([destination]);
  });

  it('reports the echo in the sample event', async () => {
    const seen: unknown[] = [];
    document.addEventListener('archivo115:sample', (e) => seen.push((e as CustomEvent).detail));
    await playSample('/sounds/c.mp3', { echo: ECHO });
    expect(seen.at(-1)).toMatchObject({ src: '/sounds/c.mp3', echo: ECHO });
  });

  it('tears the loop down once the last repeat has faded', async () => {
    await playSample('/sounds/d.mp3', { echo: ECHO });
    const loop = [...byKind('delay'), ...byKind('filter'), ...byKind('gain').slice(1)];
    vi.advanceTimersByTime((1.2 + echoTail(ECHO)) * 1000);
    expect(loop.some((n) => n.disconnected)).toBe(false);
    vi.advanceTimersByTime(300);
    expect(loop.every((n) => n.disconnected)).toBe(true);
  });

  it('stays silent with sound off', async () => {
    localStorage.setItem('archivo115:sound', 'off');
    await playSample('/sounds/e.mp3', { echo: ECHO });
    expect(nodes).toHaveLength(0);
  });
});

describe('echoTail', () => {
  it('counts the repeats until they drop below −60 dB', () => {
    // 0.6 · 0.5^n < 0.001 from n = 10 on: ten repeats a quarter second apart.
    expect(echoTail(ECHO)).toBe(2.5);
    expect(echoTail({ ...ECHO, feedback: 0.2 })).toBeLessThan(echoTail(ECHO));
    expect(echoTail({ ...ECHO, delay: 0.5 })).toBe(5);
  });

  it('a single slap-back when there is no feedback', () => {
    expect(echoTail({ ...ECHO, feedback: 0 })).toBe(ECHO.delay);
  });
});
