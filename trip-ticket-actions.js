(() => {
  function walletMatchForEvent(day, event) {
    if (typeof window.findWalletMatchForEvent === 'function') return window.findWalletMatchForEvent(day, event);
    return null;
  }

  function openWalletItem(key) {
    if (typeof window.showView === 'function') window.showView('wallet');
    else document.querySelector('[data-target="wallet"]')?.click();
    setTimeout(() => {
      if (typeof window.cancelNavigationScrollRestore === 'function') window.cancelNavigationScrollRestore();
      if (typeof window.focusWalletCard === 'function' && window.focusWalletCard(key)) return;
      const target = document.querySelector(`#wallet [data-wallet-key="${CSS.escape(key)}"]`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.classList.add('trip-ticket-target');
        setTimeout(() => target.classList.remove('trip-ticket-target'), 2200);
      } else {
        document.getElementById('wallet')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 80);
  }

  async function decorateTrip() {
    const days = window.TRIP_DATA || [];
    const attachmentMap = typeof window.getWalletAttachmentMap === 'function'
      ? await window.getWalletAttachmentMap()
      : new Map();

    document.querySelectorAll('#trip .day-card').forEach((card, dayIndex) => {
      const day = days[dayIndex];
      if (!day) return;
      card.querySelectorAll('.event').forEach((row, eventIndex) => {
        row.querySelector('[data-trip-ticket]')?.remove();
        const event = day.events[eventIndex];
        if (!event) return;
        const match = walletMatchForEvent(day, event);
        if (!match) return;

        const content = row.querySelector('.event-title')?.parentElement;
        if (!content) return;
        const files = match.key ? (attachmentMap.get(match.key) || []) : [];
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'map-button';
        button.dataset.tripTicket = '1';
        button.style.marginLeft = event.map ? '8px' : '0';

        if (files.length === 1) {
          button.textContent = 'Open Ticket';
          button.addEventListener('click', () => {
            if (typeof window.openImportedTicket === 'function') window.openImportedTicket(files[0].id);
            else openWalletItem(match.key);
          });
        } else if (files.length > 1) {
          button.textContent = 'Open Tickets';
          button.addEventListener('click', () => openWalletItem(match.key));
        } else {
          button.textContent = 'View in Wallet';
          button.addEventListener('click', () => openWalletItem(match.key));
        }

        const map = content.querySelector('.map-button');
        if (map) map.insertAdjacentElement('afterend', button);
        else content.append(document.createElement('br'), button);
      });
    });
  }

  const style = document.createElement('style');
  style.textContent = '.trip-ticket-target{box-shadow:0 0 0 3px rgba(20,63,49,.22),var(--shadow)!important;transition:box-shadow .25s ease}';
  document.head.appendChild(style);

  document.addEventListener('italy:trip-rendered', () => requestAnimationFrame(decorateTrip));
  document.addEventListener('click', event => {
    if (event.target.closest('[data-target="trip"]')) setTimeout(decorateTrip, 0);
  });
  window.addEventListener('focus', () => {
    if (!document.getElementById('trip')?.classList.contains('hidden')) decorateTrip();
  });
  decorateTrip();
})();
