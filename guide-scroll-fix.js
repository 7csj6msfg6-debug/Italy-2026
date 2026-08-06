(() => {
  const KEY = "italy2026-navigation-v1-scroll-guide";
  const guide = document.querySelector("#guide");
  if (!guide) return;

  const saveGuideScroll = () => {
    if (guide.classList.contains("hidden")) return;
    try {
      localStorage.setItem(KEY, String(Math.max(0, Math.round(window.scrollY))));
    } catch {}
  };

  const restoreGuideScroll = () => {
    let top = 0;
    try {
      top = Number(localStorage.getItem(KEY) || 0);
    } catch {}
    if (!Number.isFinite(top) || top <= 0) return;

    [0, 100, 250, 500].forEach(delay => {
      setTimeout(() => {
        if (!guide.classList.contains("hidden")) {
          window.scrollTo({ top, left: 0, behavior: "auto" });
        }
      }, delay);
    });
  };

  document.addEventListener("pointerdown", event => {
    const navigation = event.target.closest(".tab, [data-jump], [data-open], [data-back]");
    if (navigation) saveGuideScroll();
  }, true);

  document.addEventListener("click", event => {
    const target = event.target.closest('[data-target="guide"], [data-jump="guide"], [data-open="guide"], [data-back="guide"]');
    if (target) restoreGuideScroll();
  });

  new MutationObserver(() => {
    if (!guide.classList.contains("hidden")) restoreGuideScroll();
  }).observe(guide, { attributes: true, attributeFilter: ["class"] });

  window.addEventListener("pagehide", saveGuideScroll);
})();
