(() => {
  const BUILD = '2026.08.06.1';
  const EXPECTED_CACHE = 'italy-2026-app-v3';

  function ensureStyles() {
    if (document.getElementById('app-status-styles')) return;
    const style = document.createElement('style');
    style.id = 'app-status-styles';
    style.textContent = `
      .app-status-card{margin-top:18px;padding:14px 16px;border:1px solid var(--line);border-radius:16px;background:var(--card)}
      .app-status-row{display:flex;align-items:center;justify-content:space-between;gap:14px}
      .app-status-row+.app-status-row{margin-top:9px;padding-top:9px;border-top:1px solid var(--line)}
      .app-status-label{font-size:12px;color:var(--muted);font-weight:750}
      .app-status-value{font-size:12px;font-weight:850;text-align:right}
      .app-status-value.ready{color:#17603f}
      .app-status-value.waiting{color:var(--muted)}
    `;
    document.head.appendChild(style);
  }

  async function offlineState() {
    if (!('serviceWorker' in navigator) || !('caches' in window)) {
      return { label: 'Unavailable', ready: false };
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      const keys = await caches.keys();
      const ready = Boolean(registration.active && keys.includes(EXPECTED_CACHE));
      return ready
        ? { label: 'Offline ready ✓', ready: true }
        : { label: 'Preparing offline…', ready: false };
    } catch {
      return { label: 'Offline status unavailable', ready: false };
    }
  }

  async function renderStatus() {
    ensureStyles();
    const more = document.getElementById('more');
    if (!more || more.classList.contains('hidden')) return;

    let card = more.querySelector('.app-status-card');
    if (!card) {
      card = document.createElement('section');
      card.className = 'app-status-card';
      more.appendChild(card);
    }

    card.innerHTML = `
      <div class="app-status-row"><span class="app-status-label">Offline</span><span class="app-status-value waiting">Checking…</span></div>
      <div class="app-status-row"><span class="app-status-label">App version</span><span class="app-status-value">${BUILD}</span></div>`;

    const state = await offlineState();
    if (!card.isConnected) return;
    const value = card.querySelector('.app-status-value');
    value.textContent = state.label;
    value.classList.toggle('ready', state.ready);
    value.classList.toggle('waiting', !state.ready);
  }

  const more = document.getElementById('more');
  if (more) {
    new MutationObserver(() => {
      if (!more.classList.contains('hidden')) requestAnimationFrame(renderStatus);
    }).observe(more, { attributes: true, attributeFilter: ['class'], childList: true });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') renderStatus();
  });
  window.addEventListener('online', renderStatus);
  window.addEventListener('offline', renderStatus);
  navigator.serviceWorker?.addEventListener('controllerchange', renderStatus);
  requestAnimationFrame(renderStatus);
})();
