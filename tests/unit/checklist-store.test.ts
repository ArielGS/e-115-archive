import { describe, expect, it } from 'vitest';
import { byStep, checklistKey, loadDone, progress, saveDone, setStep } from '../../src/scripts/checklist-store';
import type { KeyValueStore } from '../../src/scripts/spoiler-store';

function memory(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

describe('checklist store', () => {
  it('saves ticked steps per checklist, in step order, and reads them back', () => {
    const store = memory();
    saveDone(store, 'botd-escape', new Set(['botd-escape:10', 'botd-escape:2', 'botd-escape:1']));
    expect(store.data.get(checklistKey('botd-escape'))).toBe('["botd-escape:1","botd-escape:2","botd-escape:10"]');
    expect([...loadDone(store, 'botd-escape')]).toEqual(['botd-escape:1', 'botd-escape:2', 'botd-escape:10']);
    expect(loadDone(store, 'other').size).toBe(0);
  });

  it('removes the key when nothing is ticked', () => {
    const store = memory();
    saveDone(store, 'q', new Set(['q:1']));
    saveDone(store, 'q', new Set());
    expect(store.data.has(checklistKey('q'))).toBe(false);
  });

  it('never throws: broken data, blocked or missing storage', () => {
    const store = memory();
    store.data.set(checklistKey('q'), '{not json');
    expect(loadDone(store, 'q').size).toBe(0);
    store.data.set(checklistKey('q'), '[1, "q:2", null]');
    expect([...loadDone(store, 'q')]).toEqual(['q:2']);
    const blocked: KeyValueStore = {
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
    expect(() => saveDone(blocked, 'q', new Set(['q:1']))).not.toThrow();
    expect(loadDone(blocked, 'q').size).toBe(0);
    expect(loadDone(null, 'q').size).toBe(0);
  });

  it('ticks and unticks immutably', () => {
    const a = new Set(['q:1']);
    const b = setStep(a, 'q:2', true);
    expect([...b]).toEqual(['q:1', 'q:2']);
    expect([...a]).toEqual(['q:1']);
    expect([...setStep(b, 'q:1', false)]).toEqual(['q:2']);
  });

  it('counts progress only over steps that still exist', () => {
    expect(progress(new Set(['q:1', 'q:9']), ['q:1', 'q:2'])).toEqual({ done: 1, total: 2, ratio: 0.5, complete: false });
    expect(progress(new Set(['q:1', 'q:2']), ['q:1', 'q:2']).complete).toBe(true);
    expect(progress(new Set(), []).complete).toBe(false);
    expect(['q:10', 'q:2', 'q:1'].sort(byStep)).toEqual(['q:1', 'q:2', 'q:10']);
  });
});
