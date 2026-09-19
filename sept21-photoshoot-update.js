(() => {
  const DATE = '2026-09-21';
  const TITLE = '📸 Romantic Experience in Rome — Photo Tour';
  const WALLET_TITLE = 'Romantic Experience in Rome — Photo Tour';
  const MAP = 'https://www.google.com/maps/place/Caff%C3%A8+Roma,+Via+del+Colosseo,+31a,+00184+Roma+RM,+Italy/@41.891608,12.4909512,16z/data=!4m6!3m5!1s0x132f61df7f8ca7cf:0xf6d49254186db239!8m2!3d41.891608!4d12.4909512!16s%2Fg%2F11js2tr7fz?g_ep=Eg1tbF8yMDI2MDkxM18wIJvbDyoASAJQAg%3D%3D';
  const day = (window.TRIP_DATA || []).find(item => item.date === DATE);
  if (day && Array.isArray(day.events) && !day.events.some(event => /romantic experience in rome.*photo tour/i.test(event.title || ''))) {
    // Only retime breakfast and Piazza Venezia/Capitoline. The original 11:15 AM lunch,
    // 12:30 PM Colosseum arrival, 1 PM timed entry and every later stop stay unchanged.
    if (day.events[0]?.title === 'Easy breakfast') {
      day.events[0] = { ...day.events[0], time: '8:00–8:30 AM', note: 'Earlier breakfast before Piazza Venezia and the 10 AM photo tour.' };
    }
    if (day.events[1]?.title === 'Piazza Venezia + Capitoline Hill') {
      day.events[1] = { ...day.events[1], time: '8:30–9:20 AM', note: 'See Piazza Venezia, the Victor Emmanuel II Monument exterior, Piazza del Campidoglio and Roman Forum overlooks. Keep this visit focused and leave by 9:20 AM for the photoshoot.' };
    }
    day.events.splice(2, 0,
      { time: '9:20–9:50 AM', title: 'Walk to Caffè Roma — photoshoot meeting point', note: 'Head to Caffè Roma, Via del Colosseo 31a, 00184 Rome. Arrive by 9:50 AM, ten minutes early. Use the precise meeting-point pin.', map: MAP },
      { time: '10:00–11:00 AM', title: TITLE, note: 'Private photo tour for two, approximately one hour. Meet at Caffè Roma, Via del Colosseo 31a, by 9:50 AM. Confirm that your GetYourGuide booking has been rescheduled to Sept. 21. Print the updated voucher; the original voucher says mobile tickets are not accepted. Ends at the meeting point.', map: MAP }
    );
  }

  const groups = window.TICKET_WALLET || [];
  let tours = groups.find(group => group.group === 'Tours');
  if (!tours) { tours = { group: 'Tours', icon: '🍷', items: [] }; groups.push(tours); }
  const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!tours.items.some(item => normalize(item.title) === normalize(WALLET_TITLE) && item.date === 'Sep 21')) {
    tours.items.push({
      title: WALLET_TITLE,
      date: 'Sep 21',
      time: '10:00 AM',
      status: 'Ticket needed',
      details: 'Photo tour for 2 · 1 hour · Caffè Roma, Via del Colosseo 31a · arrive by 9:50 AM',
      note: 'Upload your updated Sept. 21 GetYourGuide voucher here. Confirm the date change with the provider and print the voucher; the original requires a paper ticket.',
      map: MAP,
      mapLabel: 'Meeting point'
    });
  }

  // Connect the new dated itinerary entry with its matching Wallet item and ticket actions.
  if (!window.__sept21PhotoshootTicketMatchPatched && typeof window.findWalletMatchForEvent === 'function') {
    const originalMatch = window.findWalletMatchForEvent;
    window.findWalletMatchForEvent = function(targetDay, event) {
      if (targetDay?.date === DATE && /romantic experience in rome.*photo tour/.test(normalize(event?.title))) {
        const group = (window.TICKET_WALLET || []).find(candidate => candidate.group === 'Tours');
        const item = group?.items?.find(candidate => normalize(candidate.title) === normalize(WALLET_TITLE) && candidate.date === 'Sep 21');
        if (item) {
          const key = `${group.group}|${item.title}|${item.date}|${item.time}`.toLowerCase().replace(/[^a-z0-9|]+/g, '-');
          return { score: 100, key, item };
        }
      }
      return originalMatch(targetDay, event);
    };
    window.__sept21PhotoshootTicketMatchPatched = true;
  }
  if (typeof window.renderWallet === 'function') Promise.resolve(window.renderWallet()).catch(error => console.error('Sept 21 photo tour Wallet refresh failed', error));
  if (typeof window.renderTrip === 'function') window.renderTrip();
  if (typeof window.renderHome === 'function') window.renderHome();
})();
