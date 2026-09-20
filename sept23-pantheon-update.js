(() => {
  const day = (window.TRIP_DATA || []).find(item => item.date === '2026-09-23');
  if (!day || !Array.isArray(day.events)) return;

  // Preserve the existing stops and their notes/maps; only change their times
  // so the new 9–10 AM Pantheon visit does not overlap the morning route.
  const times = new Map([
    ['Breakfast', '8:00–8:30 AM'],
    ['Ride to Piazza del Popolo', '10:00–10:25 AM'],
    ['Piazza del Popolo', '10:25–10:55 AM'],
    ['Pincian Terrace', '10:55–11:25 AM'],
    ['Optional Villa Borghese edge walk', '11:25–11:55 AM'],
    ['Spanish Steps', '11:55 AM–12:25 PM'],
    ['Walk toward Trevi / free central Rome time', '12:25–12:55 PM'],
    ['Trevi Fountain', '1:00–1:30 PM'],
    ['Proper lunch', '1:45–2:45 PM'],
    ['Campo de’ Fiori', '3:00–3:30 PM'],
    ['Jewish Ghetto', '3:40–4:20 PM'],
    ['Tiber Island pass-through', '~4:25–4:40 PM'],
    ['Orange Garden', '5:00–5:30 PM'],
    ['Aventine Keyhole', '5:35–5:50 PM'],
    ['Flexible break / transition', '6:00–7:00 PM']
  ]);
  day.events.forEach(event => {
    if (times.has(event.title)) event.time = times.get(event.title);
    if (event.title === 'Ride to Piazza del Popolo') {
      event.note = 'After the Pantheon, take a taxi or public transport to Piazza del Popolo; allow time for the transfer.';
    }
  });

  if (!day.events.some(event => event.title === 'Pantheon' && event.time === '9:00–10:00 AM')) {
    day.events.splice(1, 0,
      {time:'8:30–9:00 AM',title:'Walk to the Pantheon',note:'Head from Temple View GuestHouse to the Pantheon and allow time for the entrance.',map:'https://www.google.com/maps/dir/?api=1&origin=Temple+View+GuestHouse+Rome&destination=Pantheon+Rome'},
      {time:'9:00–10:00 AM',title:'Pantheon',note:'Visit the Pantheon. Plan to have the appropriate entry ticket if required; continue toward Piazza del Popolo afterward.',map:'https://www.google.com/maps/search/?api=1&query=Pantheon+Rome'}
    );
  }
})();
