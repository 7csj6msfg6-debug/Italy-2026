(() => {
  const days = window.TRIP_DATA;
  if (!Array.isArray(days)) return;

  const setDay = (date, title, events) => {
    const day = days.find(item => item.date === date);
    if (!day) return;
    day.title = title;
    day.events = events;
  };

  setDay('2026-09-20', 'Rome arrival, historic center and Trastevere food tour', [
    {time:'11:40 AM',title:'Arrive Roma Termini from Florence',note:'Arrive on Italo 8953 from Firenze Santa Maria Novella.',status:'Booked',map:'https://www.google.com/maps/search/?api=1&query=Roma+Termini'},
    {time:'12:15 PM',title:'Temple View GuestHouse — luggage drop / check-in',note:'Drop luggage and check in if the room is ready before starting the afternoon.',map:'https://www.google.com/maps/search/?api=1&query=Temple+View+GuestHouse+Rome'},
    {time:'12:30–1:30 PM',title:'Light lunch',note:'Keep lunch light because the booked food tour starts at 5:30 PM. Antico Forno Roscioli or another light Rome Food Companion option is ideal; avoid a heavy sit-down meal.'},
    {time:'1:30–2:30 PM',title:'Hotel reset',note:'Rest, freshen up and get settled after the train ride.'},
    {time:'2:45 PM',title:'Largo di Torre Argentina',note:'Short visit close to the hotel before continuing north-west through the historic center.',map:'https://www.google.com/maps/search/?api=1&query=Largo+di+Torre+Argentina+Rome'},
    {time:'3:15–4:00 PM',title:'Pantheon',note:'Visit the Pantheon interior if ticket/entry timing works, then continue toward Piazza Navona.',map:'https://www.google.com/maps/search/?api=1&query=Pantheon+Rome'},
    {time:'4:05–4:35 PM',title:'Piazza Navona',note:'Enjoy the fountains and surrounding streets without adding extra stops that would cut into the food-tour buffer.',map:'https://www.google.com/maps/search/?api=1&query=Piazza+Navona+Rome'},
    {time:'4:35–5:00 PM',title:'Walk to Tiber Island',note:'Head south toward the booked food-tour meeting point and preserve the arrival buffer.',map:'https://www.google.com/maps/dir/?api=1&origin=Piazza+Navona+Rome&destination=Basilica+di+San+Bartolomeo+all%27Isola+Rome'},
    {time:'5:00–5:15 PM',title:'Arrive at Tiber Island meeting area',note:'Locate the obelisk in front of the Basilica of St. Bartholomew on Tiber Island and get settled before the tour.',map:'https://www.google.com/maps/search/?api=1&query=Basilica+di+San+Bartolomeo+all%27Isola+Rome'},
    {time:'5:30 PM',title:'🍕 Trastevere & Tiber Island Street Food Tour',note:'Booked sunset street-food tour, approximately 2.5 hours. Begins on Tiber Island and continues through Trastevere with multiple Roman street-food tastings and drinks. Treat the tour as dinner.',status:'Booked',map:'https://www.google.com/maps/search/?api=1&query=Basilica+di+San+Bartolomeo+all%27Isola+Rome'},
    {time:'~8:00 PM onward',title:'Free evening in Trastevere',note:'No more required sightseeing. Linger for a drink or coffee, wander if you feel like it, or return to Temple View GuestHouse.'}
  ]);

  setDay('2026-09-21', 'Ancient Rome — Colosseum Underground, Forum and night tour', [
    {time:'8:30–9:30 AM',title:'Easy breakfast',note:'Keep the morning relaxed before a long day of walking on uneven archaeological surfaces.'},
    {time:'9:30–11:00 AM',title:'Piazza Venezia + Capitoline Hill',note:'See Piazza Venezia, the Victor Emmanuel II Monument exterior, Piazza del Campidoglio and the overlooks toward the Roman Forum.',map:'https://www.google.com/maps/dir/?api=1&origin=Piazza+Venezia+Rome&destination=Piazza+del+Campidoglio+Rome&waypoints=Victor+Emmanuel+II+Monument+Rome'},
    {time:'11:15 AM–12:00 PM',title:'Early lunch / substantial quick bite',note:'Eat before the Colosseum so you are not hungry during the archaeological visit. Use the Rome Food Companion around Monti / the Colosseum area and keep the meal efficient.',map:'https://www.google.com/maps/search/?api=1&query=Monti+Rome'},
    {time:'12:00–12:20 PM',title:'Walk to the Colosseum',note:'Head to Piazza del Colosseo with enough margin to be in the entrance area before the required arrival time.',map:'https://www.google.com/maps/dir/?api=1&origin=Monti+Rome&destination=Colosseum+Rome'},
    {time:'12:30 PM',title:'⏰ REQUIRED Colosseum arrival',note:'Arrive 30 minutes before the booked time. Bring the ticket/QR code and matching photo ID. The ticket prohibits backpacks, suitcases and trolleys; do not bring glass bottles. After entry, immediately reach the Underground meeting point.',status:'Booked',map:'https://www.google.com/maps/search/?api=1&query=Colosseum+Rome'},
    {time:'1:00 PM',title:'🏟️ Colosseum — Full Experience Underground & Arena',note:'Booked premium Full Experience ticket. Includes Underground, Arena, first level and second level. The Colosseum portion is tied to the 1:00 PM reservation and is allotted approximately 90 minutes.',status:'Booked',map:'https://www.google.com/maps/search/?api=1&query=Colosseum+Rome'},
    {time:'~2:45–5:20 PM',title:'Roman Forum + Palatine Hill',note:'Use the Forum/Palatine entry included with the Full Experience ticket. Prioritize the Roman Forum first, then Palatine Hill and viewpoints; do not try to exhaust every SUPER site.',map:'https://www.google.com/maps/search/?api=1&query=Roman+Forum+Rome'},
    {time:'~5:45–6:30 PM',title:'Hotel break',note:'Return to Temple View GuestHouse to shower, change, charge your phone and rest your feet.',map:'https://www.google.com/maps/search/?api=1&query=Temple+View+GuestHouse+Rome'},
    {time:'~6:30–7:10 PM',title:'Quick dinner / aperitivo',note:'Keep this flexible and efficient so the route to Termini stays easy. Use the Rome Food Companion rather than forcing a destination restaurant.'},
    {time:'~7:50 PM',title:'Arrive at Big Bus Stop #1 — Termini',note:'Aim to be at Termini Railway Station roughly 30 minutes before the night-tour departure.',map:'https://www.google.com/maps/search/?api=1&query=Roma+Termini+Railway+Station'},
    {time:'8:20 PM',title:'🌙 Big Bus Rome Panoramic Night Tour',note:'Booked non-stop panoramic night tour of illuminated Rome. Approximately 1 hour.',status:'Booked'},
    {time:'~9:20 PM onward',title:'Free evening',note:'Nothing else scheduled. Get gelato or a drink, have a later meal if genuinely hungry, or return to the hotel.'}
  ]);

  setDay('2026-09-22', 'Vatican City, St. Peter’s and Castel Sant’Angelo', [
    {time:'9:00 AM',title:'Vatican Museums and Sistine Chapel',note:'Timed entry. Arrive early for security and entrance procedures.',status:'Booked',map:'https://www.google.com/maps/search/?api=1&query=Vatican+Museums'},
    {time:'Lunch',title:'Lunch near the Vatican',note:'Keep timing controlled so you can comfortably reach the 1:30 PM St. Peter’s reservation. Use the Rome Food Companion rather than forcing a long meal.'},
    {time:'1:30 PM',title:'St. Peter’s Basilica with lift to the Dome',note:'Booked lift-access ticket. The lift reduces but does not eliminate the remaining stair climb.',status:'Booked',map:'https://www.google.com/maps/search/?api=1&query=St+Peter%27s+Basilica'},
    {time:'Afternoon',title:'St. Peter’s Square',note:'Spend time in the square after the basilica and dome.',map:'https://www.google.com/maps/search/?api=1&query=St+Peter%27s+Square+Rome'},
    {time:'Afternoon',title:'Castel Sant’Angelo + Ponte Sant’Angelo',note:'Walk east from the Vatican toward the river and the angel-lined bridge.',map:'https://www.google.com/maps/dir/?api=1&origin=St+Peter%27s+Square&destination=Ponte+Sant%27Angelo&waypoints=Castel+Sant%27Angelo'},
    {time:'Evening',title:'Flexible Rome evening',note:'No scheduled Trastevere repeat after the Sept. 20 food tour. Keep dinner and the rest of the evening open based on energy and appetite.'}
  ]);

  setDay('2026-09-23', 'North-Central Rome, Jewish Ghetto and Aventine', [
    {time:'8:30 AM',title:'Breakfast',note:'Relaxed breakfast near the hotel.'},
    {time:'9:00 AM',title:'Ride to Piazza del Popolo',note:'Take a short taxi or public-transport ride to the northernmost point of today’s route.',map:'https://www.google.com/maps/search/?api=1&query=Piazza+del+Popolo+Rome'},
    {time:'9:15–9:45 AM',title:'Piazza del Popolo',note:'Explore the piazza, fountains, churches and obelisk.',map:'https://www.google.com/maps/search/?api=1&query=Piazza+del+Popolo+Rome'},
    {time:'9:45–10:15 AM',title:'Pincian Terrace',note:'Walk up to Terrazza del Pincio for panoramic views.',map:'https://www.google.com/maps/search/?api=1&query=Terrazza+del+Pincio+Rome'},
    {time:'10:15–10:45 AM',title:'Optional Villa Borghese edge walk',note:'Take a short scenic walk along the southern edge of Villa Borghese while continuing toward Piazza di Spagna.',map:'https://www.google.com/maps/search/?api=1&query=Villa+Borghese+Rome'},
    {time:'10:45–11:15 AM',title:'Spanish Steps',note:'Explore Piazza di Spagna, the Spanish Steps and the Barcaccia fountain.',map:'https://www.google.com/maps/search/?api=1&query=Spanish+Steps+Rome'},
    {time:'11:15–11:35 AM',title:'🥂 Complimentary Proseccos at Angie’s',note:'Redeem the 2 complimentary glasses of Prosecco included with the Big Bus booking at Angie’s Restaurant, Piazza Mignanelli 21a. Treat this as a quick stop, not a meal.',status:'Booked',map:'https://www.google.com/maps/search/?api=1&query=Angie%27s+Restaurant+Piazza+Mignanelli+21a+Rome'},
    {time:'12:00–12:30 PM',title:'Trevi Fountain',note:'Continue south-east to Trevi Fountain.',map:'https://www.google.com/maps/search/?api=1&query=Trevi+Fountain+Rome'},
    {time:'12:45–1:45 PM',title:'Proper lunch',note:'Choose from the Rome Food Companion based on location, hunger, reservation availability and what you have already eaten.'},
    {time:'2:00–2:30 PM',title:'Campo de’ Fiori',note:'Walk south toward Campo de’ Fiori and explore the square and surrounding streets.',map:'https://www.google.com/maps/search/?api=1&query=Campo+de%27+Fiori+Rome'},
    {time:'2:40–3:20 PM',title:'Jewish Ghetto',note:'Explore the neighborhood, including Piazza Mattei and the Turtle Fountain area.',map:'https://www.google.com/maps/search/?api=1&query=Jewish+Ghetto+Rome'},
    {time:'~3:25–3:40 PM',title:'Tiber Island pass-through',note:'Cross Tiber Island briefly on the way south. You will already have experienced the island during the Sept. 20 food tour.',map:'https://www.google.com/maps/search/?api=1&query=Tiber+Island+Rome'},
    {time:'4:00–4:30 PM',title:'Orange Garden',note:'Visit Giardino degli Aranci for panoramic views over Rome.',map:'https://www.google.com/maps/search/?api=1&query=Giardino+degli+Aranci+Rome'},
    {time:'4:35–4:50 PM',title:'Aventine Keyhole',note:'See the famous framed view toward St. Peter’s Basilica.',map:'https://www.google.com/maps/search/?api=1&query=Aventine+Keyhole+Rome'},
    {time:'5:00–6:00 PM',title:'Flexible break / transition',note:'Coffee, rest, photos or relaxed wandering. No need to force sunset timing at the Aventine.'},
    {time:'Evening',title:'Farewell dinner in Rome',note:'Choose a memorable final dinner using the Rome Food Companion. Keep timing flexible and avoid forcing a return to Trastevere unless that is what you want.'}
  ]);
})();
