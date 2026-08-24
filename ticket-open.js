(() => {
  const PDFJS_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const isSamsungInternet = /SamsungBrowser\//i.test(navigator.userAgent || '');
  const routeFor = id => new URL(`./ticket-file/${encodeURIComponent(String(id))}`, document.baseURI).href;
  let pdfJsPromise = null;
  let viewer = null;
  let previousBodyOverflow = '';

  const state = {
    ticket: null,
    pdf: null,
    loadingTask: null,
    page: 1,
    zoom: 1,
    renderToken: 0,
    objectUrl: null
  };

  function fileName(ticket) {
    return ticket?.fileName || ticket?.name || 'Ticket';
  }

  function typeOf(ticket) {
    return String(ticket?.type || ticket?.blob?.type || '').toLowerCase();
  }

  function isPdf(ticket) {
    return typeOf(ticket).includes('pdf') || /\.pdf$/i.test(fileName(ticket));
  }

  function isImage(ticket) {
    return typeOf(ticket).startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(fileName(ticket));
  }

  function ensureViewerStyles() {
    if (document.getElementById('ticket-viewer-styles')) return;
    const style = document.createElement('style');
    style.id = 'ticket-viewer-styles';
    style.textContent = `
      .ticket-viewer{position:fixed;inset:0;z-index:10000;background:#f5f1e8;display:flex;flex-direction:column;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}
      .ticket-viewer[hidden]{display:none}
      .ticket-viewer-head{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid rgba(0,0,0,.12);background:#fff;min-height:52px}
      .ticket-viewer-title{min-width:0;flex:1;font-size:14px;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .ticket-viewer-btn{appearance:none;border:1px solid rgba(0,0,0,.14);background:#fff;border-radius:12px;padding:9px 12px;font:inherit;font-size:13px;font-weight:800;color:#173d31}
      .ticket-viewer-btn:disabled{opacity:.38}
      .ticket-viewer-stage{position:relative;flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;padding:14px;background:#dedbd3;text-align:center}
      .ticket-viewer-canvas{display:block;margin:0 auto;background:#fff;box-shadow:0 3px 18px rgba(0,0,0,.16)}
      .ticket-viewer-image{display:block;max-width:100%;height:auto;margin:0 auto;background:#fff;box-shadow:0 3px 18px rgba(0,0,0,.16)}
      .ticket-viewer-message{position:absolute;left:20px;right:20px;top:50%;transform:translateY(-50%);text-align:center;color:#5f5a52;font-size:14px;font-weight:700;line-height:1.45}
      .ticket-viewer-controls{display:flex;align-items:center;justify-content:center;gap:8px;padding:9px 10px;border-top:1px solid rgba(0,0,0,.12);background:#fff;min-height:52px}
      .ticket-viewer-page{min-width:86px;text-align:center;font-size:12px;font-weight:850;color:#5e5a54}
      .ticket-viewer-zoom{min-width:54px;text-align:center;font-size:12px;font-weight:850;color:#5e5a54}
      .ticket-viewer-spacer{width:1px;height:24px;background:rgba(0,0,0,.12);margin:0 2px}
      @media (max-width:430px){.ticket-viewer-head{gap:7px}.ticket-viewer-btn{padding:9px 10px}.ticket-viewer-stage{padding:10px}.ticket-viewer-page{min-width:72px}}
    `;
    document.head.appendChild(style);
  }

  function ensureViewer() {
    if (viewer) return viewer;
    ensureViewerStyles();
    const root = document.createElement('section');
    root.className = 'ticket-viewer';
    root.hidden = true;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Ticket viewer');
    root.innerHTML = `
      <div class="ticket-viewer-head">
        <button class="ticket-viewer-btn" data-tv-close>Close</button>
        <div class="ticket-viewer-title" data-tv-title>Ticket</div>
        <button class="ticket-viewer-btn" data-tv-share>Share</button>
        <button class="ticket-viewer-btn" data-tv-download>Download</button>
      </div>
      <div class="ticket-viewer-stage" data-tv-stage>
        <canvas class="ticket-viewer-canvas" data-tv-canvas hidden></canvas>
        <img class="ticket-viewer-image" data-tv-image alt="Ticket" hidden>
        <div class="ticket-viewer-message" data-tv-message>Loading ticket…</div>
      </div>
      <div class="ticket-viewer-controls" data-tv-controls>
        <button class="ticket-viewer-btn" data-tv-prev>‹</button>
        <div class="ticket-viewer-page" data-tv-page>Page 1 of 1</div>
        <button class="ticket-viewer-btn" data-tv-next>›</button>
        <span class="ticket-viewer-spacer" aria-hidden="true"></span>
        <button class="ticket-viewer-btn" data-tv-zoom-out>−</button>
        <div class="ticket-viewer-zoom" data-tv-zoom>100%</div>
        <button class="ticket-viewer-btn" data-tv-zoom-in>＋</button>
      </div>`;
    document.body.appendChild(root);

    viewer = {
      root,
      title: root.querySelector('[data-tv-title]'),
      stage: root.querySelector('[data-tv-stage]'),
      canvas: root.querySelector('[data-tv-canvas]'),
      image: root.querySelector('[data-tv-image]'),
      message: root.querySelector('[data-tv-message]'),
      controls: root.querySelector('[data-tv-controls]'),
      prev: root.querySelector('[data-tv-prev]'),
      next: root.querySelector('[data-tv-next]'),
      page: root.querySelector('[data-tv-page]'),
      zoomOut: root.querySelector('[data-tv-zoom-out]'),
      zoomIn: root.querySelector('[data-tv-zoom-in]'),
      zoom: root.querySelector('[data-tv-zoom]')
    };

    root.querySelector('[data-tv-close]').addEventListener('click', closeViewer);
    root.querySelector('[data-tv-share]').addEventListener('click', shareTicket);
    root.querySelector('[data-tv-download]').addEventListener('click', downloadTicket);
    viewer.prev.addEventListener('click', () => {
      if (!state.pdf || state.page <= 1) return;
      state.page -= 1;
      renderPdfPage();
    });
    viewer.next.addEventListener('click', () => {
      if (!state.pdf || state.page >= state.pdf.numPages) return;
      state.page += 1;
      renderPdfPage();
    });
    viewer.zoomOut.addEventListener('click', () => {
      if (!state.pdf) return;
      state.zoom = Math.max(.65, Math.round((state.zoom - .15) * 100) / 100);
      renderPdfPage();
    });
    viewer.zoomIn.addEventListener('click', () => {
      if (!state.pdf) return;
      state.zoom = Math.min(2, Math.round((state.zoom + .15) * 100) / 100);
      renderPdfPage();
    });
    return viewer;
  }

  function resetViewerMedia() {
    if (!viewer) return;
    viewer.canvas.hidden = true;
    viewer.image.hidden = true;
    viewer.image.removeAttribute('src');
    if (state.objectUrl) {
      URL.revokeObjectURL(state.objectUrl);
      state.objectUrl = null;
    }
  }

  function setViewerMessage(text) {
    ensureViewer();
    viewer.message.textContent = text;
    viewer.message.hidden = !text;
  }

  function updateControls() {
    if (!viewer) return;
    const pdfMode = Boolean(state.pdf);
    viewer.controls.hidden = !pdfMode;
    if (!pdfMode) return;
    viewer.page.textContent = `Page ${state.page} of ${state.pdf.numPages}`;
    viewer.zoom.textContent = `${Math.round(state.zoom * 100)}%`;
    viewer.prev.disabled = state.page <= 1;
    viewer.next.disabled = state.page >= state.pdf.numPages;
    viewer.zoomOut.disabled = state.zoom <= .65;
    viewer.zoomIn.disabled = state.zoom >= 2;
  }

  function loadPdfJs() {
    if (window.pdfjsLib?.getDocument) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      return Promise.resolve(window.pdfjsLib);
    }
    if (pdfJsPromise) return pdfJsPromise;
    pdfJsPromise = new Promise((resolve, reject) => {
      let script = document.querySelector('script[data-italy-pdfjs]');
      const finish = () => {
        if (!window.pdfjsLib?.getDocument) {
          reject(new Error('PDF viewer library unavailable'));
          return;
        }
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
        resolve(window.pdfjsLib);
      };
      if (script) {
        if (window.pdfjsLib?.getDocument) finish();
        else {
          script.addEventListener('load', finish, { once: true });
          script.addEventListener('error', () => reject(new Error('PDF viewer library unavailable')), { once: true });
        }
        return;
      }
      script = document.createElement('script');
      script.src = PDFJS_SRC;
      script.async = true;
      script.dataset.italyPdfjs = '1';
      script.addEventListener('load', finish, { once: true });
      script.addEventListener('error', () => reject(new Error('PDF viewer library unavailable')), { once: true });
      document.head.appendChild(script);
    }).catch(error => {
      pdfJsPromise = null;
      throw error;
    });
    return pdfJsPromise;
  }

  async function destroyPdf() {
    state.renderToken += 1;
    const task = state.loadingTask;
    const pdf = state.pdf;
    state.loadingTask = null;
    state.pdf = null;
    try { if (pdf?.destroy) await pdf.destroy(); } catch {}
    try { if (task?.destroy) await task.destroy(); } catch {}
  }

  function openViewerShell(ticket) {
    ensureViewer();
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    viewer.root.hidden = false;
    viewer.title.textContent = fileName(ticket);
    viewer.stage.scrollTop = 0;
    viewer.stage.scrollLeft = 0;
    resetViewerMedia();
    state.ticket = ticket;
    state.page = 1;
    state.zoom = 1;
    updateControls();
    setViewerMessage('Loading ticket…');
  }

  async function closeViewer() {
    if (!viewer || viewer.root.hidden) return;
    viewer.root.hidden = true;
    document.body.style.overflow = previousBodyOverflow;
    resetViewerMedia();
    await destroyPdf();
    state.ticket = null;
  }

  async function renderPdfPage() {
    if (!state.pdf || !viewer || viewer.root.hidden) return;
    const token = ++state.renderToken;
    setViewerMessage(`Rendering page ${state.page}…`);
    viewer.canvas.hidden = true;
    try {
      const page = await state.pdf.getPage(state.page);
      if (token !== state.renderToken || viewer.root.hidden) return;
      const initial = page.getViewport({ scale: 1 });
      const available = Math.max(260, viewer.stage.clientWidth - 24);
      const scale = Math.max(.2, (available / initial.width) * state.zoom);
      const viewport = page.getViewport({ scale });
      const outputScale = Math.min(window.devicePixelRatio || 1, 2);
      const canvas = viewer.canvas;
      const context = canvas.getContext('2d', { alpha: false });
      canvas.width = Math.max(1, Math.floor(viewport.width * outputScale));
      canvas.height = Math.max(1, Math.floor(viewport.height * outputScale));
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      await page.render({
        canvasContext: context,
        viewport,
        transform: outputScale === 1 ? null : [outputScale, 0, 0, outputScale, 0, 0]
      }).promise;
      if (token !== state.renderToken || viewer.root.hidden) return;
      canvas.hidden = false;
      setViewerMessage('');
      updateControls();
      viewer.stage.scrollTop = 0;
      viewer.stage.scrollLeft = Math.max(0, (canvas.offsetWidth - viewer.stage.clientWidth) / 2);
    } catch (error) {
      console.error('Unable to render ticket PDF', error);
      if (token !== state.renderToken) return;
      setViewerMessage('This PDF could not be rendered in the app. You can still use Share or Download above.');
    }
  }

  async function showPdf(ticket) {
    const pdfjs = await loadPdfJs();
    const bytes = new Uint8Array(await ticket.blob.arrayBuffer());
    const loadingTask = pdfjs.getDocument({ data: bytes });
    state.loadingTask = loadingTask;
    state.pdf = await loadingTask.promise;
    state.page = 1;
    state.zoom = 1;
    updateControls();
    await renderPdfPage();
  }

  function showImage(ticket) {
    state.objectUrl = URL.createObjectURL(ticket.blob);
    viewer.image.src = state.objectUrl;
    viewer.image.alt = fileName(ticket);
    viewer.image.hidden = false;
    viewer.controls.hidden = true;
    setViewerMessage('');
  }

  async function openSamsungTicket(id) {
    try {
      if (typeof window.getImportedTicket !== 'function') throw new Error('Ticket reader unavailable');
      const ticket = await window.getImportedTicket(id);
      if (!ticket?.blob) throw new Error('Ticket not found');
      openViewerShell(ticket);
      if (isPdf(ticket)) {
        await showPdf(ticket);
      } else if (isImage(ticket)) {
        showImage(ticket);
      } else {
        viewer.controls.hidden = true;
        setViewerMessage('This file type cannot be previewed inside the app. Use Share or Download above.');
      }
    } catch (error) {
      console.error('Unable to open ticket in app', error);
      if (viewer && !viewer.root.hidden) {
        viewer.controls.hidden = true;
        setViewerMessage('This ticket could not be opened.');
      } else {
        alert('This ticket could not be opened.');
      }
    }
  }

  function currentTicketFile() {
    const ticket = state.ticket;
    if (!ticket?.blob) return null;
    const name = fileName(ticket);
    const type = ticket.type || ticket.blob.type || 'application/octet-stream';
    try { return new File([ticket.blob], name, { type }); }
    catch { return null; }
  }

  function downloadTicket() {
    const ticket = state.ticket;
    if (!ticket?.blob) return;
    const url = URL.createObjectURL(ticket.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName(ticket);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  }

  async function shareTicket() {
    const file = currentTicketFile();
    if (!file || !navigator.share) {
      alert('Sharing is not available here. Use Download instead.');
      return;
    }
    const payload = { files: [file], title: file.name };
    if (navigator.canShare && !navigator.canShare(payload)) {
      alert('Sharing this file is not available here. Use Download instead.');
      return;
    }
    try {
      await navigator.share(payload);
    } catch (error) {
      if (error?.name !== 'AbortError') alert('This ticket could not be shared.');
    }
  }

  async function fallbackBlobOpen(id, popup) {
    try {
      if (typeof window.getImportedTicket !== 'function') throw new Error('Ticket reader unavailable');
      const ticket = await window.getImportedTicket(id);
      if (!ticket?.blob) throw new Error('Ticket not found');
      const url = URL.createObjectURL(ticket.blob);
      if (popup) popup.location = url;
      else window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch (error) {
      if (popup) popup.close();
      alert('This ticket could not be opened.');
    }
  }

  async function routeReady(target) {
    try {
      const response = await fetch(target, {
        cache: 'no-store',
        headers: { Range: 'bytes=0-0' }
      });
      return response.status === 206 && response.headers.get('accept-ranges') === 'bytes';
    } catch {
      return false;
    }
  }

  function waitForControllerChange(timeout = 1400) {
    if (!('serviceWorker' in navigator)) return Promise.resolve();
    return new Promise(resolve => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        navigator.serviceWorker.removeEventListener('controllerchange', finish);
        resolve();
      };
      navigator.serviceWorker.addEventListener('controllerchange', finish, { once: true });
      setTimeout(finish, timeout);
    });
  }

  async function openExternalTicket(id) {
    const popup = window.open('', '_blank');
    const target = routeFor(id);
    if ('serviceWorker' in navigator) {
      try {
        let ready = await routeReady(target);
        if (!ready) {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            const changed = waitForControllerChange();
            await registration.update();
            await changed;
            ready = await routeReady(target);
          }
        }
        if (ready) {
          if (popup) popup.location = target;
          else window.location.href = target;
          return;
        }
      } catch {}
    }
    fallbackBlobOpen(id, popup);
  }

  function openImportedTicket(id) {
    if (id == null || id === '') return;
    if (isSamsungInternet) {
      openSamsungTicket(id);
      return;
    }
    openExternalTicket(id);
  }

  window.openImportedTicket = openImportedTicket;

  window.addEventListener('click', event => {
    const imported = event.target.closest?.('[data-open-imported]');
    const direct = event.target.closest?.('#home [data-home-wallet][data-direct-ticket-id]');
    const button = imported || direct;
    if (!button) return;
    const id = imported ? imported.dataset.openImported : direct.dataset.directTicketId;
    if (!id) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openImportedTicket(id);
  }, true);

  window.addEventListener('keydown', event => {
    if (!viewer || viewer.root.hidden) return;
    if (event.key === 'Escape') closeViewer();
    else if (event.key === 'ArrowLeft' && state.pdf && state.page > 1) {
      state.page -= 1;
      renderPdfPage();
    } else if (event.key === 'ArrowRight' && state.pdf && state.page < state.pdf.numPages) {
      state.page += 1;
      renderPdfPage();
    }
  });

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    if (!viewer || viewer.root.hidden || !state.pdf) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderPdfPage, 120);
  });

  function neutralizeDeviceCopy() {
    const wallet = document.getElementById('wallet');
    if (!wallet) return;
    const walker = document.createTreeWalker(wallet, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      if (!node.nodeValue) return;
      node.nodeValue = node.nodeValue
        .replace(/On this iPhone/g, 'On this device')
        .replace(/stay on this iPhone/g, 'stay on this device');
    });
  }

  const originalRenderWallet = window.renderWallet;
  if (typeof originalRenderWallet === 'function') {
    window.renderWallet = async function(...args) {
      const result = await originalRenderWallet.apply(this, args);
      neutralizeDeviceCopy();
      return result;
    };
  }

  neutralizeDeviceCopy();
})();
