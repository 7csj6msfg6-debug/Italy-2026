(() => {
  if (typeof window.getImportedTickets !== "function") return;

  let scheduled = false;
  let runToken = 0;
  const originalRenderHome = window.renderHome;
  const originalRenderWallet = window.renderWallet;

  function ensureStyles() {
    if (document.getElementById("wallet-polish-styles")) return;
    const style = document.createElement("style");
    style.id = "wallet-polish-styles";
    style.textContent = `
      .wallet-attachment-status{display:inline-flex;align-items:center;gap:5px;margin-top:7px;padding:5px 8px;border-radius:999px;font-size:11px;font-weight:850;line-height:1.1}
      .wallet-attachment-status.attached{background:#e5f3eb;color:#17603f}
      .wallet-attachment-status.missing{background:#f1eee8;color:#6d675e}
      .today-ticket-confidence{font-size:11px;color:var(--muted);font-weight:750;margin-top:7px}
    `;
    document.head.appendChild(style);
  }

  async function attachmentMap() {
    try {
      const tickets = await window.getImportedTickets();
      const map = new Map();
      tickets.forEach(ticket => {
        if (!ticket.linkedWalletKey) return;
        if (!map.has(ticket.linkedWalletKey)) map.set(ticket.linkedWalletKey, []);
        map.get(ticket.linkedWalletKey).push(ticket);
      });
      return map;
    } catch (error) {
      console.error("Unable to read Wallet attachment status", error);
      return new Map();
    }
  }

  function decorateWallet(map) {
    document.querySelectorAll("#wallet [data-wallet-key]").forEach(card => {
      const key = card.dataset.walletKey;
      const count = map.get(key)?.length || 0;
      let status = card.querySelector(".wallet-attachment-status");
      if (!status) {
        status = document.createElement("span");
        status.className = "wallet-attachment-status";
        const copy = card.querySelector(".wallet-card-copy");
        if (copy) copy.appendChild(status);
      }
      if (!status) return;
      status.classList.toggle("attached", count > 0);
      status.classList.toggle("missing", count === 0);
      const label = count > 0
        ? `Ticket attached ✓${count > 1 ? ` · ${count} files` : ""}`
        : "No private ticket";
      if (status.textContent !== label) status.textContent = label;
    });
  }

  function selectedDay() {
    const date = document.querySelector("#todayDaySelect")?.value;
    return (window.TRIP_DATA || []).find(day => day.date === date) || null;
  }

  function decorateToday(map) {
    const button = document.querySelector("#home [data-home-wallet]");
    if (!button) return;

    delete button.dataset.directTicketId;
    const day = selectedDay();
    const index = Number(button.dataset.homeWallet);
    const event = day?.events?.[index];
    if (!day || !event || typeof window.findWalletMatchForEvent !== "function") {
      button.textContent = "Open Wallet";
      document.querySelector("#home .today-ticket-confidence")?.remove();
      return;
    }

    const match = window.findWalletMatchForEvent(day, event);
    const files = match?.key ? (map.get(match.key) || []) : [];
    const count = files.length;

    if (count === 1) {
      button.textContent = "Open ticket";
      button.dataset.directTicketId = files[0].id;
    } else if (count > 1) {
      button.textContent = "Open tickets";
    } else {
      button.textContent = "Open Wallet";
    }

    const actions = button.closest(".today-primary-actions");
    if (!actions || !match) {
      document.querySelector("#home .today-ticket-confidence")?.remove();
      return;
    }

    const label = count === 1
      ? "Private ticket attached ✓"
      : count > 1
        ? `${count} private tickets attached`
        : "Reservation found · no private ticket attached";
    let note = document.querySelector("#home .today-ticket-confidence");
    if (!note) {
      note = document.createElement("div");
      note.className = "today-ticket-confidence";
      actions.insertAdjacentElement("afterend", note);
    }
    if (note.textContent !== label) note.textContent = label;
  }

  async function openDirectTicket(id) {
    const popup = window.open("", "_blank");
    try {
      if (typeof window.getImportedTicket !== "function") throw new Error("Ticket reader unavailable");
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

  document.addEventListener("click", event => {
    const button = event.target.closest("#home [data-home-wallet][data-direct-ticket-id]");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openDirectTicket(button.dataset.directTicketId);
  }, true);

  async function run() {
    scheduled = false;
    const token = ++runToken;
    ensureStyles();
    const map = await attachmentMap();
    if (token !== runToken) return;
    decorateWallet(map);
    decorateToday(map);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(run);
  }

  if (typeof originalRenderHome === "function") {
    window.renderHome = function(...args) {
      const result = originalRenderHome.apply(this, args);
      schedule();
      return result;
    };
  }

  if (typeof originalRenderWallet === "function") {
    window.renderWallet = async function(...args) {
      const result = await originalRenderWallet.apply(this, args);
      schedule();
      return result;
    };
  }

  document.addEventListener("click", event => {
    if (event.target.closest('[data-target="home"], [data-target="wallet"], [data-jump="wallet"]')) {
      setTimeout(schedule, 0);
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") schedule();
  });
  window.addEventListener("focus", schedule);
  schedule();
})();
