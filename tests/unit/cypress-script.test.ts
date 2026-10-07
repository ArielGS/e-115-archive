import { describe, expect, it } from 'vitest';
import { cypressEnv } from '../../scripts/cypress.mjs';

describe('cypressEnv', () => {
  it('drops ELECTRON_RUN_AS_NODE (set by VS Code terminals, breaks Cypress)', () => {
    expect(cypressEnv({ ELECTRON_RUN_AS_NODE: '1', PATH: '/bin', CYPRESS_BASE_URL: 'http://web' })).toEqual({
      PATH: '/bin',
      CYPRESS_BASE_URL: 'http://web',
    });
  });

  it('leaves a clean environment untouched and does not mutate the input', () => {
    const env = { PATH: '/bin' };
    const out = cypressEnv(env);
    expect(out).toEqual({ PATH: '/bin' });
    expect(out).not.toBe(env);
  });
});
