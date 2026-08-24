(() => {
  const routeFor = id => new URL(`./ticket-file/${encodeURIComponent(String(id))}`, document.baseURI).href;

  async function fallbackBlobOpen(id, popup) {
    try {
      if (typeof window.getImportedTicket !== 'function') throw new Error('Ticket reader unavailable');
      const ticket = await window.getImportedTicket(id);
      if (!ticket?.blob) throw new Error('Ticket not found');
      const url = URL.createObjectURL(ticket.blob);
      if (popup) popup.location = url;
      else window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch (error) {
      if (popup) popup.close();
      alert('This ticket could not be opened.');
    }
  }

  async function routeReady(target) {
    try {
      const response = await fetch(target, {
        cache: 'no-store',
        headers: { Range: 'bytes=0-0' }
      });
      return response.status === 206 && response.headers.get('accept-ranges') === 'bytes';
    } catch {
      return false;
    }
  }

  function waitForControllerChange(timeout = 1400) {
    if (!('serviceWorker' in navigator)) return Promise.resolve();
    return new Promise(resolve => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        navigator.serviceWorker.removeEventListener('controllerchange', finish);
        resolve();
      };
      navigator.serviceWorker.addEventListener('controllerchange', finish, { once: true });
      setTimeout(finish, timeout);
    });
  }

  async function openImportedTicket(id) {
    if (id == null || id === '') return;
    const popup = window.open('', '_blank');
    const target = routeFor(id);

    // Samsung Internet is much more reliable with a normal same-origin PDF URL
    // than with a freshly-created blob: URL. Probe the service-worker route first
    // so a just-deployed app cannot accidentally open the old app shell at it.
    if ('serviceWorker' in navigator) {
      try {
        let ready = await routeReady(target);
        if (!ready) {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            const changed = waitForControllerChange();
            await registration.update();
            await changed;
            ready = await routeReady(target);
          }
        }
        if (ready) {
          if (popup) popup.location = target;
          else window.location.href = target;
          return;
        }
      } catch {}
    }

    // First-load / unsupported-browser fallback keeps the current behavior.
    fallbackBlobOpen(id, popup);
  }

  window.openImportedTicket = openImportedTicket;

  // Intercept every existing ticket button before app.js / wallet-polish click
  // handlers can create their own blob: URL. Window capture runs before their
  // document/element listeners regardless of script registration order.
  window.addEventListener('click', event => {
    const imported = event.target.closest?.('[data-open-imported]');
    const direct = event.target.closest?.('#home [data-home-wallet][data-direct-ticket-id]');
    const button = imported || direct;
    if (!button) return;
    const id = imported ? imported.dataset.openImported : direct.dataset.directTicketId;
    if (!id) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openImportedTicket(id);
  }, true);

  function neutralizeDeviceCopy() {
    const wallet = document.getElementById('wallet');
    if (!wallet) return;
    const walker = document.createTreeWalker(wallet, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      if (!node.nodeValue) return;
      node.nodeValue = node.nodeValue
        .replace(/On this iPhone/g, 'On this device')
        .replace(/stay on this iPhone/g, 'stay on this device');
    });
  }

  const originalRenderWallet = window.renderWallet;
  if (typeof originalRenderWallet === 'function') {
    window.renderWallet = async function(...args) {
      const result = await originalRenderWallet.apply(this, args);
      neutralizeDeviceCopy();
      return result;
    };
  }

  neutralizeDeviceCopy();
})();
