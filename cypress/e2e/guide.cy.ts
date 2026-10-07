const GUIDES = [
  { path: '/bo3/shadows-of-evil/', title: 'Shadows of Evil' },
  { path: '/bo3/the-giant/', title: 'The Giant' },
  { path: '/bo3/der-eisendrache/', title: 'Der Eisendrache' },
];

describe('Map guides', () => {
  GUIDES.forEach(({ path, title }) => {
    it(`${title}: hero, facts, table of contents and locked spoilers`, () => {
      cy.visitPage(path);
      cy.get('h1').should('contain.text', title);
      cy.get('.facts dt').should('have.length.at.least', 4);
      cy.get('[data-toc] a').should('have.length.at.least', 6);
      cy.get('[data-spoiler]').should('have.length.at.least', 4);
      cy.get('[data-spoiler]').each(($b) => {
        cy.wrap($b).should('not.have.class', 'is-open');
        cy.wrap($b).find('.spoiler-body').should('not.be.visible');
      });
      cy.get('[data-spoiler-count]').first().invoke('text').should('match', /^0\/\d+$/);
    });
  });

  it('table of contents jumps to sections', () => {
    cy.visitPage('/bo3/shadows-of-evil/');
    cy.get('[data-toc] a').contains('La Bestia').click();
    cy.location('hash').should('eq', '#la-bestia');
    cy.get('#la-bestia').should('be.visible');
  });

  it('a spoiler asks for confirmation, can be cancelled, then revealed', () => {
    cy.visitPage('/bo3/shadows-of-evil/');
    cy.get('#margwa').as('file');
    cy.get('@file').find('.dossier-head').should('not.contain.text', 'Margwa').and('contain.text', 'Expediente 01');
    cy.get('@file').find('[data-spoiler-toggle]').click();
    cy.get('@file').find('.spoiler-confirm').should('be.visible').and('contain.text', '¿Lo abres?');
    cy.get('@file').find('[data-spoiler-cancel]').click();
    cy.get('@file').find('.spoiler-confirm').should('not.be.visible');
    cy.get('@file').find('.spoiler-body').should('not.be.visible');

    cy.get('@file').find('[data-spoiler-toggle]').click();
    cy.get('@file').find('[data-spoiler-accept]').click();
    cy.get('@file').should('have.class', 'is-open');
    cy.get('@file').find('.dossier-name').should('be.visible').and('have.text', 'Margwa');
    cy.get('@file').find('.dossier-photo img').should('be.visible');
    cy.get('@file').find('[data-spoiler-toggle]').should('have.attr', 'aria-expanded', 'true').and('contain.text', 'Ocultar');
    cy.get('[data-spoiler-count]').first().invoke('text').should('match', /^1\/\d+$/);
  });

  it('remembers revealed spoilers per page and can hide them all again', () => {
    cy.visitPage('/bo3/the-giant/');
    cy.get('[data-spoiler]').first().as('first');
    cy.get('@first').find('[data-spoiler-toggle]').click();
    cy.get('@first').find('[data-spoiler-accept]').click();
    cy.get('@first').should('have.class', 'is-open');

    cy.reload();
    cy.get('[data-spoiler]').first().should('have.class', 'is-open');
    // Other guides keep their own progress.
    cy.visitPage('/bo3/der-eisendrache/');
    cy.get('[data-spoiler].is-open').should('have.length', 0);

    cy.visitPage('/bo3/the-giant/');
    cy.get('[data-spoiler-reset]').click();
    cy.get('[data-spoiler].is-open').should('have.length', 0);
    cy.reload();
    cy.get('[data-spoiler].is-open').should('have.length', 0);
  });

  it('hides a revealed spoiler again with the eye', () => {
    cy.visitPage('/bo3/der-eisendrache/');
    cy.get('#que-es-el-paquete').as('s');
    cy.get('@s').find('[data-spoiler-toggle]').click();
    cy.get('@s').find('[data-spoiler-accept]').click();
    cy.get('@s').find('.spoiler-body').should('be.visible');
    cy.get('@s').find('[data-spoiler-toggle]').click();
    cy.get('@s').should('not.have.class', 'is-open');
    cy.get('@s').find('.spoiler-body').should('not.be.visible');
  });

  it('narration-only text is never shown on screen', () => {
    cy.visitPage('/bo3/shadows-of-evil/');
    cy.get('.narration').should('have.length.at.least', 1).each(($n) => cy.wrap($n).should('not.be.visible'));
  });

  it('links to the previous and next map of the same game', () => {
    cy.visitPage('/bo3/the-giant/');
    cy.get('.map-nav').within(() => {
      cy.contains('a', 'Shadows of Evil');
      cy.contains('a', 'Der Eisendrache').click();
    });
    cy.location('pathname').should('match', /der-eisendrache\/?$/);
  });

  it('pending maps invite people to contribute', () => {
    cy.visitPage('/bo2/origins/');
    cy.get('h1').should('contain.text', 'Origins');
    cy.contains('Expediente pendiente');
    cy.get('[data-narrator]').should('not.exist');
    cy.contains('a', 'Cómo escribir esta guía').click();
    cy.location('pathname').should('match', /contribuir\/?$/);
    cy.contains('h1', 'Cómo contribuir');
  });
});
