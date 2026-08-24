(() => {
  if (typeof window.renderWallet !== "function" || typeof window.getImportedTickets !== "function") return;

  let decorating = false;

  function ensureStyles() {
    if (document.getElementById("wallet-reliability-styles")) return;
    const style = document.createElement("style");
    style.id = "wallet-reliability-styles";
    style.textContent = `
      .wallet-recovery-note{margin:12px 0;padding:12px 14px;border:1px solid var(--line);border-radius:14px;background:var(--card)}
      .wallet-recovery-note strong{display:block;font-size:13px}.wallet-recovery-note small{display:block;margin-top:3px;color:var(--muted);line-height:1.35}
      .wallet-recovered-group{margin-top:14px}
      .wallet-recovered-card{margin-top:10px}
      .wallet-db-warning{margin:12px 0;padding:12px 14px;border:1px solid var(--line);border-radius:14px;background:var(--card)}
      .wallet-db-warning strong{display:block;font-size:13px}.wallet-db-warning small{display:block;margin-top:3px;color:var(--muted);line-height:1.35}
    `;
    document.head.appendChild(style);
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
  }

  function formatSize(bytes) {
    const n = Number(bytes) || 0;
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
  }

  function validWalletKeys() {
    const keys = new Set();
    const groups = window.TICKET_WALLET || [];
    if (typeof window.walletItemKey !== "function") return keys;
    groups.forEach(group => (group.items || []).forEach(item => keys.add(window.walletItemKey(group.group, item))));
    return keys;
  }

  async function openRecoveredTicket(id) {
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
      alert("This saved ticket could not be opened. The file may no longer be available on this device.");
    }
  }

  async function deleteRecoveredTicket(id, button) {
    if (!confirm("Delete this recovered ticket from this device?")) return;
    try {
      button.disabled = true;
      button.textContent = "Deleting…";
      if (typeof window.deleteImportedTicket !== "function") throw new Error("Ticket deletion unavailable");
      await window.deleteImportedTicket(id);
      await window.renderWallet();
    } catch (error) {
      button.disabled = false;
      button.textContent = "Delete";
      alert("This ticket could not be deleted. Try again after reopening the app.");
    }
  }

  function recoveredCard(ticket) {
    return `<article class="wallet-item wallet-document-card wallet-recovered-card" data-wallet-item data-category="${escapeHTML(ticket.category || "Other")}" data-search="${escapeHTML(((ticket.name || "") + " " + (ticket.fileName || "") + " recovered").toLowerCase())}">
      <div class="wallet-card-main">
        <div class="wallet-card-icon">📄</div>
        <div class="wallet-card-copy"><div class="wallet-title">${escapeHTML(ticket.name || ticket.fileName || "Recovered ticket")}</div><div class="wallet-meta">Recovered local attachment</div></div>
        <span class="wallet-status ready">Offline</span>
      </div>
      <div class="wallet-file-meta">${escapeHTML(ticket.fileName || "Saved file")} · ${formatSize(ticket.size)}</div>
      <div class="wallet-actions"><button class="primary wallet-file-button" data-recovered-open="${ticket.id}">Open ticket</button><button class="secondary wallet-file-button danger-text" data-recovered-delete="${ticket.id}">Delete</button></div>
    </article>`;
  }

  async function decorateWalletReliability() {
    if (decorating) return;
    const wallet = document.getElementById("wallet");
    const content = document.getElementById("walletContent");
    if (!wallet || !content) return;
    decorating = true;
    ensureStyles();
    wallet.querySelectorAll(".wallet-recovered-group,.wallet-db-warning").forEach(node => node.remove());

    try {
      const imported = await window.getImportedTickets();
      const keys = validWalletKeys();
      const recovered = imported.filter(ticket => ticket.linkedWalletKey && !keys.has(ticket.linkedWalletKey));
      if (recovered.length) {
        const section = document.createElement("section");
        section.className = "wallet-group wallet-recovered-group";
        section.innerHTML = `<div class="wallet-recovery-note"><strong>Recovered files · ${recovered.length}</strong><small>These files are still safely stored on this iPhone, but their original reservation changed or no longer matches. They are shown here so nothing disappears from your Wallet.</small></div>${recovered.map(recoveredCard).join("")}`;
        content.prepend(section);
        section.querySelectorAll("[data-recovered-open]").forEach(button => button.addEventListener("click", () => openRecoveredTicket(button.dataset.recoveredOpen)));
        section.querySelectorAll("[data-recovered-delete]").forEach(button => button.addEventListener("click", () => deleteRecoveredTicket(button.dataset.recoveredDelete, button)));
      }
    } catch (error) {
      const warning = document.createElement("div");
      warning.className = "wallet-db-warning";
      warning.innerHTML = `<strong>Private Wallet temporarily unavailable</strong><small>Your reservation list is still here, but locally saved attachments could not be read. Reopen the app before adding or deleting files.</small>`;
      content.prepend(warning);
    } finally {
      decorating = false;
    }
  }

  document.addEventListener("italy:wallet-rendered",()=>requestAnimationFrame(decorateWalletReliability));

  const wallet = document.getElementById("wallet");
  if (wallet) {
    new MutationObserver(() => {
      if (!wallet.classList.contains("hidden")) requestAnimationFrame(decorateWalletReliability);
    }).observe(wallet, { attributes: true, attributeFilter: ["class"] });
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !document.getElementById("wallet")?.classList.contains("hidden")) requestAnimationFrame(decorateWalletReliability);
  });
})();
