// The secret-quest checklists: locked per map, tickable, saved per browser and
// shared between languages.
const open = (spoilerId: string) => {
  cy.get(`#${spoilerId} [data-spoiler-toggle]`).click();
  cy.get(`#${spoilerId} [data-spoiler-accept]`).click();
  cy.get(`#${spoilerId}`).should('have.class', 'is-open');
};

describe('Secret quest checklists', () => {
  it('are reachable from the header, one locked quest per map with a guide', () => {
    cy.visitPage('/');
    cy.get('.main-nav').contains('a', 'Misiones').click();
    cy.location('pathname').should('match', /\/misiones\/$/);
    cy.get('h1').should('contain.text', 'Misiones secretas');
    ['Nacht der Untoten', 'Kino der Toten', 'TranZit', 'Shadows of Evil', 'The Giant', 'Der Eisendrache', 'Blood of the Dead'].forEach((map) =>
      cy.get('[data-toc]').contains('a', map),
    );
    cy.get('[data-checklist]').should('have.length.at.least', 7).each(($c) => cy.wrap($c).should('not.be.visible'));
    cy.get('[data-fact]').first().invoke('text').then((n) => expect(Number(n)).to.be.at.least(7));
  });

  it('ticks steps, counts progress and remembers them after a reload', () => {
    cy.visitPage('/misiones/');
    open('la-trampa-para-moscas');
    cy.get('#checklist-giant-prologue').as('list');
    cy.get('@list').find('[data-checklist-count]').should('have.text', '0/6');
    cy.get('@list').find('input[data-check="giant-prologue:1"]').check();
    cy.get('@list').find('input[data-check="giant-prologue:2"]').check();
    cy.get('@list').find('[data-checklist-count]').should('have.text', '2/6');
    cy.get('@list').find('li.is-done').should('have.length', 2);
    cy.get('@list').find('input[data-check="giant-prologue:1"]').should('have.attr', 'aria-label').and('match', /^Paso 1: /);

    cy.reload();
    cy.get('#checklist-giant-prologue [data-checklist-count]').should('have.text', '2/6');
    cy.get('#checklist-giant-prologue input[data-check="giant-prologue:2"]').should('be.checked');
    cy.get('#checklist-giant-prologue input[data-check="giant-prologue:2"]').uncheck();
    cy.get('#checklist-giant-prologue [data-checklist-count]').should('have.text', '1/6');
  });

  it('marks a finished quest as complete, and Reset clears only that list', () => {
    cy.visitPage('/misiones/');
    open('la-trampa-para-moscas');
    open('las-peliculas-de-maxis');
    cy.get('#checklist-kino-reels input[data-check]').first().check();
    cy.get('#checklist-giant-prologue input[data-check]').each(($b) => cy.wrap($b).check());
    cy.get('#checklist-giant-prologue').should('have.class', 'is-complete');
    cy.get('#checklist-giant-prologue [data-checklist-reset]').click();
    cy.get('#checklist-giant-prologue [data-checklist-count]').should('have.text', '0/6');
    cy.get('#checklist-giant-prologue').should('not.have.class', 'is-complete');
    cy.get('#checklist-kino-reels [data-checklist-count]').should('have.text', '1/7');
  });

  it('shares progress between Spanish and English', () => {
    cy.visitPage('/misiones/');
    open('most-escape-alive');
    cy.get('#checklist-botd-escape input[data-check="botd-escape:3"]').check();
    cy.visitPage('/en/quests/', { lang: 'en' });
    cy.get('h1').should('contain.text', 'Secret quests');
    // The spoiler and the ticked step both carry over.
    cy.get('#most-escape-alive').should('have.class', 'is-open');
    cy.get('#checklist-botd-escape input[data-check="botd-escape:3"]').should('be.checked');
    cy.get('#checklist-botd-escape [data-checklist-reset]').should('have.text', 'Reset');
  });

  it('fits a phone screen and keeps the checkboxes tappable', () => {
    cy.viewport(375, 667);
    cy.visitPage('/misiones/');
    open('most-escape-alive');
    cy.document().then((doc) => expect(doc.documentElement.scrollWidth).to.be.at.most(375));
    cy.get('#checklist-botd-escape input[data-check]').first().scrollIntoView().should(($b) => {
      expect($b[0].getBoundingClientRect().width, 'tap target').to.be.at.least(24);
    });
  });
});
