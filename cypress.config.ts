/// <reference types="cypress" />
// No runtime imports: the official cypress/included image (compose profile
// "test") loads this file without the project's node_modules.
const config: Cypress.ConfigOptions = {
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL ?? 'http://localhost:4321',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    viewportWidth: 1366,
    viewportHeight: 900,
    video: false,
    screenshotOnRunFailure: true,
    retries: { runMode: 1, openMode: 0 },
    setupNodeEvents(on) {
      on('task', { log: (m: string) => (console.log(m), null) });
    },
  },
};

export default config;
