(() => {
  const SELECTOR = '#guide details.food-category-section[open]';

  function collapseNewFoodSections(root = document) {
    if (!root) return;
    if (root.nodeType === Node.ELEMENT_NODE && root.matches?.(SELECTOR)) root.removeAttribute('open');
    if (root.querySelectorAll) root.querySelectorAll(SELECTOR).forEach(section => section.removeAttribute('open'));
  }

  const guide = document.getElementById('guide');
  if (!guide) return;

  collapseNewFoodSections(guide);

  new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(collapseNewFoodSections));
  }).observe(guide, { childList: true, subtree: true });
})();
