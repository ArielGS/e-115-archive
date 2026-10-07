import { describe, expect, it } from 'vitest';
import { resolveTab } from '../../src/scripts/tabs';

describe('resolveTab', () => {
  const ids = ['bo1', 'bo2', 'bo3'];

  it('selects the tab named in the hash', () => {
    expect(resolveTab('#bo1', ids, 'bo3')).toBe('bo1');
    expect(resolveTab('#BO2', ids, 'bo3')).toBe('bo2');
  });

  it('accepts deeper anchors that start with a tab id', () => {
    expect(resolveTab('#bo2-maps', ids, 'bo3')).toBe('bo2');
  });

  it('falls back for empty or unknown hashes', () => {
    expect(resolveTab('', ids, 'bo3')).toBe('bo3');
    expect(resolveTab('#manual', ids, 'bo3')).toBe('bo3');
    expect(resolveTab('#bo4', ids, 'bo3')).toBe('bo3');
  });
});
