import { describe, expect, it } from 'vitest';
import { linkedTab, resolveTab } from '../../src/scripts/tabs';

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

describe('linkedTab', () => {
  const ids = ['waw', 'bo1', 'bo2'];
  const home = { origin: 'https://example.com', pathname: '/' };
  const link = (href: string) => {
    const u = new URL(href, 'https://example.com');
    return { origin: u.origin, pathname: u.pathname, hash: u.hash };
  };

  it('finds the tab a Games menu link opens on the same page', () => {
    expect(linkedTab(link('/#bo1'), home, ids)).toBe('bo1');
    expect(linkedTab(link('/#BO2'), home, ids)).toBe('bo2');
  });

  it('leaves links to other pages, other sites and other anchors to the router', () => {
    expect(linkedTab(link('/en/#bo1'), home, ids)).toBeNull();
    expect(linkedTab(link('https://other.example/#bo1'), home, ids)).toBeNull();
    expect(linkedTab(link('/#manual'), home, ids)).toBeNull();
    expect(linkedTab(link('/'), home, ids)).toBeNull();
  });
});
