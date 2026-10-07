// The fake engine finishes each line in 40 ms, but the narrator waits 120–350 ms
// between lines on purpose, so reaching a section deep in the guide takes
// several seconds: more than Cypress's 4 s default on slower machines.
const READ_AHEAD = { timeout: 20000 };

describe('Voice narrator', () => {
  beforeEach(() => {
    cy.visitPage('/bo3/the-giant/', { speech: true });
    // Keep the test quiet: no ambience, no auto-scrolling.
    cy.get('[data-narrator-open]').first().as('fab');
  });

  it('opens from the floating button and lists Spanish voices', () => {
    cy.get('.narrator-fab').click();
    cy.get('[data-narrator]').should('have.class', 'is-open').and('be.visible');
    cy.get('[data-n-voice] option').should('have.length', 1).first().should('contain.text', 'es-ES');
    cy.get('[data-n-status]').should('have.text', 'Listo para transmitir');
    cy.get('[data-n-close]').click();
    cy.get('[data-narrator]').should('not.have.class', 'is-open');
  });

  it('"Escuchar guía" starts reading with the intro and highlights the text', () => {
    cy.get('[data-n-ambient]').uncheck({ force: true });
    cy.get('[data-n-follow]').uncheck({ force: true });
    cy.contains('button', 'Escuchar guía').click();
    cy.get('[data-narrator]').should('have.class', 'is-playing');
    cy.speech().its('spoken.0').should('contain', 'Transmisión del Archivo');
    cy.speech().its('spoken').should('have.length.greaterThan', 3);
    cy.get('.tts-active').should('exist');
    cy.get('[data-n-play]').should('have.attr', 'aria-label', 'Pausar');
  });

  it('speaks narration-only lines, announces locked spoilers and never reads them', () => {
    cy.get('[data-n-ambient]').uncheck({ force: true });
    cy.get('[data-n-follow]').uncheck({ force: true });
    cy.get('.narrator-fab').click();
    cy.get('[data-n-rate]').select('1.3');
    cy.contains('button', 'Escuchar guía').click({ force: true });
    cy.speech()
      .its('spoken', READ_AHEAD)
      .should((spoken: string[]) => {
        const all = spoken.join(' ');
        expect(all).to.contain('Si vienes de Morg Síti, respira');
        expect(all).to.contain('expediente bloqueado');
      });
    cy.speech().then((log) => {
      const all = log.spoken.join(' ');
      expect(all).not.to.contain('Fluffy');
      expect(all).not.to.contain('le dispara a su versión antigua');
    });
  });

  it('pauses, resumes, skips and stops', () => {
    cy.get('[data-n-ambient]').uncheck({ force: true });
    cy.get('[data-n-follow]').uncheck({ force: true });
    cy.get('.narrator-fab').click();
    cy.get('[data-n-play]').click();
    cy.get('[data-n-count]').should('not.have.text', '00/00');
    cy.get('[data-n-play]').click();
    cy.get('[data-n-status]').should('have.text', 'En pausa');
    cy.get('[data-n-next]').click();
    cy.get('[data-n-next]').click();
    cy.get('[data-n-count]').invoke('text').then((before) => {
      cy.get('[data-n-prev]').click();
      cy.get('[data-n-count]').invoke('text').should('not.eq', before);
    });
    cy.get('[data-n-stop]').click();
    cy.get('[data-n-status]').should('have.text', 'Listo para transmitir');
    cy.get('.tts-active').should('not.exist');
  });

  it('reads a spoiler once it is revealed', () => {
    cy.get('[data-n-ambient]').uncheck({ force: true });
    cy.get('[data-n-follow]').uncheck({ force: true });
    cy.get('#que-pasa-en-la-intro [data-spoiler-toggle]').click();
    cy.get('#que-pasa-en-la-intro [data-spoiler-accept]').click();
    cy.contains('button', 'Escuchar guía').click();
    cy.speech()
      .its('spoken', READ_AHEAD)
      .should((spoken: string[]) => expect(spoken.join(' ')).to.contain('le dispara a su versión antigua'));
  });

  it('plays the recording effect under the voice, and remembers turning it off', () => {
    cy.get('[data-n-ambient]').uncheck({ force: true });
    cy.get('[data-n-follow]').uncheck({ force: true });
    cy.get('.narrator-fab').click();
    cy.get('[data-n-recording]').should('be.checked');
    cy.get('[data-narrator]').should('have.attr', 'data-recording', 'off');
    cy.get('[data-n-play]').click();
    cy.get('[data-narrator]').should('have.attr', 'data-recording', 'on');
    cy.get('[data-n-recording]').uncheck();
    cy.get('[data-narrator]').should('have.attr', 'data-recording', 'off');
    cy.get('[data-n-recording]').check();
    cy.get('[data-narrator]').should('have.attr', 'data-recording', 'on');
    cy.get('[data-n-stop]').click();
    cy.get('[data-narrator]').should('have.attr', 'data-recording', 'off');

    cy.get('[data-n-recording]').uncheck();
    cy.reload();
    cy.get('[data-n-recording]').should('not.be.checked');
  });

  it('suggests better voices when the browser only has robotic ones', () => {
    cy.get('.narrator-fab').click();
    cy.get('[data-n-voice-tip]').should('be.visible').and('contain.text', 'Edge');
  });

  it('picks a natural voice first and marks it in the list', () => {
    const voice = (name: string, lang: string) => ({ name, lang, voiceURI: name, localService: false, default: false });
    cy.visitPage('/bo3/the-giant/', {
      speech: true,
      voices: [
        voice('Microsoft Helena - Spanish (Spain)', 'es-ES'),
        voice('Microsoft Candela Online (Natural) - Spanish (Mexico)', 'es-MX'),
        voice('Microsoft Aria Online (Natural) - English (United States)', 'en-US'),
      ],
    });
    cy.get('.narrator-fab').click();
    cy.get('[data-n-voice]').find('option:selected').should('contain.text', 'Candela').and('contain.text', '· natural');
    cy.get('[data-n-voice] option').eq(1).should('contain.text', 'Helena').and('not.contain.text', 'natural');
    cy.get('[data-n-voice-tip]').should('not.be.visible');
  });

  describe('starting voice follows the page language', () => {
    const voice = (name: string, lang: string) => ({ name, lang, voiceURI: name, localService: false, default: false });
    const VOICES = [
      voice('Microsoft Denise Online (Natural) - French (France)', 'fr-FR'),
      voice('Microsoft Aria Online (Natural) - English (United States)', 'en-US'),
      voice('Microsoft Elvira Online (Natural) - Spanish (Spain)', 'es-ES'),
      voice('Microsoft Raul - Spanish (Mexico)', 'es-MX'),
    ];

    it('Spanish page: a Spanish voice, even with a French one saved before', () => {
      cy.visitPage('/bo3/the-giant/', { speech: true, voices: VOICES });
      // A French voice saved by an older version (one key for both languages).
      cy.window().then((w) => w.localStorage.setItem('archivo115:voice', VOICES[0].voiceURI));
      cy.visitPage('/bo3/the-giant/', { speech: true, voices: VOICES });
      cy.get('.narrator-fab').click();
      cy.get('[data-n-voice]').find('option:selected').should('contain.text', 'Elvira');
      cy.get('[data-n-voice] > option').should('have.length', 2).each((o) => expect(o.text()).to.match(/\(es-/));
      cy.get('[data-n-voice] optgroup').should('have.attr', 'label', 'Otros idiomas').find('option').should('have.length', 2);
    });

    it('English page: an English voice; each language remembers its own choice', () => {
      cy.visitPage('/bo3/the-giant/', { speech: true, voices: VOICES });
      cy.get('.narrator-fab').click();
      cy.get('[data-n-voice]').select('Microsoft Raul - Spanish (Mexico)');
      cy.visitPage('/en/bo3/the-giant/', { speech: true, voices: VOICES, lang: 'en' });
      cy.get('.narrator-fab').click();
      cy.get('[data-n-voice]').find('option:selected').should('contain.text', 'Aria');
      cy.visitPage('/bo3/the-giant/', { speech: true, voices: VOICES });
      cy.get('.narrator-fab').click();
      cy.get('[data-n-voice]').find('option:selected').should('contain.text', 'Raul');
    });
  });

  it('remembers the chosen speed', () => {
    cy.get('.narrator-fab').click();
    cy.get('[data-n-rate]').select('0.85');
    cy.reload();
    cy.get('[data-n-rate]').should('have.value', '0.85');
  });
});
