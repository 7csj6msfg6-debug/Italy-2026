(() => {
  const fallbackParents = {
    route: "trip",
    bookings: "more",
    packing: "more",
    notes: "more",
    currency: "more",
    transport: "more"
  };

  // Mark the history entry the app was launched/restored into. Entries created
  // later by navigation-state.js do not carry this marker, so internal Back/Done
  // controls can distinguish a real in-app history entry from the launch entry.
  history.replaceState({ ...(history.state || {}), italyLaunchEntry: true }, "");

  document.addEventListener("click", event => {
    const control = event.target.closest("[data-back], #closeRoute");
    if (!control) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (!history.state?.italyLaunchEntry) {
      history.back();
      return;
    }

    // If the app was reopened directly on a child screen there is no earlier
    // in-app history entry to return to, so use the control's normal parent.
    const current = document.querySelector(".view:not(.hidden)")?.id || "home";
    const fallback = control.dataset.back || fallbackParents[current] || "home";
    if (typeof window.showView === "function") window.showView(fallback, true);
  }, true);
})();
