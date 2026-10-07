// Language detection (browser / saved choice) and the ES | EN switch.
const fakeBrowser = (langs: string[]) => {
  cy.browserLanguages(langs);
  cy.on('window:before:load', (win) => win.sessionStorage.setItem('archivo115:intro-seen', '1'));
};

describe('Language', () => {
  beforeEach(() => cy.clearLocalStorage());

  it('a Spanish browser gets the Spanish site', () => {
    fakeBrowser(['es-MX', 'es']);
    cy.visit('/');
    cy.location('pathname').should('eq', '/');
    cy.get('html').should('have.attr', 'lang', 'es');
    cy.contains('h2', 'Manual de supervivencia');
  });

  it('any other browser language gets the English site, on the same page', () => {
    fakeBrowser(['en-US', 'en']);
    cy.visit('/bo3/the-giant/');
    cy.location('pathname').should('eq', '/en/bo3/the-giant/');
    cy.get('html').should('have.attr', 'lang', 'en');
    cy.contains('h2', 'Before you start');

    cy.clearLocalStorage();
    fakeBrowser(['de-DE']);
    cy.visit('/creditos/');
    cy.location('pathname').should('eq', '/en/credits/');
  });

  it('the header switch changes language, keeps the page and remembers the choice', () => {
    fakeBrowser(['es-ES']);
    cy.visit('/bo3/der-eisendrache/');
    cy.get('[data-lang-switch="es"]').should('have.attr', 'aria-current', 'true');
    cy.get('[data-lang-switch="en"]').click();
    cy.location('pathname').should('eq', '/en/bo3/der-eisendrache/');
    cy.contains('h2', 'The bow and the dragons');
    cy.window().its('localStorage').invoke('getItem', 'archivo115:lang').should('eq', 'en');

    // The saved choice beats the Spanish browser on later visits.
    cy.visit('/');
    cy.location('pathname').should('eq', '/en/');
    cy.contains('h2', 'Survival manual');

    cy.get('[data-lang-switch="es"]').click();
    cy.location('pathname').should('eq', '/');
    cy.window().its('localStorage').invoke('getItem', 'archivo115:lang').should('eq', 'es');
  });

  it('keeps the section you were reading when switching', () => {
    cy.visitPage('/bo3/shadows-of-evil/#la-bestia');
    cy.get('[data-lang-switch="en"]').click();
    cy.location('pathname').should('eq', '/en/bo3/shadows-of-evil/');
    cy.location('hash').should('eq', '#the-beast');
  });

  it('special pages map to their translated slug', () => {
    cy.visitPage('/contribuir/');
    cy.get('[data-lang-switch="en"]').should('have.attr', 'href').and('match', /\/en\/contribute\/$/);
    cy.get('link[rel="alternate"][hreflang="en"]').should('have.attr', 'href').and('match', /\/en\/contribute\/$/);
  });

  it('spoiler progress is shared between languages', () => {
    cy.visitPage('/bo3/the-giant/');
    cy.get('#perros-del-infierno [data-spoiler-toggle]').click();
    cy.get('#perros-del-infierno [data-spoiler-accept]').click();
    cy.visitPage('/en/bo3/the-giant/', { lang: 'en' });
    cy.get('#perros-del-infierno').should('have.class', 'is-open').find('.dossier-name').should('have.text', 'Hellhounds');
    cy.get('#perros-del-infierno [data-spoiler-toggle]').should('contain.text', 'Hide');
  });

  it('the site is "Archivo 115" in Spanish and "Archive 115" in English, logo included', () => {
    cy.visitPage('/');
    cy.title().should('match', /^Archivo 115 — /);
    cy.get('.logo-text').should('have.text', 'ARCHIVO 115');
    cy.get('#home-title').should('have.text', 'ARCHIVO 115').and('have.attr', 'data-text', 'ARCHIVO 115');
    cy.get('.site-footer').should('contain.text', 'Archivo 115 //');

    cy.visitPage('/en/', { lang: 'en' });
    cy.title().should('match', /^Archive 115 — /);
    cy.get('.logo-text').should('have.text', 'ARCHIVE 115');
    cy.get('#home-title').should('have.text', 'ARCHIVE 115').and('have.attr', 'data-text', 'ARCHIVE 115');
    cy.get('.logo').should('have.attr', 'aria-label', 'Archive 115, home');
    cy.get('.site-footer').should('contain.text', 'Archive 115 //');

    cy.visitPage('/en/bo3/the-giant/', { lang: 'en' });
    cy.title().should('eq', 'The Giant · Archive 115');
  });

  it('the English page is fully in English (UI, directives and narrator)', () => {
    cy.visitPage('/en/bo3/shadows-of-evil/', { lang: 'en', speech: true });
    cy.contains('button', 'Listen to the guide');
    cy.get('#margwa .dossier-code').should('have.text', 'File 01');
    cy.get('#margwa [data-spoiler-toggle]').should('contain.text', 'Reveal').click();
    cy.get('#margwa .spoiler-confirm').should('contain.text', 'Open it?');
    cy.get('#margwa [data-spoiler-cancel]').should('have.text', 'Not yet').click();
    cy.get('[data-n-ambient]').uncheck({ force: true });
    cy.get('[data-n-follow]').uncheck({ force: true });
    cy.contains('button', 'Listen to the guide').click();
    cy.get('[data-n-status]').should('have.text', 'Transmitting…');
    cy.speech()
      .its('spoken', { timeout: 20000 })
      .should((spoken: string[]) => {
        expect(spoken[0]).to.contain('Archive 115 transmission');
        expect(spoken.join(' ')).to.contain('There is a locked file');
      });
  });
});
