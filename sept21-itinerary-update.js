(() => {
  if (!Array.isArray(window.TRIP_DATA)) return;
  const day = window.TRIP_DATA.find(d => d.date === '2026-09-21');
  if (!day) return;

  day.title = 'Colosseum Underground, Forum, Palatine and Rome Night Tour';
  day.events = [
    {
      time: '8:30–9:30 AM',
      title: 'Easy breakfast and morning',
      note: 'Keep the morning relaxed before a long walking day with uneven surfaces at the Roman Forum and Palatine Hill.'
    },
    {
      time: '9:30–11:00 AM',
      title: 'Piazza Venezia + Capitoline Hill',
      note: 'Piazza Venezia • Victor Emmanuel II Monument exterior • Capitoline Hill • Piazza del Campidoglio • viewpoints overlooking the Roman Forum.',
      map: 'https://www.google.com/maps/dir/?api=1&origin=Piazza+Venezia+Rome&destination=Piazza+del+Campidoglio+Rome&waypoints=Victor+Emmanuel+II+Monument+Rome'
    },
    {
      time: '11:15 AM–12:00 PM',
      title: 'Early lunch / substantial quick bite',
      note: 'Keep this efficient near Monti or the Colosseum. Use the Rome Food Companion for the best option based on location, hours and hunger rather than forcing a specific restaurant.',
      map: 'https://www.google.com/maps/search/?api=1&query=Monti+Rome'
    },
    {
      time: '12:00–12:20 PM',
      title: 'Walk to the Colosseum',
      note: 'Head toward Piazza del Colosseo with enough buffer to be in the entrance area before the required arrival time.',
      map: 'https://www.google.com/maps/search/?api=1&query=Colosseum+Rome'
    },
    {
      time: '12:30 PM',
      title: '⏰ Required Colosseum arrival',
      note: 'Ticket requires arrival 30 minutes before the 1:00 PM entry. Bring the ticket/QR code and matching photo ID. Backpacks, suitcases and trolleys are prohibited; use a small crossbody/shoulder bag. Avoid glass bottles. After entering, immediately reach the Underground meeting point.',
      map: 'https://www.google.com/maps/search/?api=1&query=Colosseum+Entrance+Piazza+del+Colosseo+Rome'
    },
    {
      time: '1:00–~2:30 PM',
      title: '🏟️ Colosseum — Full Experience Underground + Arena',
      note: 'BOOKED. Includes the Underground at the reserved time, Arena, first level and second level. The ticket lists 90 minutes for the Colosseum visit and uses a controlled one-way route.',
      status: 'Booked',
      map: 'https://www.google.com/maps/search/?api=1&query=Colosseum+Rome'
    },
    {
      time: '~2:45–5:20/5:30 PM',
      title: 'Roman Forum + Palatine Hill',
      note: 'Continue into the archaeological park after the Colosseum. Prioritize Via Sacra, the main Forum monuments and basilica ruins, then Palatine imperial ruins, Forum views and Circus Maximus viewpoints. The Full Experience ticket includes Forum, Palatine, museums, exhibitions and SUPER sites.',
      map: 'https://www.google.com/maps/search/?api=1&query=Roman+Forum+Via+Sacra+Entrance+Rome'
    },
    {
      time: '~5:45–6:30 PM',
      title: 'Hotel break',
      note: 'Return to Temple View Guest House to shower, change, charge your phone and rest your feet after the archaeological sites.',
      map: 'https://www.google.com/maps/search/?api=1&query=Temple+View+GuestHouse+Rome'
    },
    {
      time: '~6:30–7:10 PM',
      title: 'Quick dinner / aperitivo',
      note: 'Keep this flexible and efficient rather than choosing a destination restaurant. Use the Rome Food Companion and favor an easy route toward Termini.'
    },
    {
      time: '~7:50 PM',
      title: 'Arrive at Big Bus Stop #1 — Termini',
      note: 'Aim to reach the Termini Railway Station departure point around 7:50–8:00 PM for a comfortable buffer before the night tour.',
      map: 'https://www.google.com/maps/search/?api=1&query=Roma+Termini+Railway+Station'
    },
    {
      time: '8:20–~9:20 PM',
      title: '🌙 Big Bus Rome Panoramic Night Tour',
      note: 'Booked non-stop panoramic night tour of illuminated Rome. Approximately 1 hour.',
      status: 'Booked'
    },
    {
      time: 'After 9:20 PM',
      title: 'Flexible end to the night',
      note: 'Nothing else scheduled. Have a proper dinner if still hungry, grab gelato or a drink, or return to Temple View Guest House and rest before Vatican day.'
    }
  ];
})();
