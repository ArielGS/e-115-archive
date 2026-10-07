import { describe, expect, it } from 'vitest';
import { crackle } from '../../src/scripts/recording';

/** Deterministic pseudo-random numbers (mulberry32). */
function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('crackle', () => {
  const rate = 48000;

  it('is mostly silence with sparse clicks, about perSecond of them', () => {
    const out = crackle(rate * 10, rate, 9, seeded(1));
    let clicks = 0;
    for (let i = 0; i < out.length; i++) if (out[i] !== 0 && (i === 0 || out[i - 1] === 0)) clicks++;
    expect(clicks).toBeGreaterThan(50);
    expect(clicks).toBeLessThan(130);
    const nonZero = out.filter((x) => x !== 0).length;
    expect(nonZero / out.length).toBeLessThan(0.001);
  });

  it('keeps every sample within [-1, 1] and uses both signs', () => {
    const out = crackle(rate * 5, rate, 30, seeded(7));
    expect(out.every((x) => x >= -1 && x <= 1)).toBe(true);
    expect(out.some((x) => x > 0) && out.some((x) => x < 0)).toBe(true);
  });

  it('is silent when no clicks are asked for', () => {
    expect(crackle(rate, rate, 0, seeded(3)).every((x) => x === 0)).toBe(true);
  });
});
