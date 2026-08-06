(() => {
  const STORAGE_PREFIX = "italy2026-navigation-v1-";
  const validViews = new Set([...document.querySelectorAll(".view")].map(view => view.id));
  const primaryTabs = new Set(["home", "trip", "wallet", "guide", "more"]);
  const parentTabs = {
    route: "trip",
    bookings: "more",
    packing: "more",
    notes: "more",
    currency: "more",
    transport: "more"
  };

  const read = (key, fallback = "") => {
    try {
      const value = localStorage.getItem(STORAGE_PREFIX + key);
      return value === null ? fallback : value;
    } catch {
      return fallback;
    }
  };
  const write = (key, value) => {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, String(value));
    } catch {}
  };
  const remove = key => {
    try {
      localStorage.removeItem(STORAGE_PREFIX + key);
    } catch {}
  };

  const currentView = () => document.querySelector(".view:not(.hidden)")?.id || "home";
  const tabForView = view => primaryTabs.has(view) ? view : (parentTabs[view] || "home");

  function saveGuideSelections() {
    const section = document.querySelector("[data-guide-section].active")?.dataset.guideSection;
    const city = document.querySelector("[data-guide-city].active")?.dataset.guideCity;
    const nearbyCity = document.querySelector("[data-nearby-city].active")?.dataset.nearbyCity;
    const nearbyFilter = document.querySelector("[data-nearby-filter].active")?.dataset.nearbyFilter;
    if (section) write("guide-section", section);
    if (city) write("guide-city", city);
    if (nearbyCity) write("nearby-city", nearbyCity);
    if (nearbyFilter) write("nearby-filter", nearbyFilter);
  }

  function saveTripSelections() {
    const filter = document.querySelector("[data-city-filter].active")?.dataset.cityFilter;
    const openCard = document.querySelector("#tripCards .day-card.open");
    const date = openCard?.querySelector("[data-route-date]")?.dataset.routeDate;
    if (filter) write("trip-filter", filter);
    if (date) write("trip-day", date);
  }

  function saveCurrentPosition() {
    const view = currentView();
    write(`scroll-${view}`, Math.max(0, Math.round(window.scrollY)));
    write("last-view", view);
    if (view === "guide") saveGuideSelections();
    if (view === "trip") saveTripSelections();
  }

  let restoringScroll = false;
  function restoreScroll(view) {
    const saved = Number(read(`scroll-${view}`, "0"));
    const top = Number.isFinite(saved) && saved > 0 ? saved : 0;
    restoringScroll = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top, left: 0, behavior: "auto" });
        setTimeout(() => {
          window.scrollTo({ top, left: 0, behavior: "auto" });
          restoringScroll = false;
        }, 80);
      });
    });
  }

  function syncPrimaryTab(view) {
    const target = tabForView(view);
    document.querySelectorAll(".tab").forEach(tab => {
      tab.classList.toggle("active", tab.dataset.target === target);
    });
  }

  function clickSavedButton(selector, dataName, value) {
    if (!value) return;
    const button = [...document.querySelectorAll(selector)]
      .find(item => item.dataset[dataName] === value);
    if (button && !button.classList.contains("active")) button.click();
  }

  function restoreGuideState() {
    clickSavedButton("[data-guide-city]", "guideCity", read("guide-city", "All"));
    clickSavedButton("[data-nearby-city]", "nearbyCity", read("nearby-city", "Venice"));
    clickSavedButton("[data-nearby-filter]", "nearbyFilter", read("nearby-filter", "All"));
    clickSavedButton("[data-nearby-source]", "nearbySource", read("nearby-source", "hotel"));
    clickSavedButton("[data-guide-section]", "guideSection", read("guide-section", "places"));
  }

  function restoreTripState() {
    clickSavedButton("[data-city-filter]", "cityFilter", read("trip-filter", "All"));
    const date = read("trip-day", "");
    if (!date) return;
    const cards = [...document.querySelectorAll("#tripCards .day-card")];
    const target = cards.find(card => card.querySelector(`[data-route-date="${CSS.escape(date)}"]`));
    if (!target) return;
    cards.forEach(card => card.classList.toggle("open", card === target));
  }

  const originalShowView = window.showView;
  if (typeof originalShowView !== "function") return;

  let handlingHistory = false;
  window.showView = function showViewWithMemory(target, updateTab = true) {
    if (!validViews.has(target)) return;
    const previous = currentView();
    if (previous !== target) saveCurrentPosition();

    originalShowView(target, updateTab);
    syncPrimaryTab(target);
    write("last-view", target);

    if (!handlingHistory && previous !== target) {
      history.pushState({ italyView: target }, "");
    }
    restoreScroll(target);
  };

  document.addEventListener("click", event => {
    const section = event.target.closest("[data-guide-section]");
    if (section) write("guide-section", section.dataset.guideSection);

    const city = event.target.closest("[data-guide-city]");
    if (city) write("guide-city", city.dataset.guideCity);

    const nearbyCity = event.target.closest("[data-nearby-city]");
    if (nearbyCity) write("nearby-city", nearbyCity.dataset.nearbyCity);

    const nearbyFilter = event.target.closest("[data-nearby-filter]");
    if (nearbyFilter) write("nearby-filter", nearbyFilter.dataset.nearbyFilter);

    const nearbySource = event.target.closest("[data-nearby-source]");
    if (nearbySource) write("nearby-source", nearbySource.dataset.nearbySource);

    const nearbyView = event.target.closest("[data-nearby-view]");
    if (nearbyView) write("guide-section", "places");

    const tripFilter = event.target.closest("[data-city-filter]");
    if (tripFilter) write("trip-filter", tripFilter.dataset.cityFilter);

    const dayToggle = event.target.closest(".day-toggle");
    if (dayToggle) {
      setTimeout(() => {
        const card = dayToggle.closest(".day-card");
        const date = card?.querySelector("[data-route-date]")?.dataset.routeDate;
        if (card?.classList.contains("open") && date) write("trip-day", date);
        else if (date === read("trip-day", "")) remove("trip-day");
      }, 0);
    }
  });

  let scrollSaveTimer = 0;
  window.addEventListener("scroll", () => {
    if (restoringScroll) return;
    clearTimeout(scrollSaveTimer);
    scrollSaveTimer = setTimeout(saveCurrentPosition, 120);
  }, { passive: true });

  window.addEventListener("pagehide", saveCurrentPosition);
  window.addEventListener("beforeunload", saveCurrentPosition);

  window.addEventListener("popstate", event => {
    const target = event.state?.italyView;
    if (!validViews.has(target)) return;
    handlingHistory = true;
    window.showView(target, true);
    handlingHistory = false;
  });

  const tripObserver = document.querySelector("#trip");
  if (tripObserver) {
    new MutationObserver(() => setTimeout(restoreTripState, 0))
      .observe(tripObserver, { childList: true });
  }

  restoreGuideState();
  restoreTripState();

  const initialView = validViews.has(read("last-view", "")) ? read("last-view") : "home";
  history.replaceState({ italyView: initialView }, "");
  handlingHistory = true;
  if (currentView() !== initialView) window.showView(initialView, true);
  else {
    syncPrimaryTab(initialView);
    restoreScroll(initialView);
  }
  handlingHistory = false;
})();
