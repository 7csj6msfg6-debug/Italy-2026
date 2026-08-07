(() => {
  if (typeof window.getImportedTickets !== "function") return;

  let scheduled = false;
  let runToken = 0;

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
        map.set(ticket.linkedWalletKey, (map.get(ticket.linkedWalletKey) || 0) + 1);
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
      const count = map.get(key) || 0;
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
      status.textContent = count > 0
        ? `Ticket attached ✓${count > 1 ? ` · ${count} files` : ""}`
        : "No private ticket";
    });
  }

  function selectedDay() {
    const date = document.querySelector("#todayDaySelect")?.value;
    return (window.TRIP_DATA || []).find(day => day.date === date) || null;
  }

  function decorateToday(map) {
    const button = document.querySelector("#home [data-home-wallet]");
    document.querySelectorAll("#home .today-ticket-confidence").forEach(node => node.remove());
    if (!button) return;

    const day = selectedDay();
    const index = Number(button.dataset.homeWallet);
    const event = day?.events?.[index];
    if (!day || !event || typeof window.findWalletMatchForEvent !== "function") {
      button.textContent = "Open Wallet";
      return;
    }

    const match = window.findWalletMatchForEvent(day, event);
    const hasAttachment = Boolean(match?.key && map.get(match.key));
    button.textContent = hasAttachment ? "Open ticket" : "Open Wallet";

    const actions = button.closest(".today-primary-actions");
    if (!actions || !match) return;
    const note = document.createElement("div");
    note.className = "today-ticket-confidence";
    note.textContent = hasAttachment ? "Private ticket attached ✓" : "Reservation found · no private ticket attached";
    actions.insertAdjacentElement("afterend", note);
  }

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

  const wallet = document.getElementById("wallet");
  const home = document.getElementById("home");
  if (wallet) new MutationObserver(schedule).observe(wallet, { childList: true, subtree: true });
  if (home) new MutationObserver(schedule).observe(home, { childList: true, subtree: true });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") schedule();
  });
  window.addEventListener("focus", schedule);
  schedule();
})();
