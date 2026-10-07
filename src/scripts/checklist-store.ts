// Remembers which quest steps a player has ticked, per checklist id. Pure
// logic over a Storage-like object (same rules as spoiler-store): never
// throws, so a blocked storage only means progress is not remembered.
import type { KeyValueStore } from './spoiler-store';

const PREFIX = 'archivo115:checklist:';

export const checklistKey = (id: string) => PREFIX + id;

export function loadDone(store: KeyValueStore | null, id: string): Set<string> {
  try {
    const raw = store?.getItem(checklistKey(id));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []);
  } catch {
    return new Set();
  }
}

export function saveDone(store: KeyValueStore | null, id: string, steps: Set<string>): void {
  try {
    if (steps.size === 0) store?.removeItem(checklistKey(id));
    else store?.setItem(checklistKey(id), JSON.stringify([...steps].sort(byStep)));
  } catch {
    /* storage unavailable */
  }
}

/** "quest:2" before "quest:10". */
export const byStep = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true });

export function setStep(steps: Set<string>, step: string, done: boolean): Set<string> {
  const next = new Set(steps);
  if (done) next.add(step);
  else next.delete(step);
  return next;
}

/** Ticked steps that still exist (a checklist may have been shortened), and the share done. */
export function progress(steps: Set<string>, existing: string[]): { done: number; total: number; ratio: number; complete: boolean } {
  const done = existing.filter((s) => steps.has(s)).length;
  const total = existing.length;
  return { done, total, ratio: total ? done / total : 0, complete: total > 0 && done === total };
}
