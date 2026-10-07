// Not part of CI: captures screenshots for visual review.
// npx cypress run --config specPattern=cypress/visual/**/*.cy.ts
const shots: [string, string, (() => void)?][] = [
  ['/', 'home'],
  ['/#bo1', 'home-bo1'],
  ['/bo3/shadows-of-evil/', 'soe'],
  ['/bo3/the-giant/', 'giant'],
  ['/bo3/der-eisendrache/', 'de'],
  ['/bo2/origins/', 'stub'],
  ['/#waw', 'home-waw'],
  ['/#bo2', 'home-bo2'],
  ['/historia/', 'story'],
  ['/waw/nacht-der-untoten/', 'nacht'],
  ['/bo1/kino-der-toten/', 'kino'],
  ['/bo2/tranzit/', 'tranzit'],
];

const settle = () =>
  cy.document().then((doc) => {
    const st = doc.createElement('style');
    st.textContent = 'html{scroll-behavior:auto!important}.will-reveal{opacity:1!important;transform:none!important}.crt,.vignette{display:none}';
    doc.head.append(st);
  });

describe('screens', () => {
  beforeEach(() => cy.viewport(1280, 800));
  it('intro', () => {
    cy.visit('/');
    cy.wait(1200);
    cy.screenshot('intro', { capture: 'viewport', overwrite: true });
  });
  shots.forEach(([path, name]) => {
    it(name, () => {
      cy.visitPage(path);
      settle();
      cy.wait(900);
      cy.screenshot(`${name}-top`, { capture: 'viewport', overwrite: true });
      cy.screenshot(`${name}-full`, { capture: 'fullPage', overwrite: true });
    });
  });
  it('spoiler states', () => {
    cy.visitPage('/bo3/shadows-of-evil/');
    cy.get('#margwa').scrollIntoView({ offset: { top: -150, left: 0 } });
    cy.get('#margwa [data-spoiler-toggle]').click();
    cy.wait(400);
    cy.screenshot('spoiler-confirm', { capture: 'viewport', overwrite: true });
    cy.get('#margwa [data-spoiler-accept]').click();
    cy.wait(1000);
    cy.screenshot('spoiler-open', { capture: 'viewport', overwrite: true });
    cy.get('.narrator-fab').click();
    cy.wait(600);
    cy.screenshot('narrator', { capture: 'viewport', overwrite: true });
    cy.get('[data-n-min]').click();
    cy.wait(400);
    cy.screenshot('narrator-minimised', { capture: 'viewport', overwrite: true });
  });
  it('character portraits', () => {
    cy.visitPage('/#bo2');
    settle();
    cy.get('#panel-bo2 .crew').scrollIntoView().wait(600).screenshot('crew-bo2', { overwrite: true });
    cy.visitPage('/#bo3');
    settle();
    cy.get('#panel-bo3 .crew').scrollIntoView().wait(600).screenshot('crew-bo3', { overwrite: true });
    cy.visitPage('/bo1/kino-der-toten/');
    settle();
    cy.get('.prose .card-grid').first().scrollIntoView().wait(800).screenshot('guide-portraits-kino', { overwrite: true });
  });
  it('mobile', () => {
    cy.viewport(390, 844);
    cy.visitPage('/');
    cy.wait(800);
    cy.screenshot('mobile-home', { capture: 'fullPage', overwrite: true });
    cy.visitPage('/bo3/the-giant/');
    cy.wait(800);
    cy.screenshot('mobile-giant', { capture: 'viewport', overwrite: true });
    cy.visitPage('/historia/', { speech: true });
    cy.get('.narrator-fab').click();
    cy.get('[data-n-min]').click();
    cy.wait(600);
    cy.screenshot('mobile-story-narrator-minimised', { capture: 'viewport', overwrite: true });
  });
});
