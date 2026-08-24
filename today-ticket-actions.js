(() => {
  if (typeof window.getImportedTickets !== "function") return;

  let scheduled = false;
  let runToken = 0;
  function ensureStyles() {
    if (document.getElementById("today-ticket-actions-styles")) return;
    const style = document.createElement("style");
    style.id = "today-ticket-actions-styles";
    style.textContent = `
      .today-schedule-ticket{border:0;background:transparent;color:var(--accent);font:inherit;font-size:12px;font-weight:850;padding:0;cursor:pointer}
    `;
    document.head.appendChild(style);
  }

  function selectedDay() {
    const date = document.querySelector("#todayDaySelect")?.value;
    return (window.TRIP_DATA || []).find(day => day.date === date) || null;
  }

  async function attachmentMap() {
    const tickets = await window.getImportedTickets();
    const map = new Map();
    tickets.forEach(ticket => {
      if (!ticket.linkedWalletKey) return;
      if (!map.has(ticket.linkedWalletKey)) map.set(ticket.linkedWalletKey, []);
      map.get(ticket.linkedWalletKey).push(ticket);
    });
    return map;
  }

  async function openDirectTicket(id) {
    if (typeof window.openImportedTicket === "function") {
      window.openImportedTicket(id);
      return;
    }
    const popup = window.open("", "_blank");
    try {
      const ticket = await window.getImportedTicket(id);
      if (!ticket?.blob) throw new Error("Ticket not found");
      const url = URL.createObjectURL(ticket.blob);
      if (popup) popup.location = url;
      else window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch (error) {
      if (popup) popup.close();
      alert("This ticket could not be opened.");
    }
  }

  function decorateSchedule(map) {
    const day = selectedDay();
    const rows = [...document.querySelectorAll("#home .today-event")];
    if (!day || typeof window.findWalletMatchForEvent !== "function") return;

    rows.forEach((row, index) => {
      const event = day.events?.[index];
      const actions = row.querySelector(".today-event-actions");
      if (!event || !actions) return;

      const match = window.findWalletMatchForEvent(day, event);
      const files = match?.key ? (map.get(match.key) || []) : [];
      let button = row.querySelector(".today-schedule-ticket");

      if (!files.length) {
        button?.remove();
        return;
      }

      const label = files.length === 1 ? "Ticket" : `Tickets (${files.length})`;
      const signature = files.map(file => file.id).join("|");
      if (button && button.dataset.ticketSignature === signature) {
        button.textContent = label;
        return;
      }

      button?.remove();
      button = document.createElement("button");
      button.type = "button";
      button.className = "today-schedule-ticket";
      button.textContent = label;
      button.dataset.ticketSignature = signature;
      button.setAttribute("aria-label", files.length === 1 ? `Open ticket for ${event.title}` : `Open ${files.length} tickets for ${event.title}`);

      if (files.length === 1) {
        button.addEventListener("click", () => openDirectTicket(files[0].id));
      } else {
        button.addEventListener("click", () => {
          if (typeof window.openWalletForEvent === "function") window.openWalletForEvent(day, event);
          else if (typeof window.showView === "function") window.showView("wallet");
        });
      }
      actions.appendChild(button);
    });
  }

  async function run() {
    scheduled = false;
    const token = ++runToken;
    ensureStyles();
    try {
      const map = await attachmentMap();
      if (token !== runToken) return;
      decorateSchedule(map);
    } catch (error) {
      console.error("Unable to add Today ticket shortcuts", error);
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(run);
  }

  document.addEventListener("italy:home-rendered",schedule);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") schedule();
  });
  window.addEventListener("focus", schedule);
  schedule();
})();
