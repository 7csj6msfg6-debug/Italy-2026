(() => {
  const trip = window.TRIP_DATA || [];
  const sep21 = trip.find(day => day.date === '2026-09-21');
  if (sep21) {
    const colosseum = sep21.events.find(event => event.title === 'Colosseum');
    if (colosseum) {
      colosseum.time = '1:00 PM';
      colosseum.status = 'Booked';
      colosseum.note = 'FULL EXPERIENCE – SOTTERRANEI E ARENA. Includes Colosseum levels 1 & 2, Underground and Arena. Ticket also covers the Roman Forum, Palatine Hill, exhibitions/museums and SUPER sites. Valid for 2 consecutive days.';
    }

    const forum = sep21.events.find(event => /Roman Forum and Palatine Hill/i.test(event.title));
    if (forum) {
      forum.status = 'Booked';
      forum.note = 'Included in the same FULL EXPERIENCE – SOTTERRANEI E ARENA ticket. Continue through the Roman Forum and Palatine Hill using the same ticket coverage; ticket validity is 2 consecutive days.';
    }
  }

  if (Array.isArray(window.REMAINING)) {
    window.REMAINING = window.REMAINING.filter(item => !/colosseum|roman forum|palatine/i.test(String(item?.[0] || '')));
  }

  const attractions = (window.TICKET_WALLET || []).find(group => group.group === 'Attractions');
  const walletItem = attractions?.items?.find(item => /Colosseum\s*\/\s*Forum\s*\/\s*Palatine/i.test(item.title || ''));
  if (walletItem) {
    walletItem.time = '1:00 PM';
    walletItem.status = 'Ready';
    walletItem.details = 'FULL EXPERIENCE – SOTTERRANEI E ARENA · 2 tickets · Colosseum levels 1 & 2 + Underground + Arena · Roman Forum + Palatine Hill + exhibitions/museums + SUPER sites · Valid 2 consecutive days · Reservation GPCOZXWZD833PZ7E';
    walletItem.map = 'https://www.google.com/maps/search/?api=1&query=Colosseum+Rome';
    walletItem.mapLabel = 'Entrance';
    delete walletItem.note;
  }
})();
