(() => {
  'use strict';

  const examples = {
    commercial: {
      title: 'Commercial restroom',
      source: 'Source: supplied starting-space photo; edited design concept.',
      before: {
        src: 'assets/bathroom-step-1-original.png', width: 1254, height: 1254,
        alt: 'Supplied starting-space photo of a commercial restroom sink with exposed plumbing and paper goods and cleaning supplies stored on the floor',
        state: 'Before · Supplied starting space',
        caption: 'Supplies share the floor beneath the sink, around exposed plumbing.'
      },
      after: {
        src: 'assets/bathroom-step-4-cabinet-only.png', width: 1254, height: 1254,
        alt: 'Edited design concept for the supplied restroom: a white cabinet with shelves and divided pull-out trays organizing supplies around a central pipe',
        state: 'After · Edited design concept',
        caption: 'Proposed cabinet, shelves, and pull-out storage around the plumbing.'
      }
    },
    residential: {
      title: 'Residential bathroom',
      source: 'Source: generated before-and-after illustrations.',
      before: {
        src: 'assets/under-sink-before.jpg', width: 1448, height: 1086,
        alt: 'Illustrative starting layout inside an oak sink cabinet: towels, bottles, and baskets share the cabinet floor with unused space above them',
        state: 'Before · Illustrative design concept',
        caption: 'Everyday essentials share one surface while the space above goes unused.'
      },
      after: {
        src: 'assets/under-sink-concept.jpg', width: 1448, height: 1086,
        alt: 'Illustrative after concept: cream shelves inside an oak sink cabinet separate towels, bottles, and baskets around a central pipe surround',
        state: 'After · Illustrative design concept',
        caption: 'Proposed side shelves use the empty height inside the cabinet.'
      }
    }
  };

  const caseViews = { commercial: 'after', residential: 'after' };
  const cards = [...document.querySelectorAll('[data-case]')];
  const viewer = document.getElementById('case-viewer');
  let openCase = null;
  let viewerTrigger = null;

  function updateImage(image, data) {
    image.src = data.src;
    image.alt = data.alt;
    image.width = data.width;
    image.height = data.height;
  }

  function updatePressed(buttons, value, key) {
    buttons.forEach(button => {
      const selected = button.dataset[key] === value;
      button.setAttribute('aria-pressed', String(selected));
      button.classList.toggle('active', selected);
    });
  }

  function renderViewer() {
    if (!openCase) return;
    const example = examples[openCase];
    const view = caseViews[openCase];
    const data = example[view];
    document.getElementById('viewer-title').textContent = example.title;
    updateImage(document.getElementById('viewer-image'), data);
    document.getElementById('viewer-state').textContent = data.state;
    document.getElementById('viewer-caption').textContent = data.caption;
    document.getElementById('viewer-source').textContent = example.source;
    updatePressed(viewer.querySelectorAll('[data-viewer-view]'), view, 'viewerView');
  }

  function setCaseView(caseId, view) {
    if (!examples[caseId] || !['before', 'after'].includes(view)) return;
    caseViews[caseId] = view;
    const card = cards.find(item => item.dataset.case === caseId);
    const data = examples[caseId][view];
    updateImage(card.querySelector('[data-case-image]'), data);
    card.querySelector('[data-case-state]').textContent = data.state;
    card.querySelector('[data-case-caption]').textContent = data.caption;
    updatePressed(card.querySelectorAll('[data-case-view]'), view, 'caseView');
    if (openCase === caseId) renderViewer();
  }

  cards.forEach(card => {
    card.querySelectorAll('[data-case-view]').forEach(button => {
      button.addEventListener('click', () => setCaseView(card.dataset.case, button.dataset.caseView));
    });
    card.querySelector('[data-expand-case]').addEventListener('click', event => {
      openCase = card.dataset.case;
      viewerTrigger = event.currentTarget;
      renderViewer();
      viewer.showModal();
      document.body.classList.add('modal-open');
    });
  });

  const filterButtons = document.querySelectorAll('[data-gallery-filter]');
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      const filter = button.dataset.galleryFilter;
      updatePressed(filterButtons, filter, 'galleryFilter');
      let count = 0;
      cards.forEach(card => {
        const visible = filter === 'all' || card.dataset.setting === filter;
        card.hidden = !visible;
        if (visible) count += 1;
      });
      const setting = filter === 'all' ? '' : `${filter} `;
      document.getElementById('gallery-count').textContent = `${count} ${setting}design example${count === 1 ? '' : 's'}`;
    });
  });

  viewer.querySelectorAll('[data-viewer-view]').forEach(button => {
    button.addEventListener('click', () => setCaseView(openCase, button.dataset.viewerView));
  });
  viewer.querySelector('.dialog-close').addEventListener('click', () => viewer.close());
  viewer.addEventListener('click', event => {
    if (event.target !== viewer) return;
    const rect = viewer.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) viewer.close();
  });
  viewer.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    openCase = null;
    if (viewerTrigger) viewerTrigger.focus();
  });

  const menuButton = document.querySelector('.menu-toggle');
  const mobileNavigation = document.getElementById('mobile-nav');
  function closeMenu() {
    mobileNavigation.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open navigation');
  }
  menuButton.addEventListener('click', () => {
    const expanded = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(expanded));
    menuButton.setAttribute('aria-label', expanded ? 'Close navigation' : 'Open navigation');
    mobileNavigation.hidden = !expanded;
  });
  mobileNavigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !mobileNavigation.hidden) {
      closeMenu();
      menuButton.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!mobileNavigation.hidden && !mobileNavigation.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
  });
  window.matchMedia('(min-width: 901px)').addEventListener('change', event => {
    if (event.matches) closeMenu();
  });
  document.getElementById('year').textContent = new Date().getFullYear();
})();
