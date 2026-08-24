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

  function openImportedTicket(id) {
    if (id == null || id === '') return;

    // A normal same-origin URL lets Samsung Internet handle PDFs as inline
    // documents instead of treating every fresh blob: URL as a new download.
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const target = routeFor(id);
      const popup = window.open(target, '_blank');
      if (!popup) window.location.href = target;
      return;
    }

    // First-load fallback before the service worker controls this page.
    const popup = window.open('', '_blank');
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
