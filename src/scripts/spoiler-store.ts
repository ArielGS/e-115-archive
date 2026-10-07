// Remembers which spoilers a player has revealed on each page, so the guide
// "unlocks" as they progress through the map. Pure logic over a Storage-like
// object; never throws (private windows can block storage entirely).

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const PREFIX = 'archivo115:spoilers:';

export const storageKey = (page: string) => PREFIX + page;

export function loadRevealed(store: KeyValueStore | null, page: string): Set<string> {
  try {
    const raw = store?.getItem(storageKey(page));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []);
  } catch {
    return new Set();
  }
}

export function saveRevealed(store: KeyValueStore | null, page: string, ids: Set<string>): void {
  try {
    if (ids.size === 0) store?.removeItem(storageKey(page));
    else store?.setItem(storageKey(page), JSON.stringify([...ids].sort()));
  } catch {
    /* storage unavailable: progress just isn't remembered */
  }
}

export function reveal(ids: Set<string>, id: string): Set<string> {
  return new Set(ids).add(id);
}

export function hide(ids: Set<string>, id: string): Set<string> {
  const next = new Set(ids);
  next.delete(id);
  return next;
}

/** Only keep ids that still exist on the page (content may have changed). */
export function prune(ids: Set<string>, existing: Iterable<string>): Set<string> {
  const valid = new Set(existing);
  return new Set([...ids].filter((id) => valid.has(id)));
}

export function safeStorage(): KeyValueStore | null {
  try {
    const store = window.localStorage;
    const probe = '__archivo115__';
    store.setItem(probe, '1');
    store.removeItem(probe);
    return store;
  } catch {
    return null;
  }
}
