(() => {
  const HIGHLIGHT_CLASS = 'guide-target-highlight';

  function ensureStyles() {
    if (document.getElementById('nearby-guide-focus-styles')) return;
    const style = document.createElement('style');
    style.id = 'nearby-guide-focus-styles';
    style.textContent = `
      .guide-place-card.${HIGHLIGHT_CLASS}{
        animation:guideTargetPulse 2.4s ease;
      }
      @keyframes guideTargetPulse{
        0%,100%{box-shadow:var(--shadow)}
        18%,62%{box-shadow:0 0 0 3px rgba(20,63,49,.22),var(--shadow)}
      }
    `;
    document.head.appendChild(style);
  }

  function findPlaceCard(id) {
    if (!id) return null;
    const editButton = document.querySelector(`#guide [data-edit-place="${CSS.escape(id)}"]`);
    return editButton?.closest('.guide-place-card') || null;
  }

  function focusCard(id) {
    const card = findPlaceCard(id);
    if (!card) return false;

    const section = card.closest('details.food-category-section');
    if (section) section.open = true;

    requestAnimationFrame(() => {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.remove(HIGHLIGHT_CLASS);
      void card.offsetWidth;
      card.classList.add(HIGHLIGHT_CLASS);
      setTimeout(() => card.classList.remove(HIGHLIGHT_CLASS), 2500);
    });
    return true;
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('#guideNearbySection [data-nearby-view]');
    if (!button) return;

    // The built-in handler runs first: it switches to Places, selects the city,
    // fills the search with the place name, and renders the matching card.
    // Then clear that temporary search and focus the same place by its stable id.
    const placeId = button.dataset.nearbyView || '';
    setTimeout(() => {
      const search = document.getElementById('placeSearch');
      if (search) {
        if (search.value) search.value = '';
        search.dispatchEvent(new Event('input', { bubbles: true }));
      }

      requestAnimationFrame(() => {
        if (!focusCard(placeId)) setTimeout(() => focusCard(placeId), 100);
      });
    }, 0);
  });

  ensureStyles();
})();
