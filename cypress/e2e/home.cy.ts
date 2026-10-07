describe('Home page', () => {
  it('plays the Flash intro once per session and lets you enter without sound', () => {
    cy.visitPage('/', { intro: true });
    cy.get('[data-intro]').should('be.visible');
    cy.contains('CARGANDO ARCHIVO').should('be.visible');
    cy.get('[data-intro-enter="off"]', { timeout: 10000 }).should('be.visible').click();
    cy.get('[data-intro]').should('not.exist');
    cy.get('html').should('have.attr', 'data-sound', 'off');
    cy.get('h1').should('contain.text', 'ARCHIVO');
    // Same session: no intro on reload.
    cy.reload();
    cy.get('[data-intro]').should('not.exist');
  });

  it('can skip the intro and enter with sound', () => {
    cy.visitPage('/', { intro: true });
    cy.get('[data-intro-skip]').click();
    cy.get('[data-intro]').should('not.exist');

    cy.window().then((win) => win.sessionStorage.clear());
    cy.visitPage('/', { intro: true });
    cy.get('[data-intro-enter="on"]', { timeout: 10000 }).should('be.visible').click();
    cy.get('html').should('have.attr', 'data-sound', 'on');
    cy.get('[data-sound-toggle]').should('have.attr', 'aria-pressed', 'true').click();
    cy.get('html').should('have.attr', 'data-sound', 'off');
  });

  it('skips the intro entirely with reduced motion', () => {
    cy.visitPage('/', { intro: true, reducedMotion: true });
    cy.get('[data-intro]').should('not.exist');
    cy.get('h1').should('be.visible');
  });

  it('shows the survival manual', () => {
    cy.visitPage('/');
    cy.get('#manual').within(() => {
      cy.contains('h2', 'Manual de supervivencia');
      cy.get('.card').should('have.length.at.least', 10);
      cy.contains('.card-title', 'Pack-a-Punch');
    });
  });

  describe('era tabs', () => {
    it('defaults to Black Ops III with its three guides', () => {
      cy.visitPage('/');
      cy.get('[role="tab"][aria-selected="true"]').should('have.attr', 'data-tab', 'bo3');
      cy.get('#panel-bo3').should('be.visible').within(() => {
        cy.get('.map-card').should('have.length', 6);
        cy.get('.map-card:not(.is-stub)').should('have.length', 3);
        cy.contains('.map-card-title', 'Shadows of Evil');
      });
      cy.get('#panel-bo1').should('not.be.visible');
    });

    it('switches with clicks and the keyboard, updating the URL', () => {
      cy.visitPage('/');
      cy.get('#tab-bo1').click();
      cy.location('hash').should('eq', '#bo1');
      cy.get('#panel-bo1').should('be.visible').and('contain.text', 'Ultimis');
      cy.get('#panel-bo3').should('not.be.visible');
      cy.get('#tab-bo1').type('{rightArrow}');
      cy.focused().should('have.attr', 'data-tab', 'bo2');
      cy.get('#panel-bo2').should('be.visible').and('contain.text', 'Victis');
      cy.focused().type('{end}');
      cy.focused().should('have.attr', 'data-tab', 'bo3');
    });

    it('opens the tab from a deep link', () => {
      cy.visitPage('/#bo2');
      cy.get('#tab-bo2').should('have.attr', 'aria-selected', 'true');
      cy.get('#panel-bo2').should('be.visible');
    });

    it('header links switch eras', () => {
      cy.visitPage('/');
      cy.get('.main-nav').contains('a', 'BO1').click();
      cy.get('#tab-bo1').should('have.attr', 'aria-selected', 'true');
    });

    it('map cards lead to their guide', () => {
      cy.visitPage('/');
      cy.get('#panel-bo3').contains('.map-card', 'The Giant').click();
      cy.location('pathname').should('match', /\/bo3\/the-giant\/?$/);
      cy.get('h1').should('contain.text', 'The Giant');
    });
  });
});
