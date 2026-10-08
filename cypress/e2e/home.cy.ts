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

  it('focuses "enter without sound" for the keyboard, without a rectangular focus box', () => {
    cy.visitPage('/', { intro: true });
    cy.get('[data-intro-enter="off"]', { timeout: 10000 }).should('be.visible');
    // Enter still works: the default choice has focus…
    cy.focused().should('have.attr', 'data-intro-enter', 'off');
    // …but no rectangle is drawn around the chamfered button.
    cy.get('[data-intro-enter="off"]').should(($b) => {
      expect(getComputedStyle($b[0]).outlineStyle).to.eq('none');
    });
  });

  it('entering with sound sets off the spark (60% → full) and starts the looping music', () => {
    cy.visitPage('/', { intro: true });
    cy.document().then((doc) => {
      const played: { src: string; volume: number; from: number }[] = [];
      doc.addEventListener('archivo115:sample', (e) => played.push((e as CustomEvent).detail));
      cy.wrap(played).as('played');
    });
    cy.get('[data-intro-enter="on"]', { timeout: 10000 }).should('be.visible').click();
    cy.get('@played').should('have.length', 1).its(0).should('deep.include', { src: '/sounds/faespencer-high-voltage-spark-486895.mp3', volume: 1, from: 0.6 });
    cy.get('audio[data-music]')
      .should('have.prop', 'loop', true)
      .and('have.attr', 'src')
      .and('match', /\/sounds\/nuclear-winter\.mp3$/);
    cy.get('audio[data-music]').should('have.attr', 'data-volume', '0.3');
    // Sound off: the music fades to silence.
    cy.get('[data-sound-toggle]').click();
    cy.get('audio[data-music]').should('have.attr', 'data-volume', '0');
  });

  it('no music and no spark without sound', () => {
    cy.visitPage('/', { intro: true });
    cy.get('[data-intro-enter="off"]', { timeout: 10000 }).should('be.visible').click();
    cy.get('[data-intro]').should('not.exist');
    cy.get('audio[data-music]').should('not.exist');
  });

  it('with sound on from an earlier visit, the music still waits for "enter with sound"', () => {
    cy.visitPage('/', { intro: true, sound: true });
    cy.get('[data-intro-enter="on"]', { timeout: 10000 }).should('be.visible');
    cy.get('body').click('topLeft', { force: true });
    cy.get('audio[data-music]').should('not.exist');
    cy.get('[data-intro-enter="on"]').click();
    cy.get('audio[data-music]').should('have.attr', 'data-volume', '0.3');
  });

  it('"enter without sound" never lets the music start, even if sound was on before', () => {
    cy.visitPage('/', { intro: true, sound: true });
    cy.get('[data-intro-enter="off"]', { timeout: 10000 }).should('be.visible').click();
    cy.get('h1').click();
    cy.get('html').should('have.attr', 'data-sound', 'off');
    cy.get('audio[data-music]').should('not.exist');
  });

  it('the logo flickers like a neon tube within 30 seconds, then every 2 minutes', () => {
    cy.clock();
    cy.visitPage('/');
    cy.get('.site-header .logo').should('not.have.class', 'is-flickering');
    cy.tick(30_000);
    cy.get('.site-header .logo').should('have.class', 'is-flickering');
    // A slow flicker: still going after a second, over after 2.2 s.
    cy.tick(1_200);
    cy.get('.site-header .logo').should('have.class', 'is-flickering');
    cy.tick(1_100);
    cy.get('.site-header .logo').should('not.have.class', 'is-flickering');
    // Next one two minutes later.
    cy.tick(117_000);
    cy.get('.site-header .logo').should('not.have.class', 'is-flickering');
    cy.tick(1_000);
    cy.get('.site-header .logo').should('have.class', 'is-flickering');
  });

  it('with sound on, the flicker buzzes like a fluorescent tube at 48%', () => {
    cy.clock();
    cy.visitPage('/', { sound: true });
    cy.document().then((doc) => {
      const played: { src: string; volume: number }[] = [];
      doc.addEventListener('archivo115:sample', (e) => played.push((e as CustomEvent).detail));
      cy.wrap(played).as('played');
    });
    cy.tick(30_000);
    cy.get('@played').should('have.length', 1).its(0).should('deep.include', { src: 'neon-hum', volume: 0.48 });
  });

  it('the logo does not flicker with reduced motion', () => {
    cy.clock();
    cy.visitPage('/', { reducedMotion: true });
    cy.tick(30_000);
    cy.get('.site-header .logo').should('not.have.class', 'is-flickering');
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

  it('a short, plain intro and three actions: story, what is Zombies, pick a game', () => {
    cy.visitPage('/');
    cy.get('.hero-sub').should(
      'have.text',
      'Archivo hecho por fans, con guías claras, visuales y con spoilers opcionales para tener la mejor experiencia posible a la hora de jugar Call of Duty Zombies.',
    );
    cy.get('.hero-actions .btn').should('have.length', 3).then(($b) => {
      expect([...$b].map((b) => b.textContent!.trim())).to.deep.eq(['La historia completa', '¿Qué es Zombies?', 'Elegir juego']);
    });
    cy.get('.hero-actions .btn').first().should('have.class', 'btn--primary');
    cy.get('.hero-actions').should('not.contain.text', 'Ver guías');
    // The manual is no longer a section of the page.
    cy.get('section#manual').should('not.exist');
  });

  it('"¿Qué es Zombies?" opens the survival manual in a window', () => {
    cy.visitPage('/');
    cy.get('#manual').should('not.be.visible');
    cy.contains('.hero-actions button', '¿Qué es Zombies?').should('have.attr', 'aria-expanded', 'false').click();
    cy.get('dialog#manual').should('have.attr', 'open');
    cy.get('#manual').should('be.visible').within(() => {
      cy.contains('h2', 'Manual de supervivencia');
      cy.get('.card').should('have.length.at.least', 10);
      cy.contains('.card-title', 'Pack-a-Punch');
    });
    cy.contains('.hero-actions button', '¿Qué es Zombies?').should('have.attr', 'aria-expanded', 'true');
    // The close button, Escape and a click on the backdrop all close it.
    cy.get('[data-modal-close]').click();
    cy.get('#manual').should('not.be.visible');
    cy.focused().should('contain.text', '¿Qué es Zombies?');
    cy.contains('.hero-actions button', '¿Qué es Zombies?').click();
    cy.get('#manual').should('be.visible');
    cy.get('body').type('{esc}');
    cy.get('#manual').should('not.be.visible');
    cy.contains('.hero-actions button', '¿Qué es Zombies?').click();
    cy.get('#manual').should('be.visible');
    cy.get('#manual').then(($d) => $d[0].dispatchEvent(new MouseEvent('click', { bubbles: true })));
    cy.get('#manual').should('not.be.visible');
  });

  it('old links to /#manual open the window', () => {
    cy.visitPage('/#manual');
    cy.get('#manual').should('be.visible').and('contain.text', 'Manual de supervivencia');
  });

  describe('era tabs', () => {
    it('defaults to the newest game, Black Ops 4, with its Aether guide', () => {
      cy.visitPage('/');
      cy.get('[role="tab"]').should('have.length', 5);
      cy.get('[role="tab"][aria-selected="true"]').should('have.attr', 'data-tab', 'bo4');
      cy.get('#panel-bo4').should('be.visible').within(() => {
        cy.get('.map-card').should('have.length', 8);
        cy.get('.map-card:not(.is-stub)').should('have.length', 1).and('contain.text', 'Blood of the Dead');
        // Same order as the game: Voyage of Despair is the first map.
        cy.get('.map-card-title').first().should('have.text', 'Voyage of Despair');
      });
      cy.get('#panel-bo1').should('not.be.visible');
    });

    it('Black Ops III keeps its three guides', () => {
      cy.visitPage('/#bo3');
      cy.get('#panel-bo3').should('be.visible').within(() => {
        cy.get('.map-card').should('have.length', 6);
        cy.get('.map-card:not(.is-stub)').should('have.length', 3);
        cy.contains('.map-card-title', 'Shadows of Evil');
      });
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
      cy.focused().should('have.attr', 'data-tab', 'bo4');
    });

    it('starts the story with a World at War tab and the first guide of each older game', () => {
      cy.visitPage('/');
      cy.get('[role="tab"]').first().should('have.attr', 'data-tab', 'waw');
      cy.get('#tab-waw').click();
      cy.location('hash').should('eq', '#waw');
      cy.get('#panel-waw').should('be.visible').within(() => {
        cy.get('.map-card').should('have.length', 4);
        cy.get('.map-card:not(.is-stub)').should('have.length', 1).and('contain.text', 'Nacht der Untoten');
      });
      cy.get('#tab-bo1').click();
      cy.get('#panel-bo1 .map-card:not(.is-stub)').should('have.length', 1).and('contain.text', 'Kino der Toten');
      cy.get('#tab-bo2').click();
      cy.get('#panel-bo2 .map-card:not(.is-stub)').should('have.length', 1).and('contain.text', 'TranZit');
      cy.get('[data-games-toggle]').click();
      cy.get('[data-games-menu]').contains('a', 'World at War').click();
      cy.get('#tab-waw').should('have.attr', 'aria-selected', 'true');
    });

    it('every playable character in every game has a picture', () => {
      cy.visitPage('/');
      // Placeholders (.ph) are only a fallback: no crew card should need one.
      cy.get('.crew-card').should('have.length.at.least', 20);
      cy.get('.crew-card .ph').should('not.exist');
      cy.get('.crew-card img').each(($img) => expect($img.attr('alt'), 'alt text').to.not.be.empty);
      cy.get('#panel-bo2 .crew-card img').should('have.length', 4).first().should('have.attr', 'src').and('contain', '/characters/victis/');
    });

    it('each character card opens its Call of Duty Wiki article in a new tab', () => {
      cy.visitPage('/');
      cy.get('.crew-card').each(($card) => {
        expect($card.prop('tagName'), 'card is a link').to.eq('A');
        expect($card.attr('href')).to.match(/^https:\/\/callofduty\.fandom\.com\/wiki\//);
        expect($card.attr('target')).to.eq('_blank');
        expect($card.attr('rel')).to.contain('noopener');
      });
      cy.get('#tab-bo2').click();
      cy.get('#panel-bo2')
        .contains('a.crew-card', 'Russman')
        .should('have.attr', 'href', 'https://callofduty.fandom.com/wiki/Russman')
        // No visible "more on the wiki" line; screen readers still hear it.
        .and('not.contain.text', 'Call of Duty Wiki')
        .and('have.attr', 'aria-label', 'Russman: Más en la Call of Duty Wiki ↗');
    });

    it('over a character card the cursor widens and its centre dot turns red', () => {
      cy.visitPage('/#bo2', { mouse: true });
      cy.get('.card-cursor').should('not.be.visible');
      cy.get('#panel-bo2 a.crew-card').first().as('card');
      cy.get('@card').should(($c) => expect(getComputedStyle($c[0]).cursor).to.eq('none'));
      cy.get('@card').trigger('pointerover', { pointerType: 'mouse', clientX: 200, clientY: 300 });
      cy.get('.card-cursor').should('be.visible').and('have.class', 'is-hot');
      cy.get('.card-cursor-dot').should(($d) => expect(getComputedStyle($d[0]).fill).to.eq('rgb(255, 30, 45)'));
      cy.get('.card-cursor-ring').should(($r) => expect(getComputedStyle($r[0]).transform).to.not.eq('none'));
      cy.get('@card').trigger('pointerout', { pointerType: 'mouse', relatedTarget: null });
      cy.get('.card-cursor').should('not.be.visible').and('not.have.class', 'is-hot');
    });

    it('opens the tab from a deep link', () => {
      cy.visitPage('/#bo2');
      cy.get('#tab-bo2').should('have.attr', 'aria-selected', 'true');
      cy.get('#panel-bo2').should('be.visible');
    });

    it('the header has one "Juegos" chip whose menu switches eras', () => {
      cy.visitPage('/');
      // No chip per game any more: one menu for all of them.
      cy.get('.main-nav').should('not.contain.text', 'BO1');
      cy.get('[data-games-toggle]').should('have.attr', 'role', 'button').and('have.attr', 'aria-expanded', 'false').and('contain.text', 'Juegos');
      cy.get('[data-games-menu]').should('not.be.visible');
      cy.get('[data-games-toggle]').click();
      cy.get('[data-games-toggle]').should('have.attr', 'aria-expanded', 'true');
      cy.get('[data-games-menu] a').should('have.length', 5).first().should('contain.text', 'WaW');
      cy.get('[data-games-menu]').contains('a', 'Black Ops').click();
      cy.get('#tab-bo1').should('have.attr', 'aria-selected', 'true');
      cy.get('[data-games-menu]').should('not.be.visible');
      cy.get('[data-games-toggle]').should('have.attr', 'aria-expanded', 'false');
    });

    it('the Games menu closes with Escape and with a click outside, and works from the keyboard', () => {
      cy.visitPage('/');
      cy.get('[data-games-toggle]').click();
      cy.get('[data-games-menu]').should('be.visible');
      cy.get('body').type('{esc}');
      cy.get('[data-games-menu]').should('not.be.visible');
      cy.focused().should('have.attr', 'data-games-toggle');

      cy.get('[data-games-toggle]').click();
      cy.get('h1').click({ force: true });
      cy.get('[data-games-menu]').should('not.be.visible');

      // Keyboard: arrow down opens it and focuses the first game; arrows move.
      cy.get('[data-games-toggle]').focus().type('{downArrow}');
      cy.get('[data-games-menu]').should('be.visible');
      cy.focused().should('have.attr', 'data-game', 'waw').type('{downArrow}');
      cy.focused().should('have.attr', 'data-game', 'bo1').type('{upArrow}{upArrow}');
      cy.focused().should('have.attr', 'data-game', 'bo4');
    });

    it('on a map page the Games chip is the current one and the menu marks that game', () => {
      cy.visitPage('/bo2/tranzit/');
      cy.get('[data-games-toggle]').should('have.attr', 'aria-current', 'page');
      cy.get('[data-games-toggle]').click();
      cy.get('[data-games-menu] a[aria-current="true"]').should('have.attr', 'data-game', 'bo2');
      cy.get('[data-games-menu]').contains('a', 'Black Ops III').click();
      cy.location('pathname').should('eq', '/');
      cy.location('hash').should('eq', '#bo3');
      cy.get('#tab-bo3').should('have.attr', 'aria-selected', 'true');
    });

    it('buttons follow one hierarchy: orange main action, secondary, quiet ghost', () => {
      cy.visitPage('/');
      const fill = (el: Element) => getComputedStyle(el, '::after').backgroundImage;
      cy.get('.hero-actions .btn--primary').then(($p) => {
        cy.get('.hero-actions .btn:not(.btn--primary):not(.btn--ghost)').first().then(($s) => {
          cy.get('.hero-actions .btn--ghost').then(($g) => {
            // Three different looks, and the primary one is the site orange.
            const looks = new Set([fill($p[0]), fill($s[0]), fill($g[0])]);
            expect(looks.size).to.eq(3);
            expect(fill($p[0])).to.contain('rgb(255, 122, 24)');
          });
        });
      });
      // The page you are on is the one orange chip in the header.
      cy.get('.main-nav .chip[aria-current="page"]').should('have.length', 1).and('contain.text', 'Inicio');
    });

    it('map cards lead to their guide', () => {
      cy.visitPage('/#bo3');
      cy.get('#panel-bo3').contains('.map-card', 'The Giant').click();
      cy.location('pathname').should('match', /\/bo3\/the-giant\/?$/);
      cy.get('h1').should('contain.text', 'The Giant');
    });
  });
});
