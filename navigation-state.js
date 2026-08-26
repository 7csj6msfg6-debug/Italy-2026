(() => {
  const STORAGE_PREFIX = "italy2026-navigation-v2-";
  const views = [...document.querySelectorAll(".view")];
  const validViews = new Set(views.map(view => view.id));
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

  function savePosition(view = currentView(), top = window.scrollY) {
    write(`scroll-${view}`, Math.max(0, Math.round(top)));
    write("last-view", view);
    if (view === "guide") saveGuideSelections();
    if (view === "trip") saveTripSelections();
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

  let restoringScroll = false;
  let restoreToken = 0;
  function restoreScroll(view) {
    const saved = Number(read(`scroll-${view}`, "0"));
    const top = Number.isFinite(saved) && saved > 0 ? saved : 0;
    const token = ++restoreToken;
    restoringScroll = true;

    [0, 60, 160, 320, 550].forEach((delay, index, list) => {
      setTimeout(() => {
        if (token !== restoreToken || currentView() !== view) return;
        window.scrollTo({ top, left: 0, behavior: "auto" });
        if (index === list.length - 1) restoringScroll = false;
      }, delay);
    });
  }

  function cancelScrollRestore() {
    restoreToken++;
    restoringScroll = false;
  }
  window.cancelNavigationScrollRestore = cancelScrollRestore;

  function restoreView(view) {
    if (view === "guide") restoreGuideState();
    if (view === "trip") restoreTripState();
    syncPrimaryTab(view);
    write("last-view", view);
    restoreScroll(view);
  }

  let scrollSaveTimer = 0;
  window.addEventListener("scroll", () => {
    if (restoringScroll) return;
    const view = currentView();
    const top = window.scrollY;
    clearTimeout(scrollSaveTimer);
    scrollSaveTimer = setTimeout(() => savePosition(view, top), 100);
  }, { passive: true });

  document.addEventListener("pointerdown", event => {
    const navigation = event.target.closest(".tab, [data-jump], [data-open], [data-back]");
    if (!navigation) return;
    clearTimeout(scrollSaveTimer);
    savePosition(currentView(), window.scrollY);
    restoringScroll = true;
  }, true);

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

  let lastVisibleView = currentView();
  const viewObserver = new MutationObserver(() => {
    const visible = currentView();
    if (visible === lastVisibleView) return;
    lastVisibleView = visible;
    restoreView(visible);
  });
  views.forEach(view => viewObserver.observe(view, { attributes: true, attributeFilter: ["class"] }));

  const tripHost = document.querySelector("#trip");
  if (tripHost) {
    new MutationObserver(() => {
      if (currentView() === "trip") {
        restoreTripState();
        restoreScroll("trip");
      }
    }).observe(tripHost, { childList: true });
  }

  window.addEventListener("pagehide", () => savePosition(currentView(), window.scrollY));
  window.addEventListener("beforeunload", () => savePosition(currentView(), window.scrollY));

  const originalShowView = window.showView;
  if (typeof originalShowView === "function") {
    let handlingHistory = false;
    window.showView = function showViewWithHistory(target, updateTab = true) {
      if (!validViews.has(target)) return;
      const previous = currentView();
      if (previous !== target) {
        clearTimeout(scrollSaveTimer);
        savePosition(previous, window.scrollY);
        restoringScroll = true;
      }
      originalShowView(target, updateTab);
      syncPrimaryTab(target);
      if (!handlingHistory && previous !== target) history.pushState({ italyView: target }, "");
    };

    window.addEventListener("popstate", event => {
      const target = event.state?.italyView;
      if (!validViews.has(target)) return;
      handlingHistory = true;
      window.showView(target, true);
      handlingHistory = false;
    });
  }

  restoreGuideState();
  restoreTripState();

  const savedView = read("last-view", "home");
  const initialView = validViews.has(savedView) ? savedView : "home";
  const visibleAtLaunch = currentView();

  // Seed browser history with the restored destination before changing views.
  // Suppress pushState during this one-time restoration so reopening the app
  // never creates two identical history entries for the same screen.
  history.replaceState({ italyView: initialView }, "");
  if (visibleAtLaunch !== initialView && typeof window.showView === "function") {
    const previousHandlingHistory = handlingHistory;
    handlingHistory = true;
    window.showView(initialView, true);
    handlingHistory = previousHandlingHistory;
  } else {
    restoreView(initialView);
  }
})();
