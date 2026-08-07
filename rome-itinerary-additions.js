(() => {
  const trip = window.TRIP_DATA;
  if (!Array.isArray(trip)) return;

  const addEventOnce = (date, event, beforeTitle = null) => {
    const day = trip.find(item => item.date === date);
    if (!day || !Array.isArray(day.events)) return;
    if (day.events.some(item => item.title === event.title)) return;
    if (beforeTitle) {
      const index = day.events.findIndex(item => item.title === beforeTitle);
      if (index >= 0) {
        day.events.splice(index, 0, event);
        return;
      }
    }
    day.events.push(event);
  };

  addEventOnce("2026-09-20", {
    time: "Late afternoon / early evening",
    title: "🥂 Complimentary Proseccos at Angie’s",
    note: "Stop at Angie’s Restaurant, Piazza Mignanelli 21a near Piazza di Spagna. Your Big Bus booking includes 2 complimentary glasses of Prosecco total (one per ticket), redeemable from 10:00 AM–10:00 PM. This is a quick aperitivo stop; keep your Rome Food Companion meal plans separate.",
    status: "Booked",
    map: "https://www.google.com/maps/search/?api=1&query=Angie%27s+Restaurant+Piazza+Mignanelli+21a+Rome"
  }, "Dinner and Trevi Fountain at night");

  addEventOnce("2026-09-21", {
    time: "8:00 PM",
    title: "Arrive at Big Bus Stop #1 — Termini",
    note: "Head to Bus Stop #1 at Termini Railway Station and aim to arrive about 20 minutes before departure.",
    map: "https://www.google.com/maps/search/?api=1&query=Roma+Termini+Railway+Station"
  });

  addEventOnce("2026-09-21", {
    time: "8:20 PM",
    title: "🌙 Big Bus Rome Panoramic Night Tour",
    note: "Booked non-stop panoramic night tour of illuminated Rome. Approximately 1 hour.",
    status: "Booked"
  });
})();
