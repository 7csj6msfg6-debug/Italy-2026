(() => {
  const BUILD = '2026.08.07.1';
  const EXPECTED_CACHE = 'italy-2026-app-v6';
  let waitingWorker = null;
  let reloadingForUpdate = false;

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
      .app-update-card{margin-top:12px;padding:12px 14px;border:1px solid var(--line);border-radius:14px;background:var(--card);display:flex;align-items:center;justify-content:space-between;gap:12px}
      .app-update-copy{min-width:0}.app-update-copy strong{display:block;font-size:13px}.app-update-copy span{display:block;margin-top:3px;font-size:11px;color:var(--muted)}
      .app-update-refresh{flex:0 0 auto;border:0;border-radius:999px;padding:9px 12px;background:var(--ink);color:white;font-weight:850;font-size:12px}
    `;
    document.head.appendChild(style);
  }

  function removeLegacyOfflineCard(more) {
    more.querySelectorAll('.info-card').forEach(card => {
      const heading = card.querySelector('strong')?.textContent?.trim().toLowerCase();
      if (heading === 'offline-ready' || heading === 'offline ready') card.remove();
    });
  }

  function renderUpdatePrompt() {
    ensureStyles();
    const more = document.getElementById('more');
    if (!more) return;
    let prompt = more.querySelector('.app-update-card');
    if (!waitingWorker) {
      prompt?.remove();
      return;
    }
    if (!prompt) {
      prompt = document.createElement('section');
      prompt.className = 'app-update-card';
      prompt.innerHTML = `<div class="app-update-copy"><strong>New version ready</strong><span>Refresh once to use the latest build.</span></div><button class="app-update-refresh" type="button">Refresh</button>`;
      prompt.querySelector('button').addEventListener('click', () => {
        if (!waitingWorker) return;
        reloadingForUpdate = true;
        prompt.querySelector('button').disabled = true;
        prompt.querySelector('button').textContent = 'Updating…';
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      });
      const status = more.querySelector('.app-status-card');
      if (status) status.insertAdjacentElement('beforebegin', prompt);
      else more.appendChild(prompt);
    }
  }

  async function offlineState() {
    if (!('serviceWorker' in navigator) || !('caches' in window)) return { label: 'Unavailable', ready: false };
    try {
      const registration = await navigator.serviceWorker.ready;
      const keys = await caches.keys();
      const ready = Boolean(registration.active && keys.includes(EXPECTED_CACHE));
      return ready ? { label: 'Offline ready ✓', ready: true } : { label: 'Preparing offline…', ready: false };
    } catch {
      return { label: 'Offline status unavailable', ready: false };
    }
  }

  async function renderStatus() {
    ensureStyles();
    const more = document.getElementById('more');
    if (!more || more.classList.contains('hidden')) return;
    removeLegacyOfflineCard(more);
    let card = more.querySelector('.app-status-card');
    if (!card) {
      card = document.createElement('section');
      card.className = 'app-status-card';
      more.appendChild(card);
    }
    card.innerHTML = `<div class="app-status-row"><span class="app-status-label">Offline</span><span class="app-status-value waiting">Checking…</span></div><div class="app-status-row"><span class="app-status-label">App version</span><span class="app-status-value">${BUILD}</span></div>`;
    renderUpdatePrompt();
    const state = await offlineState();
    if (!card.isConnected) return;
    const value = card.querySelector('.app-status-value');
    value.textContent = state.label;
    value.classList.toggle('ready', state.ready);
    value.classList.toggle('waiting', !state.ready);
  }

  function watchRegistration(registration) {
    if (registration.waiting && navigator.serviceWorker.controller) {
      waitingWorker = registration.waiting;
      renderUpdatePrompt();
    }
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          waitingWorker = worker;
          renderUpdatePrompt();
        }
      });
    });
  }

  async function checkForUpdates() {
    if (!('serviceWorker' in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;
      watchRegistration(registration);
      await registration.update();
    } catch (error) {
      console.error('Unable to check for app update', error);
    }
  }

  const more = document.getElementById('more');
  if (more) new MutationObserver(() => { if (!more.classList.contains('hidden')) requestAnimationFrame(renderStatus); }).observe(more, { attributes: true, attributeFilter: ['class'], childList: true });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    renderStatus();
    checkForUpdates();
  });
  window.addEventListener('online', () => { renderStatus(); checkForUpdates(); });
  window.addEventListener('offline', renderStatus);
  window.addEventListener('focus', checkForUpdates);

  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    if (reloadingForUpdate) window.location.reload();
    else renderStatus();
  });

  requestAnimationFrame(renderStatus);
  checkForUpdates();
})();
