import { describe, expect, it } from 'vitest';
import { MUSIC, MUSIC_VOLUME, NARRATOR_DUCK, musicVolume, resumeAt } from '../../src/scripts/music';
import { ENTER_SPARK, SPARK } from '../../src/scripts/samples';
import { FIRST_FLICKER, FLICKER_EVERY, FLICKER_LENGTH, FLICKER_PATTERN, FLICKER_VOLUME, flickerScore } from '../../src/scripts/neon';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

describe('background music', () => {
  it('drops 10% while the narrator speaks', () => {
    expect(NARRATOR_DUCK).toBe(0.9);
    expect(musicVolume(false)).toBe(MUSIC_VOLUME);
    expect(musicVolume(true)).toBeCloseTo(MUSIC_VOLUME * 0.9);
    expect(musicVolume(true, 0.5)).toBe(0.45);
  });

  it('stays in the background', () => {
    expect(MUSIC_VOLUME).toBeGreaterThan(0);
    expect(MUSIC_VOLUME).toBeLessThanOrEqual(0.5);
  });

  it('resumes where the previous page left off, or from the start', () => {
    expect(resumeAt('123.5')).toBe(123.5);
    expect(resumeAt(null)).toBe(0);
    expect(resumeAt('nope')).toBe(0);
    expect(resumeAt('-4')).toBe(0);
    expect(resumeAt('900', 780)).toBe(0);
  });
});

describe('sound files', () => {
  it('exist in public/', () => {
    for (const file of [MUSIC, SPARK]) expect(existsSync(join('public', ...file.split('/'))), file).toBe(true);
  });

  it('the spark on "enter with sound" starts at 60% and swells to full very fast', () => {
    expect(ENTER_SPARK.from).toBe(0.6);
    expect(ENTER_SPARK.attack).toBeGreaterThan(0);
    expect(ENTER_SPARK.attack).toBeLessThanOrEqual(0.15);
  });
});

describe('neon flicker', () => {
  it('first within 30 s, then every 2 minutes, a slow flicker buzzing at 48%', () => {
    expect(FIRST_FLICKER).toBeLessThanOrEqual(30_000);
    expect(FLICKER_EVERY).toBe(120_000);
    expect(FLICKER_VOLUME).toBe(0.48);
    expect(FLICKER_LENGTH).toBe(2200);
    expect(FLICKER_LENGTH).toBeLessThan(FLICKER_EVERY);
  });

  it('the pattern starts and ends lit, in order, within the flicker', () => {
    expect(FLICKER_PATTERN[0]).toEqual([0, 1]);
    expect(FLICKER_PATTERN.at(-1)![1]).toBe(1);
    FLICKER_PATTERN.forEach(([offset, level], i) => {
      expect(offset).toBeGreaterThanOrEqual(0);
      expect(offset).toBeLessThan(1);
      expect(level).toBeGreaterThanOrEqual(0);
      expect(level).toBeLessThanOrEqual(1);
      if (i) expect(offset).toBeGreaterThan(FLICKER_PATTERN[i - 1][0]);
    });
  });

  it('the hum follows the light, quieter when the tube is dim', () => {
    const { hum } = flickerScore([[0, 1], [0.5, 0.5], [0.75, 0]], 2);
    expect(hum).toEqual([
      { at: 0, level: 1 },
      { at: 1, level: 0.25 },
      { at: 1.5, level: 0 },
    ]);
  });

  it('the starter strikes each time the light jumps back up', () => {
    const { strikes } = flickerScore([[0, 1], [0.25, 0.1], [0.5, 1], [0.75, 0.8]], 1);
    expect(strikes).toEqual([0.5]);
    // The real pattern: one strike per relight.
    expect(flickerScore().strikes.length).toBeGreaterThanOrEqual(3);
  });
});
