(() => {
  const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  function walletMatchForEvent(day, event) {
    const title = normalize(event.title);
    const dateLabel = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const groups = window.TICKET_WALLET || [];

    for (const group of groups) {
      for (const item of group.items || []) {
        if (item.status === 'To book' || item.status === 'Ticket needed') continue;
        if (item.date && normalize(item.date) !== normalize(dateLabel)) continue;
        const walletTitle = normalize(item.title);
        if (title === walletTitle || title.includes(walletTitle) || walletTitle.includes(title)) return { group, item };

        if (/colosseum/.test(title) && /colosseum/.test(walletTitle)) return { group, item };
        if (/roman forum|palatine/.test(title) && /colosseum.*forum.*palatine/.test(walletTitle)) return { group, item };
        if (/vatican museums/.test(title) && /vatican museums/.test(walletTitle)) return { group, item };
        if (/st peter/.test(title) && /st peter/.test(walletTitle)) return { group, item };
        if (/accademia/.test(title) && /accademia/.test(walletTitle)) return { group, item };
        if (/brunelleschi/.test(title) && /brunelleschi/.test(walletTitle)) return { group, item };
        if (/uffizi/.test(title) && /uffizi/.test(walletTitle)) return { group, item };
        if (/st mark|doge/.test(title) && /st mark|doge/.test(walletTitle)) return { group, item };
        if (/boat tour/.test(title) && /boat tour/.test(walletTitle)) return { group, item };
        if (/wine/.test(title) && /wine/.test(walletTitle)) return { group, item };
        if (/pompeii|vesuvius/.test(title) && /pompeii|vesuvius/.test(walletTitle)) return { group, item };
        if (/ferry/.test(title) && /capri/.test(walletTitle)) return { group, item };
      }
    }
    return null;
  }

  function decorateTrip() {
    const days = window.TRIP_DATA || [];
    document.querySelectorAll('#trip .day-card').forEach((card, dayIndex) => {
      const day = days[dayIndex];
      if (!day) return;
      card.querySelectorAll('.event').forEach((row, eventIndex) => {
        if (row.querySelector('[data-trip-ticket]')) return;
        const event = day.events[eventIndex];
        if (!event) return;
        const match = walletMatchForEvent(day, event);
        if (!match) return;
        const content = row.querySelector('.event-title')?.parentElement;
        if (!content) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'map-button';
        button.dataset.tripTicket = '1';
        button.textContent = 'Open Ticket';
        button.style.marginLeft = event.map ? '8px' : '0';
        button.addEventListener('click', () => openWalletItem(match.group.group, match.item.title));
        const map = content.querySelector('.map-button');
        if (map) map.insertAdjacentElement('afterend', button);
        else content.append(document.createElement('br'), button);
      });
    });
  }

  function openWalletItem(groupName, title) {
    if (typeof window.showView === 'function') window.showView('wallet');
    else document.querySelector('[data-target="wallet"]')?.click();

    setTimeout(() => {
      const wallet = document.getElementById('wallet');
      if (!wallet) return;
      const target = [...wallet.querySelectorAll('.wallet-item, .ticket-item, article, .info-card')].find(el => normalize(el.textContent).includes(normalize(title)));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.classList.add('trip-ticket-target');
        setTimeout(() => target.classList.remove('trip-ticket-target'), 2200);
      } else {
        wallet.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 80);
  }

  const style = document.createElement('style');
  style.textContent = '.trip-ticket-target{box-shadow:0 0 0 3px rgba(20,63,49,.22),var(--shadow)!important;transition:box-shadow .25s ease}';
  document.head.appendChild(style);

  const original = window.renderTrip;
  if (typeof original === 'function') {
    window.renderTrip = function(...args) {
      const result = original.apply(this, args);
      decorateTrip();
      return result;
    };
  }
  decorateTrip();
})();
