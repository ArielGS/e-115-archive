// Runs the Cypress CLI with a clean environment, on any OS and from any shell.
// VS Code (and other Electron-based editors) export ELECTRON_RUN_AS_NODE to
// their integrated terminals, which makes Cypress's Electron start as plain
// Node and fail. `env -u` only exists in POSIX shells, so we drop it here.
//
//   node scripts/cypress.mjs run   |   node scripts/cypress.mjs open
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * @param {Record<string, string | undefined>} env usually process.env
 * @returns {Record<string, string | undefined>} a copy safe to pass to Cypress
 */
export function cypressEnv(env) {
  const { ELECTRON_RUN_AS_NODE: _ignored, ...rest } = env;
  return rest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // "cypress/bin/cypress" is not in the package's exports; go through package.json.
  const pkg = createRequire(import.meta.url).resolve('cypress/package.json');
  const bin = join(dirname(pkg), 'bin', 'cypress');
  const child = spawn(process.execPath, [bin, ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: cypressEnv(process.env),
  });
  child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 1)));
}
