(() => {
  const FOOD_TOUR_TITLE = 'Trastevere & Tiber Island Street Food Tour';
  const FOOD_TOUR_DATE = '2026-09-20';

  const groups = window.TICKET_WALLET || [];
  let tours = groups.find(group => group.group === 'Tours');
  if (!tours) {
    tours = { group: 'Tours', icon: '🍷', items: [] };
    groups.push(tours);
  }

  const normalize = value => String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  let foodTourItem = tours.items.find(item => normalize(item.title) === normalize(FOOD_TOUR_TITLE));
  if (!foodTourItem) {
    foodTourItem = {
      title: FOOD_TOUR_TITLE,
      date: 'Sep 20',
      time: '5:30 PM',
      status: 'Ticket needed',
      details: 'Booked sunset street-food tour · Approx. 2.5 hours · Tiber Island to Trastevere',
      note: 'Attach the tour voucher or booking confirmation.',
      map: 'https://www.google.com/maps/search/?api=1&query=Basilica+di+San+Bartolomeo+all%27Isola+Rome',
      mapLabel: 'Meeting point'
    };
    tours.items.push(foodTourItem);
  }

  if (!window.__foodTourTicketMatchPatched && typeof window.findWalletMatchForEvent === 'function') {
    const originalMatch = window.findWalletMatchForEvent;
    window.findWalletMatchForEvent = function(day, event) {
      const eventTitle = normalize(event?.title);
      if (
        day?.date === FOOD_TOUR_DATE &&
        /trastevere.*tiber island.*street food tour/.test(eventTitle)
      ) {
        const group = (window.TICKET_WALLET || []).find(candidate => candidate.group === 'Tours');
        const item = group?.items?.find(candidate => normalize(candidate.title) === normalize(FOOD_TOUR_TITLE));
        if (group && item) {
          const key = typeof window.walletItemKey === 'function'
            ? window.walletItemKey(group.group, item)
            : `${group.group}|${item.title}|${item.date}|${item.time}`.toLowerCase().replace(/[^a-z0-9|]+/g, '-');
          return { score: 100, key, item };
        }
      }
      return originalMatch(day, event);
    };
    window.__foodTourTicketMatchPatched = true;
  }

  if (typeof window.renderWallet === 'function') {
    Promise.resolve(window.renderWallet()).catch(error => console.error('Unable to refresh Wallet after adding food-tour ticket support', error));
  }
  if (typeof window.renderTrip === 'function') window.renderTrip();
  if (typeof window.renderHome === 'function') window.renderHome();
})();
