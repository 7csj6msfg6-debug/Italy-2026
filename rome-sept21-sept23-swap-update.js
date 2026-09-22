(() => {
  const days = window.TRIP_DATA || [];
  const sept21 = days.find(day => day.date === '2026-09-21');
  const sept23 = days.find(day => day.date === '2026-09-23');
  const nightTitle = '🌙 Big Bus Rome Panoramic Night Tour';
  const arrivalTitle = 'Arrive at Big Bus Stop #1 — Termini';
  const gardenTitle = 'Orange Garden';
  const keyholeTitle = 'Aventine Keyhole';

  // Retain checked-off stops if their position in either day's list changes.
  function editDay(day, edit) {
    if (!Array.isArray(day?.events)) return;
    const completed = typeof isDone === 'function' && typeof eventId === 'function'
      ? day.events.filter((event, index) => isDone(eventId(day, event, index))) : [];
    edit(day);
    if (typeof setDone === 'function' && typeof eventId === 'function') {
      completed.forEach(event => {
        const index = day.events.indexOf(event);
        if (index !== -1) setDone(eventId(day, event, index), true);
      });
    }
  }

  let nightTour;
  let nightArrival;
  editDay(sept21, day => {
    nightTour = day.events.find(event => event.title === nightTitle);
    nightArrival = day.events.find(event => event.title === arrivalTitle);
    day.events = day.events.filter(event => event !== nightTour && event !== nightArrival);
    day.title = 'Ancient Rome — Colosseum, Forum and Aventine';
    // Visit dates are known, but visit times are not; add checkable retrospective stops.
    const insertAt = day.events.findIndex(event => event.title === 'Free evening');
    if (!day.events.some(event => event.title === gardenTitle)) {
      day.events.splice(insertAt < 0 ? day.events.length : insertAt, 0,
        {time:'Sept. 21 · time not recorded', title:gardenTitle, note:'Visited on Sept. 21. Check off this completed stop.', map:'https://www.google.com/maps/search/?api=1&query=Giardino+degli+Aranci+Rome'},
        {time:'Sept. 21 · time not recorded', title:keyholeTitle, note:'Visited on Sept. 21. Check off this completed stop.', map:'https://www.google.com/maps/search/?api=1&query=Aventine+Keyhole+Rome'}
      );
    }
    const evening = day.events.find(event => event.title === 'Free evening');
    if (evening) {
      evening.time = 'Evening';
      evening.note = 'No night tour tonight: it is now scheduled for Sept. 23. Rest or enjoy a relaxed evening.';
    }
  });

  editDay(sept23, day => {
    day.events = day.events.filter(event => event.title !== gardenTitle && event.title !== keyholeTitle);
    day.title = 'North-Central Rome, Jewish Ghetto and night tour';
    const breakEvent = day.events.find(event => event.title === 'Flexible break / transition');
    if (breakEvent) breakEvent.note = 'Coffee, rest or relaxed wandering before the evening. Leave enough time for dinner and the Termini transfer.';
    const dinner = day.events.find(event => event.title === 'Farewell dinner in Rome');
    if (dinner) dinner.note = 'Have your farewell dinner early enough to reach Big Bus Stop #1 at Termini by 7:50 PM; keep the location and timing flexible.';
    if (!day.events.some(event => event.title === nightTitle)) {
      day.events.push(
        {...(nightArrival || {}), time:'7:50 PM', title:arrivalTitle, note:'Arrive at Big Bus Stop #1 at Termini about 30 minutes ahead of the 8:20 PM departure.', map:'https://www.google.com/maps/search/?api=1&query=Roma+Termini+Railway+Station'},
        {...(nightTour || {}), time:'8:20 PM', title:nightTitle, note:'Rescheduled booked panoramic night tour of illuminated Rome. Approximately one hour.', status:'Booked'}
      );
    }
  });

  // Keep the existing Wallet reservation and relink local attachments when its date changes.
  const tours = (window.TICKET_WALLET || []).find(group => group.group === 'Tours');
  const reservation = tours?.items?.find(item => item.title === 'Big Bus Rome Panoramic Night Tour');
  if (reservation) {
    const oldKey = typeof walletItemKey === 'function' ? walletItemKey('Tours', reservation) : '';
    reservation.date = 'Sep 23';
    reservation.time = '8:20 PM';
    reservation.details = 'Rescheduled panoramic night tour · Sep 23 · 8:20 PM · arrive at Stop #1 Termini by 7:50 PM · Angie’s complimentary Prosecco benefit included';
    const newKey = typeof walletItemKey === 'function' ? walletItemKey('Tours', reservation) : '';
    if (oldKey && newKey && oldKey !== newKey && typeof openTicketDB === 'function') {
      (async () => {
        try {
          const db = await openTicketDB();
          await new Promise((resolve, reject) => {
            const tx = db.transaction('tickets', 'readwrite');
            const store = tx.objectStore('tickets');
            const request = store.getAll();
            request.onsuccess = () => {
              (request.result || []).filter(ticket => ticket.linkedWalletKey === oldKey)
                .forEach(ticket => store.put({...ticket, linkedWalletKey:newKey}));
            };
            request.onerror = () => reject(request.error);
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
          });
          db.close();
          if (typeof renderWallet === 'function') await renderWallet();
        } catch (error) {
          console.error('Could not relink the rescheduled Big Bus ticket; original saved file was not deleted.', error);
        }
      })();
    }
  }

  // Existing event-to-Wallet matching originally only recognized Sept. 21.
  if (!window.__bigBusSept23MatchPatched && typeof window.walletReservationTitle === 'function') {
    const original = window.walletReservationTitle;
    window.walletReservationTitle = function(day, event) {
      if (day?.date === '2026-09-23' && [nightTitle, arrivalTitle].includes(event?.title)) {
        return 'Big Bus Rome Panoramic Night Tour';
      }
      return original(day, event);
    };
    window.__bigBusSept23MatchPatched = true;
  }
})();