(() => {
  const HIGHLIGHT_CLASS = 'guide-target-highlight';

  function ensureStyles() {
    if (document.getElementById('nearby-guide-focus-styles')) return;
    const style = document.createElement('style');
    style.id = 'nearby-guide-focus-styles';
    style.textContent = `
      .food-place-card.${HIGHLIGHT_CLASS}{
        animation:guideTargetPulse 2.4s ease;
      }
      @keyframes guideTargetPulse{
        0%,100%{box-shadow:var(--shadow)}
        18%,62%{box-shadow:0 0 0 3px rgba(20,63,49,.22),var(--shadow)}
      }
    `;
    document.head.appendChild(style);
  }

  function normalize(value) {
    return String(value || '').toLocaleLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, ' ').trim();
  }

  function findPlaceCard(name) {
    const target = normalize(name);
    return [...document.querySelectorAll('#guide .food-place-card')].find(card => {
      const title = card.querySelector('.food-place-name')?.textContent;
      return normalize(title) === target;
    }) || null;
  }

  function focusCard(name) {
    const card = findPlaceCard(name);
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
    const button = event.target.closest('#guideNearbySection [data-nearby-guide]');
    if (!button) return;

    // Run after the existing Nearby handler switches to Places and renders the city.
    const placeName = button.dataset.nearbyGuide || '';
    setTimeout(() => {
      const search = document.getElementById('foodSearch');
      if (search && search.value) {
        search.value = '';
        search.dispatchEvent(new Event('input', { bubbles: true }));
      }

      requestAnimationFrame(() => {
        if (!focusCard(placeName)) setTimeout(() => focusCard(placeName), 80);
      });
    }, 0);
  });

  ensureStyles();
})();
