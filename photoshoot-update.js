(() => {
  const DATE = '2026-09-23';
  const TITLE = '📸 Romantic Experience in Rome — Photo Tour';
  const WALLET_TITLE = 'Romantic Experience in Rome — Photo Tour';
  const MAP = 'https://www.google.com/maps/search/?api=1&query=Caff%C3%A8+Roma+00197+Roma+RM+Italia';
  const day = (window.TRIP_DATA || []).find(item => item.date === DATE);

  if (day) {
    // Keep every planned Sept. 23 stop, but shift the visual timeline around the fixed 9:00–10:00 AM photoshoot.
    day.title = 'North-Central Rome, Jewish Ghetto and Aventine';
    day.events = [
      {time:'8:00 AM',title:'Breakfast',note:'Have an earlier relaxed breakfast so you can reach the photoshoot meeting point without rushing.'},
      {time:'8:30 AM',title:'Ride to Caffè Roma',note:'Head to the photoshoot meeting point and aim to arrive by 8:50 AM.',map:MAP},
      {time:'9:00–10:00 AM',title:TITLE,note:'Booked private photo tour for 2 people, approximately 1 hour. Meet at Caffè Roma by 8:50 AM. PRINT the voucher: mobile tickets are not accepted. The activity ends at the starting point.',status:'Booked',map:MAP},
      {time:'10:00–10:15 AM',title:'Transition to Piazza del Popolo',note:'Continue to the northern sightseeing route after the photoshoot.',map:'https://www.google.com/maps/search/?api=1&query=Piazza+del+Popolo+Rome'},
      {time:'10:15–10:45 AM',title:'Piazza del Popolo',note:'Explore the piazza, fountains, churches and obelisk.',map:'https://www.google.com/maps/search/?api=1&query=Piazza+del+Popolo+Rome'},
      {time:'10:45–11:15 AM',title:'Pincian Terrace',note:'Walk up to Terrazza del Pincio for panoramic views.',map:'https://www.google.com/maps/search/?api=1&query=Terrazza+del+Pincio+Rome'},
      {time:'11:15–11:45 AM',title:'Optional Villa Borghese edge walk',note:'Take a short scenic walk along the southern edge of Villa Borghese while continuing toward Piazza di Spagna.',map:'https://www.google.com/maps/search/?api=1&query=Villa+Borghese+Rome'},
      {time:'11:45 AM–12:15 PM',title:'Spanish Steps',note:'Explore Piazza di Spagna, the Spanish Steps and the Barcaccia fountain.',map:'https://www.google.com/maps/search/?api=1&query=Spanish+Steps+Rome'},
      {time:'12:15–12:45 PM',title:'Walk toward Trevi / free central Rome time',note:'Use the walk for photos, shops or relaxed wandering through the center.'},
      {time:'12:45–1:15 PM',title:'Trevi Fountain',note:'Continue south-east to Trevi Fountain.',map:'https://www.google.com/maps/search/?api=1&query=Trevi+Fountain+Rome'},
      {time:'1:30–2:30 PM',title:'Proper lunch',note:'Choose from the Rome Food Companion based on location, hunger, reservation availability and what you have already eaten.'},
      {time:'2:45–3:15 PM',title:'Campo de’ Fiori',note:'Walk south toward Campo de’ Fiori and explore the square and surrounding streets.',map:'https://www.google.com/maps/search/?api=1&query=Campo+de%27+Fiori+Rome'},
      {time:'3:25–4:05 PM',title:'Jewish Ghetto',note:'Explore the neighborhood, including Piazza Mattei and the Turtle Fountain area.',map:'https://www.google.com/maps/search/?api=1&query=Jewish+Ghetto+Rome'},
      {time:'~4:10–4:25 PM',title:'Tiber Island pass-through',note:'Cross Tiber Island briefly on the way south. You will already have experienced the island during the Sept. 20 food tour.',map:'https://www.google.com/maps/search/?api=1&query=Tiber+Island+Rome'},
      {time:'4:45–5:15 PM',title:'Orange Garden',note:'Visit Giardino degli Aranci for panoramic views over Rome.',map:'https://www.google.com/maps/search/?api=1&query=Giardino+degli+Aranci+Rome'},
      {time:'5:20–5:35 PM',title:'Aventine Keyhole',note:'See the famous framed view toward St. Peter’s Basilica.',map:'https://www.google.com/maps/search/?api=1&query=Aventine+Keyhole+Rome'},
      {time:'5:35–6:30 PM',title:'Flexible break / transition',note:'Coffee, rest, photos or relaxed wandering before the final evening.'},
      {time:'Evening',title:'Farewell dinner in Rome',note:'Choose a memorable final dinner using the Rome Food Companion. Keep timing flexible.'}
    ];
  }

  const groups = window.TICKET_WALLET || [];
  let tours = groups.find(group => group.group === 'Tours');
  if (!tours) {
    tours = {group:'Tours', icon:'🍷', items:[]};
    groups.push(tours);
  }
  const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!tours.items.some(item => normalize(item.title) === normalize(WALLET_TITLE))) {
    tours.items.push({title:WALLET_TITLE,date:'Sep 23',time:'9:00 AM',status:'Ticket needed',details:'Booked · 2 people · 1 hour · Meet at Caffè Roma by 8:50 AM',note:'Upload your GetYourGuide voucher here. Print the voucher before the session: mobile tickets are not accepted.',map:MAP,mapLabel:'Meeting point'});
  }

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
