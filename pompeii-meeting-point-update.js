(() => {
  const wallet = window.TICKET_WALLET || [];
  const tours = wallet.find(group => group.group === 'Tours');
  if (!tours?.items) return;

  const item = tours.items.find(candidate => candidate.title === 'Pompeii & Mount Vesuvius');
  if (!item) return;

  item.map = 'https://www.google.com/maps/search/Via+Medina,+70,+80133+Napoli+NA?entry=gmail&source=g';
  item.mapLabel = 'Meeting point';
  item.details = item.details
    ? `${item.details} · Meeting point: Via Medina 70, Naples`
    : 'Meeting point: Via Medina 70, Naples';
})();
