(() => {
  const groups = window.TICKET_WALLET || [];

  function item(groupName, title) {
    return groups.find(group => group.group === groupName)?.items?.find(entry => entry.title === title) || null;
  }

  const updates = [
    ['Trains', 'Frecciarossa 9411 — Venice to Florence', 'https://www.google.com/maps/search/?api=1&query=Venezia+Santa+Lucia+Station', 'Departure station', 'Venezia Santa Lucia'],
    ['Trains', 'Italo 8953 — Florence to Rome', 'https://www.google.com/maps/search/?api=1&query=Firenze+Santa+Maria+Novella+Station', 'Departure station', 'Firenze Santa Maria Novella'],
    ['Trains', 'Italo 9967 — Rome to Naples', 'https://www.google.com/maps/search/?api=1&query=Roma+Termini+Station', 'Departure station', 'Roma Termini'],
    ['Trains', 'Florence ↔ Pisa', 'https://www.google.com/maps/search/?api=1&query=Firenze+Santa+Maria+Novella+Station', 'Florence station', 'Firenze Santa Maria Novella'],
    ['Ferries', 'SNAV Naples ⇄ Capri Round Trip', 'https://www.google.com/maps/search/?api=1&query=Molo+Beverello+Naples', 'Naples terminal', 'Molo Beverello, Naples']
  ];

  updates.forEach(([groupName, title, map, mapLabel, place]) => {
    const target = item(groupName, title);
    if (!target) return;
    target.map = map;
    target.mapLabel = mapLabel;
    if (!String(target.details || '').includes(place)) {
      target.details = target.details ? `${target.details} · ${place}` : place;
    }
  });
})();
