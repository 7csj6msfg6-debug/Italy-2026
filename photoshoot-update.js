(() => {
  const DATE = '2026-09-23';
  const TITLE = '📸 Romantic Experience in Rome — Photo Tour';
  const WALLET_TITLE = 'Romantic Experience in Rome — Photo Tour';
  const MAP = 'https://www.google.com/maps/search/?api=1&query=Caff%C3%A8+Roma+00197+Roma+RM+Italia';
  const day = (window.TRIP_DATA || []).find(item => item.date === DATE);
  if (day && !day.events.some(event => /romantic experience in rome.*photo tour/i.test(event.title))) {
    // Add just the booking; leave all existing activities, times and notes untouched.
    day.events.splice(1, 0, {
      time: '9:00 AM',
      title: TITLE,
      note: 'Booked private photo tour for 2 people, approximately 1 hour. Meet at Caffè Roma by 8:50 AM. Confirm the exact meeting-point pin with the provider. PRINT the voucher: mobile tickets are not accepted. Ends at the starting point. Other stops today remain flexible.',
      status: 'Booked',
      map: MAP
    });
  }

  const groups = window.TICKET_WALLET || [];
  let tours = groups.find(group => group.group === 'Tours');
  if (!tours) {
    tours = {group:'Tours', icon:'🍷', items:[]};
    groups.push(tours);
  }
  const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!tours.items.some(item => normalize(item.title) === normalize(WALLET_TITLE))) {
    tours.items.push({
      title: WALLET_TITLE,
      date: 'Sep 23',
      time: '9:00 AM',
      status: 'Ticket needed',
      details: 'Booked · 2 people · 1 hour · Meet at Caffè Roma by 8:50 AM',
      note: 'Upload your GetYourGuide voucher here. Print the voucher before the session: mobile tickets are not accepted. Confirm the exact meeting-point pin with the provider.',
      map: MAP,
      mapLabel: 'Meeting point'
    });
  }

  // Reuse the existing Trip/Today ticket actions and the Wallet upload/open flow.
  if (!window.__photoshootTicketMatchPatched && typeof window.findWalletMatchForEvent === 'function') {
    const originalMatch = window.findWalletMatchForEvent;
    window.findWalletMatchForEvent = function(targetDay, event) {
      if (targetDay?.date === DATE && /romantic experience in rome.*photo tour/.test(normalize(event?.title))) {
        const group = (window.TICKET_WALLET || []).find(candidate => candidate.group === 'Tours');
        const item = group?.items?.find(candidate => normalize(candidate.title) === normalize(WALLET_TITLE));
        if (item) {
          const key = `${group.group}|${item.title}|${item.date}|${item.time}`.toLowerCase().replace(/[^a-z0-9|]+/g, '-');
          return {score:100, key, item};
        }
      }
      return originalMatch(targetDay, event);
    };
    window.__photoshootTicketMatchPatched = true;
  }
  if (typeof window.renderWallet === 'function') Promise.resolve(window.renderWallet()).catch(error => console.error('Photoshoot Wallet refresh failed', error));
  if (typeof window.renderTrip === 'function') window.renderTrip();
  if (typeof window.renderHome === 'function') window.renderHome();
})();
