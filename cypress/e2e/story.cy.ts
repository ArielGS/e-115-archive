// The "full story" page: the Aether Saga in order, with locked twists and
// the voice narrator built in.
const READ_AHEAD = { timeout: 20000 };

describe('Story page', () => {
  it('is reachable from the header and the home page', () => {
    cy.visitPage('/');
    cy.get('.hero-actions').contains('a', 'La historia completa').should('have.attr', 'href').and('match', /\/historia\/$/);
    cy.get('.main-nav').contains('a', 'Historia').click();
    cy.location('pathname').should('match', /\/historia\/$/);
    cy.get('h1').should('contain.text', 'La historia completa');
    cy.get('.main-nav a[aria-current="page"]').should('contain.text', 'Historia');
  });

  it('walks through every game with its twists locked', () => {
    cy.visitPage('/historia/');
    cy.get('[data-toc] a').should('have.length.at.least', 8);
    ['World at War', 'Black Ops II', 'Black Ops III', 'Black Ops 4', 'Richtofen'].forEach((chapter) => cy.get('[data-toc]').contains('a', chapter));
    cy.get('[data-spoiler]').should('have.length.at.least', 10).each(($b) => {
      cy.wrap($b).should('not.have.class', 'is-open');
      cy.wrap($b).find('.spoiler-body').should('not.be.visible');
    });
    // Richtofen's files keep his identity out of the visible header.
    cy.get('#richtofen-de-los-ultimis .dossier-head').should('contain.text', 'Expediente R-1').and('not.contain.text', 'Ultimis');
    cy.get('.narration').each(($n) => cy.wrap($n).should('not.be.visible'));
  });

  it('remembers revealed twists on its own page and carries them to English', () => {
    cy.visitPage('/historia/');
    cy.get('#el-final-de-moon [data-spoiler-toggle]').click();
    cy.get('#el-final-de-moon [data-spoiler-accept]').click();
    cy.get('#el-final-de-moon .spoiler-body').should('be.visible').and('contain.text', 'tres cohetes');
    cy.get('[data-spoiler-count]').first().invoke('text').should('match', /^1\/\d+$/);
    cy.visitPage('/en/story/', { lang: 'en' });
    cy.get('#el-final-de-moon').should('have.class', 'is-open').find('.spoiler-body').should('contain.text', 'three rockets');
    // Map guides keep their own progress.
    cy.visitPage('/bo1/kino-der-toten/');
    cy.get('[data-spoiler].is-open').should('have.length', 0);
  });

  it('the narrator reads the intro and narration lines, skips locked twists, and can be minimised while it reads', () => {
    cy.visitPage('/historia/', { speech: true });
    cy.get('[data-n-ambient]').uncheck({ force: true });
    cy.get('[data-n-follow]').uncheck({ force: true });
    cy.get('.narrator-fab').click();
    cy.get('[data-n-rate]').select('1.3');
    cy.contains('button', 'Escuchar la historia').click({ force: true });
    cy.get('[data-n-min]').click();
    cy.get('[data-narrator]').should('have.class', 'is-min').and('have.class', 'is-playing');
    cy.speech()
      .its('spoken', READ_AHEAD)
      .should((spoken: string[]) => {
        const all = spoken.join(' ');
        expect(all).to.contain('Expediente maestro');
        expect(all).to.contain('Primer juego');
        expect(all).to.contain('expediente bloqueado');
      });
    cy.speech().then((log) => {
      const all = log.spoken.join(' ');
      expect(all).not.to.contain('tres cohetes');
      expect(all).not.to.contain('Vasija Vril');
    });
  });

  it('switches language and keeps the page', () => {
    cy.visitPage('/historia/');
    cy.get('[data-lang-switch="en"]').click();
    cy.location('pathname').should('match', /\/en\/story\/$/);
    cy.get('h1').should('contain.text', 'The full story');
    cy.contains('button', 'Listen to the story');
  });
});
