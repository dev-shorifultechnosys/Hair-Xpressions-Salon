/* ==========================================================================\n   HAIR XPRESSIONS — GALLERY FILTERS\n   Page-specific enhancement. The site still works without JavaScript; filters\n   only improve browsing and do not control the shared lightbox behavior.\n   ========================================================================== */
(() => {
  'use strict';

  const filterButtons = Array.from(document.querySelectorAll('[data-gallery-filter]'));
  const cards = Array.from(document.querySelectorAll('[data-gallery-category]'));

  if (!filterButtons.length || !cards.length) return;

  const setFilter = (filter) => {
    cards.forEach((card) => {
      const matches = filter === 'all' || card.dataset.galleryCategory === filter;
      card.classList.toggle('is-filtered-out', !matches);
      card.setAttribute('aria-hidden', matches ? 'false' : 'true');
      // Hidden cards should not remain keyboard-focusable.
      card.tabIndex = matches ? 0 : -1;
    });

    filterButtons.forEach((button) => {
      const isActive = button.dataset.galleryFilter === filter;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  };

  filterButtons.forEach((button) => {
    button.setAttribute('aria-pressed', button.classList.contains('is-active') ? 'true' : 'false');
    button.addEventListener('click', () => setFilter(button.dataset.galleryFilter || 'all'));
  });
})();
