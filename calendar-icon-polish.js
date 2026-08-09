(() => {
  const CALENDAR_EMOJI = "📅";
  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "NOSCRIPT"]);

  function ensureStyles() {
    if (document.getElementById("calendar-icon-polish-styles")) return;
    const style = document.createElement("style");
    style.id = "calendar-icon-polish-styles";
    style.textContent = `
      .app-calendar-icon{
        display:inline-block;
        width:1.15em;
        height:1.15em;
        flex:0 0 auto;
        vertical-align:-0.18em;
        color:var(--accent);
        fill:none;
        stroke:currentColor;
        stroke-width:1.8;
        stroke-linecap:round;
        stroke-linejoin:round;
      }
      .food-day-heading .app-calendar-icon{width:27px;height:27px;vertical-align:middle}
      #guideNearbySection .app-calendar-icon{width:18px;height:18px;vertical-align:-0.2em}
    `;
    document.head.appendChild(style);
  }

  function calendarIcon() {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.classList.add("app-calendar-icon");

    const rect = document.createElementNS(ns, "rect");
    rect.setAttribute("x", "3");
    rect.setAttribute("y", "5");
    rect.setAttribute("width", "18");
    rect.setAttribute("height", "16");
    rect.setAttribute("rx", "2.5");
    svg.appendChild(rect);

    ["M8 3v4", "M16 3v4", "M3 10h18"].forEach(d => {
      const path = document.createElementNS(ns, "path");
      path.setAttribute("d", d);
      svg.appendChild(path);
    });

    [[8,14],[12,14],[16,14],[8,18],[12,18],[16,18]].forEach(([cx,cy]) => {
      const dot = document.createElementNS(ns, "circle");
      dot.setAttribute("cx", String(cx));
      dot.setAttribute("cy", String(cy));
      dot.setAttribute("r", "0.8");
      dot.setAttribute("fill", "currentColor");
      dot.setAttribute("stroke", "none");
      svg.appendChild(dot);
    });

    return svg;
  }

  function replaceTextNode(node) {
    if (!node?.nodeValue?.includes(CALENDAR_EMOJI)) return;
    const parent = node.parentElement;
    if (!parent || SKIP_TAGS.has(parent.tagName)) return;

    const parts = node.nodeValue.split(CALENDAR_EMOJI);
    const fragment = document.createDocumentFragment();
    parts.forEach((part, index) => {
      if (index > 0) fragment.appendChild(calendarIcon());
      if (part) fragment.appendChild(document.createTextNode(part));
    });
    node.replaceWith(fragment);
  }

  function replaceIn(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      replaceTextNode(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const matches = [];
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue?.includes(CALENDAR_EMOJI) && !SKIP_TAGS.has(node.parentElement?.tagName)) matches.push(node);
    }
    matches.forEach(replaceTextNode);
  }

  ensureStyles();
  replaceIn(document.body);

  const observer = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(replaceIn));
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
