import { describe, expect, it } from 'vitest';
import { loadRevealed, saveRevealed, reveal, hide, prune, storageKey, type KeyValueStore } from '../../src/scripts/spoiler-store';

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => void (data[k] = v),
    removeItem: (k) => void delete data[k],
  };
}

const throwing: KeyValueStore = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
};

describe('spoiler store', () => {
  it('round-trips revealed ids per page', () => {
    const store = memoryStore();
    saveRevealed(store, 'map:bo3/the-giant', new Set(['b', 'a']));
    expect(store.data[storageKey('map:bo3/the-giant')]).toBe('["a","b"]');
    expect([...loadRevealed(store, 'map:bo3/the-giant')]).toEqual(['a', 'b']);
    expect(loadRevealed(store, 'map:bo3/der-eisendrache').size).toBe(0);
  });

  it('removes the key when nothing is revealed', () => {
    const store = memoryStore({ [storageKey('p')]: '["x"]' });
    saveRevealed(store, 'p', new Set());
    expect(storageKey('p') in store.data).toBe(false);
  });

  it('survives corrupt data, wrong types and blocked storage', () => {
    expect(loadRevealed(memoryStore({ [storageKey('p')]: '{not json' }), 'p').size).toBe(0);
    expect([...loadRevealed(memoryStore({ [storageKey('p')]: '["ok", 3, null]' }), 'p')]).toEqual(['ok']);
    expect(loadRevealed(memoryStore({ [storageKey('p')]: '{"a":1}' }), 'p').size).toBe(0);
    expect(loadRevealed(throwing, 'p').size).toBe(0);
    expect(() => saveRevealed(throwing, 'p', new Set(['a']))).not.toThrow();
    expect(loadRevealed(null, 'p').size).toBe(0);
  });

  it('reveal / hide / prune are immutable', () => {
    const start = new Set(['a']);
    const more = reveal(start, 'b');
    expect([...start]).toEqual(['a']);
    expect([...more]).toEqual(['a', 'b']);
    expect([...hide(more, 'a')]).toEqual(['b']);
    expect([...prune(more, ['b', 'c'])]).toEqual(['b']);
  });
});
