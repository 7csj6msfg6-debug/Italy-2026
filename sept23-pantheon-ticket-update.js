(() => {
  const DATE = '2026-09-23';
  const TITLE = 'Pantheon — Sept 23';
  const groups = window.TICKET_WALLET || [];
  let attractions = groups.find(group => group.group === 'Attractions');
  if (!attractions) {
    attractions = {group: 'Attractions', icon: '🏛️', items: []};
    groups.push(attractions);
  }
  if (!attractions.items.some(item => item.title === TITLE && item.date === 'Sep 23')) {
    attractions.items.push({
      title: TITLE,
      date: 'Sep 23',
      time: '9:00 AM',
      status: 'Ticket needed',
      details: 'Pantheon entry · 9:00–10:00 AM',
      note: 'Upload your Pantheon entry ticket here.',
      map: 'https://www.google.com/maps/search/?api=1&query=Pantheon+Rome',
      mapLabel: 'Maps'
    });
  }

  if (!window.__pantheonSept23TicketMatchPatched && typeof window.findWalletMatchForEvent === 'function') {
    const original = window.findWalletMatchForEvent;
    window.findWalletMatchForEvent = function(day, event) {
      if (day?.date === DATE && String(event?.title || '').trim() === 'Pantheon') {
        const group = (window.TICKET_WALLET || []).find(candidate => candidate.group === 'Attractions');
        const item = group?.items?.find(candidate => candidate.title === TITLE && candidate.date === 'Sep 23');
        if (item) {
          const key = `${group.group}|${item.title}|${item.date}|${item.time}`.toLowerCase().replace(/[^a-z0-9|]+/g, '-');
          return {score: 100, key, item};
        }
      }
      return original(day, event);
    };
    window.__pantheonSept23TicketMatchPatched = true;
  }

  if (typeof window.renderWallet === 'function') Promise.resolve(window.renderWallet()).catch(error => console.error('Pantheon Wallet refresh failed', error));
  if (typeof window.renderTrip === 'function') window.renderTrip();
  if (typeof window.renderHome === 'function') window.renderHome();
})();
