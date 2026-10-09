// Pages change through the client router, without a reload: a fresh document
// would keep its audio locked until the next click, so the music and the
// sounds would stop on every page change.
type Win = Cypress.AUTWindow & { __sameDocument?: boolean };

const markDocument = () => cy.window().then((win) => ((win as Win).__sameDocument = true));
const stillSameDocument = () => cy.window().its('__sameDocument' as never).should('eq', true);

describe('Moving between pages', () => {
  it('keeps the same music playing, at full level, when going to another section', () => {
    cy.visitPage('/', { sound: true });
    markDocument();
    cy.get('audio[data-music]').should('have.attr', 'data-volume', '0.3').as('music');
    cy.get('audio[data-music]').should('have.prop', 'paused', false);

    cy.get('.site-header a.chip[href="/misiones/"]').click();
    cy.location('pathname').should('eq', '/misiones/');
    cy.get('.site-header a.chip[href="/misiones/"]').should('have.attr', 'aria-current', 'page');
    stillSameDocument();
    cy.get('@music').then(([before]) => {
      cy.get('audio[data-music]').should(([now]) => expect(now).to.equal(before));
    });
    cy.get('audio[data-music]').should('have.prop', 'paused', false).and('have.attr', 'data-volume', '0.3');
    cy.get('html').should('have.attr', 'data-sound', 'on');
    cy.get('[data-sound-toggle]').should('have.attr', 'aria-pressed', 'true');

    // The new page's controls work, once: sound off fades the same track out.
    cy.get('[data-sound-toggle]').click();
    cy.get('html').should('have.attr', 'data-sound', 'off');
    cy.get('audio[data-music]').should('have.attr', 'data-volume', '0');
  });

  it('keeps the music through a language switch and the browser back button', () => {
    cy.visitPage('/historia/', { sound: true });
    markDocument();
    cy.get('[data-lang-switch="en"]').click();
    cy.location('pathname').should('eq', '/en/story/');
    cy.get('html').should('have.attr', 'lang', 'en');
    cy.go('back');
    cy.location('pathname').should('eq', '/historia/');
    cy.get('html').should('have.attr', 'lang', 'es');
    stillSameDocument();
    cy.get('audio[data-music]').should('have.prop', 'paused', false).and('have.attr', 'data-volume', '0.3');
  });

  it('leaving a guide stops the narrator and lifts the music back up', () => {
    cy.visitPage('/bo3/the-giant/', { speech: true, sound: true });
    markDocument();
    cy.get('[data-n-ambient]').uncheck({ force: true });
    cy.get('.narrator-fab').click();
    cy.get('[data-n-play]').click();
    cy.get('audio[data-music]').should('have.attr', 'data-ducked', 'true');
    cy.speech().its('cancels').then((cancels) => {
      cy.get('.site-header a.chip[href="/creditos/"]').click();
      cy.location('pathname').should('eq', '/creditos/');
      stillSameDocument();
      cy.speech().its('cancels').should('be.greaterThan', cancels);
    });
    cy.get('[data-narrator]').should('not.exist');
    cy.get('audio[data-music]').should('have.attr', 'data-ducked', 'false').and('have.attr', 'data-volume', '0.3');
  });

  it('the Games menu on another page opens the chosen era tab on the home page', () => {
    cy.visitPage('/misiones/');
    markDocument();
    cy.get('[data-games-toggle]').click();
    cy.get('[data-games-menu]').contains('a', 'Black Ops').click();
    cy.location('pathname').should('eq', '/');
    cy.location('hash').should('eq', '#bo1');
    cy.get('#tab-bo1').should('have.attr', 'aria-selected', 'true');
    cy.get('#panel-bo1').should('be.visible');
    stillSameDocument();
  });

  it('wires each new page once: the games menu opens and closes normally after several page changes', () => {
    cy.visitPage('/');
    cy.get('.site-header a.chip[href="/historia/"]').click();
    cy.location('pathname').should('eq', '/historia/');
    cy.get('.site-header a.chip[href="/misiones/"]').click();
    cy.location('pathname').should('eq', '/misiones/');
    cy.get('[data-games-toggle]').click();
    cy.get('[data-games-menu]').should('be.visible');
    cy.get('[data-games-toggle]').should('have.attr', 'aria-expanded', 'true');
    cy.get('main').click('topLeft');
    cy.get('[data-games-menu]').should('not.be.visible');
  });
});
