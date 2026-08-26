(() => {
  const FORMAT = 'italy-2026-app-backup';
  const VERSION = 2;
  const LEGACY_FORMAT = 'italy-2026-wallet-backup';
  const LEGACY_VERSION = 1;
  const STORAGE_PREFIX = 'italy2026-';
  const LAST = 'italy2026-wallet-last-backup';
  let busy = false;
  let crcTable;

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const fmtSize = n => n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`;
  const safe = s => (String(s || 'ticket').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim() || 'ticket').slice(0, 100);

  function styles() {
    if (document.getElementById('wallet-backup-styles')) return;
    const s = document.createElement('style');
    s.id = 'wallet-backup-styles';
    s.textContent = `.wallet-backup-card{margin-top:16px}.wallet-backup-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.wallet-backup-count{font-size:12px;font-weight:850;color:#17603f;background:rgba(23,96,63,.08);padding:5px 8px;border-radius:999px}.wallet-backup-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.wallet-backup-status{margin-top:10px}.wallet-backup-link{margin:14px 0 4px;padding:10px 0;text-align:center;color:var(--muted);font-size:12px}.wallet-backup-link button{border:0;background:none;color:#184f3b;font:inherit;font-weight:800;text-decoration:underline;text-underline-offset:2px}.wallet-backup-target{box-shadow:0 0 0 3px rgba(20,63,49,.2),var(--shadow)!important}`;
    document.head.appendChild(s);
  }

  function status(t) {
    document.querySelectorAll('[data-wallet-backup-status]').forEach(x => x.textContent = t);
  }

  function setBusy(v, t = '') {
    busy = v;
    document.querySelectorAll('[data-wallet-backup],[data-wallet-restore]').forEach(b => b.disabled = v);
    if (t) status(t);
  }

  function appStorageEntries() {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
      const value = localStorage.getItem(key);
      if (value !== null) out.push({ key, value });
    }
    return out.sort((a, b) => a.key.localeCompare(b.key));
  }

  function restoreAppStorage(entries) {
    if (!Array.isArray(entries)) throw new Error('The local app data in this backup is invalid.');
    const clean = entries.map(item => {
      if (!item || typeof item.key !== 'string' || typeof item.value !== 'string' || !item.key.startsWith(STORAGE_PREFIX)) {
        throw new Error('The local app data in this backup is invalid.');
      }
      return { key: item.key, value: item.value };
    });

    const before = appStorageEntries();
    try {
      before.forEach(item => localStorage.removeItem(item.key));
      clean.forEach(item => localStorage.setItem(item.key, item.value));
      return clean.length;
    } catch (error) {
      try {
        appStorageEntries().forEach(item => localStorage.removeItem(item.key));
        before.forEach(item => localStorage.setItem(item.key, item.value));
      } catch {}
      throw new Error('Local app data could not be restored safely. Existing local data was kept.');
    }
  }

  function table() {
    if (crcTable) return crcTable;
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
    return crcTable;
  }

  async function crc(blob) {
    let c = 0xffffffff;
    const t = table();
    const r = blob.stream().getReader();
    for (;;) {
      const { value, done } = await r.read();
      if (done) break;
      for (const b of value) c = t[(c ^ b) & 255] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function dos(d = new Date()) {
    const y = Math.max(1980, Math.min(2107, d.getFullYear()));
    return {
      time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
      date: ((y - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
    };
  }

  function local(e, n) {
    const a = new Uint8Array(30 + n.length);
    const v = new DataView(a.buffer);
    v.setUint32(0, 0x04034b50, true);
    v.setUint16(4, 20, true);
    v.setUint16(6, 0x0800, true);
    v.setUint16(10, e.time, true);
    v.setUint16(12, e.date, true);
    v.setUint32(14, e.crc, true);
    v.setUint32(18, e.size, true);
    v.setUint32(22, e.size, true);
    v.setUint16(26, n.length, true);
    a.set(n, 30);
    return a;
  }

  function central(e, n, o) {
    const a = new Uint8Array(46 + n.length);
    const v = new DataView(a.buffer);
    v.setUint32(0, 0x02014b50, true);
    v.setUint16(4, 20, true);
    v.setUint16(6, 20, true);
    v.setUint16(8, 0x0800, true);
    v.setUint16(12, e.time, true);
    v.setUint16(14, e.date, true);
    v.setUint32(16, e.crc, true);
    v.setUint32(20, e.size, true);
    v.setUint32(24, e.size, true);
    v.setUint16(28, n.length, true);
    v.setUint32(42, o, true);
    a.set(n, 46);
    return a;
  }

  function zip(entries) {
    const enc = new TextEncoder();
    const parts = [];
    const cd = [];
    let off = 0;
    for (const e of entries) {
      const n = enc.encode(e.name);
      const h = local(e, n);
      parts.push(h, e.blob);
      cd.push(central(e, n, off));
      off += h.length + e.size;
    }
    const cdoff = off;
    const cdsize = cd.reduce((s, a) => s + a.length, 0);
    parts.push(...cd);
    const end = new Uint8Array(22);
    const v = new DataView(end.buffer);
    v.setUint32(0, 0x06054b50, true);
    v.setUint16(8, entries.length, true);
    v.setUint16(10, entries.length, true);
    v.setUint32(12, cdsize, true);
    v.setUint32(16, cdoff, true);
    parts.push(end);
    return new Blob(parts, { type: 'application/zip' });
  }

  async function makeBackup() {
    if (typeof window.getImportedTickets !== 'function') throw new Error('Private Wallet storage is unavailable.');
    const tickets = await window.getImportedTickets();
    const localEntries = appStorageEntries();
    const stamp = dos();
    const entries = [];
    const files = [];

    for (let i = 0; i < tickets.length; i++) {
      const t = tickets[i];
      const b = t.blob instanceof Blob ? t.blob : new Blob([t.blob], { type: t.type || 'application/octet-stream' });
      status(`Preparing ticket files… ${i + 1} of ${tickets.length}`);
      const name = `files/${String(i + 1).padStart(3, '0')}-${safe(t.fileName || t.name)}`;
      const sum = await crc(b);
      entries.push({ name, blob: b, size: b.size, crc: sum, time: stamp.time, date: stamp.date });
      files.push({
        entry: name,
        crc32: sum,
        name: t.name || '',
        category: t.category || 'Other',
        date: t.date || '',
        time: t.time || '',
        notes: t.notes || '',
        linkedWalletKey: t.linkedWalletKey || '',
        fileName: t.fileName || safe(t.name),
        type: t.type || b.type || 'application/octet-stream',
        size: b.size,
        createdAt: Number(t.createdAt) || Date.now()
      });
    }

    const m = new Blob([JSON.stringify({
      format: FORMAT,
      version: VERSION,
      createdAt: new Date().toISOString(),
      files,
      localStorage: {
        prefix: STORAGE_PREFIX,
        entries: localEntries
      }
    }, null, 2)], { type: 'application/json' });
    const me = { name: 'manifest.json', blob: m, size: m.size, crc: await crc(m), time: stamp.time, date: stamp.date };
    return { blob: zip([me, ...entries]), ticketCount: tickets.length, localCount: localEntries.length };
  }

  async function backup() {
    if (busy) return;
    try {
      setBusy(true, 'Preparing full backup…');
      const { blob, ticketCount, localCount } = await makeBackup();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Italy-2026-Full-Backup-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 120000);
      const now = new Date().toISOString();
      try { localStorage.setItem(LAST, now); } catch {}
      await decorateMore();
      status(`Backup created · ${ticketCount} ticket ${ticketCount === 1 ? 'file' : 'files'} · ${localCount} local ${localCount === 1 ? 'item' : 'items'}`);
    } catch (e) {
      console.error(e);
      alert(e.message || 'The full app backup could not be created.');
      status('Backup was not created.');
    } finally {
      setBusy(false);
    }
  }

  async function directory(file) {
    if (file.size < 22) throw new Error('This is not a valid Italy 2026 backup.');
    const start = Math.max(0, file.size - 65557);
    const tail = new Uint8Array(await file.slice(start).arrayBuffer());
    const tv = new DataView(tail.buffer);
    let p = -1;
    for (let i = tail.length - 22; i >= 0; i--) {
      if (tv.getUint32(i, true) === 0x06054b50) {
        p = i;
        break;
      }
    }
    if (p < 0) throw new Error('The backup ZIP is incomplete or damaged.');

    const count = tv.getUint16(p + 10, true);
    const size = tv.getUint32(p + 12, true);
    const off = tv.getUint32(p + 16, true);
    const bytes = new Uint8Array(await file.slice(off, off + size).arrayBuffer());
    const v = new DataView(bytes.buffer);
    const dec = new TextDecoder();
    const map = new Map();
    let x = 0;

    for (let i = 0; i < count; i++) {
      if (v.getUint32(x, true) !== 0x02014b50) throw new Error('The backup ZIP directory is damaged.');
      const flags = v.getUint16(x + 8, true);
      const method = v.getUint16(x + 10, true);
      const sum = v.getUint32(x + 16, true);
      const cs = v.getUint32(x + 20, true);
      const us = v.getUint32(x + 24, true);
      const nl = v.getUint16(x + 28, true);
      const el = v.getUint16(x + 30, true);
      const cl = v.getUint16(x + 32, true);
      const lo = v.getUint32(x + 42, true);
      const name = dec.decode(bytes.slice(x + 46, x + 46 + nl));
      if (flags & 1 || method !== 0) throw new Error('This backup uses an unsupported ZIP format.');
      map.set(name, { name, crc: sum, cs, us, lo });
      x += 46 + nl + el + cl;
    }
    return map;
  }

  async function entry(file, e, type = 'application/octet-stream') {
    const h = new Uint8Array(await file.slice(e.lo, e.lo + 30).arrayBuffer());
    const v = new DataView(h.buffer);
    if (h.length < 30 || v.getUint32(0, true) !== 0x04034b50) throw new Error('A file in the backup is damaged.');
    const s = e.lo + 30 + v.getUint16(26, true) + v.getUint16(28, true);
    const bytes = await file.slice(s, s + e.cs).arrayBuffer();
    return new Blob([bytes], { type });
  }

  async function readBackup(file) {
    const dir = await directory(file);
    const me = dir.get('manifest.json');
    if (!me) throw new Error('This ZIP does not contain an Italy 2026 backup.');
    const mb = await entry(file, me, 'application/json');
    if (await crc(mb) !== me.crc) throw new Error('The backup manifest failed its integrity check.');
    const manifest = JSON.parse(await mb.text());
    const current = manifest.format === FORMAT && manifest.version === VERSION && Array.isArray(manifest.files);
    const legacy = manifest.format === LEGACY_FORMAT && manifest.version === LEGACY_VERSION && Array.isArray(manifest.files);
    if (!current && !legacy) throw new Error('This is not a supported Italy 2026 backup.');
    if (current && (!manifest.localStorage || !Array.isArray(manifest.localStorage.entries))) {
      throw new Error('This full backup is missing its local app data.');
    }
    return { dir, manifest, legacy };
  }

  function walletEntries() {
    const out = [];
    if (typeof window.walletItemKey !== 'function') return out;
    (window.TICKET_WALLET || []).forEach(g => (g.items || []).forEach(i => out.push({
      key: window.walletItemKey(g.group, i),
      title: i.title || '',
      date: i.date || ''
    })));
    return out;
  }

  function relink(m) {
    if (!m.linkedWalletKey) return '';
    const all = walletEntries();
    if (all.some(x => x.key === m.linkedWalletKey)) return m.linkedWalletKey;
    let c = all.filter(x => norm(x.title) === norm(m.name));
    if (m.date) {
      const d = c.filter(x => norm(x.date) === norm(m.date));
      if (d.length) c = d;
    }
    return c.length === 1 ? c[0].key : m.linkedWalletKey;
  }

  const sig = t => [
    t.linkedWalletKey || '',
    norm(t.name),
    norm(t.fileName),
    Number(t.size) || 0,
    t.type || ''
  ].join('|');

  async function blobCrc(ticket) {
    if (!ticket?.blob) return null;
    try {
      const b = ticket.blob instanceof Blob
        ? ticket.blob
        : new Blob([ticket.blob], { type: ticket.type || 'application/octet-stream' });
      return await crc(b);
    } catch {
      return null;
    }
  }

  async function removeImportedTicket(id) {
    if (typeof window.deleteImportedTicket === 'function') {
      await window.deleteImportedTicket(id);
      return;
    }
    throw new Error('A damaged restored ticket could not be replaced safely.');
  }

  async function verifySavedTicket(id, expectedCrc, signature) {
    let candidates = [];
    if (id != null && typeof window.getImportedTicket === 'function') {
      const stored = await window.getImportedTicket(id);
      if (stored) candidates.push(stored);
    }
    if (!candidates.length) {
      const all = await window.getImportedTickets();
      candidates = all.filter(item => sig(item) === signature).sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
    }
    for (const candidate of candidates) {
      if (await blobCrc(candidate) === expectedCrc) return candidate;
    }
    return null;
  }

  async function restoreTickets(file, dir, manifest) {
    let existing = await window.getImportedTickets();
    let added = 0;
    let skipped = 0;
    let repaired = 0;
    let recovered = 0;

    for (let i = 0; i < manifest.files.length; i++) {
      const meta = manifest.files[i];
      const e = dir.get(meta.entry);
      status(`Restoring ticket files… ${i + 1} of ${manifest.files.length}`);
      if (!e) throw new Error(`Missing ticket file: ${meta.fileName || meta.entry}`);

      const b = await entry(file, e, meta.type || 'application/octet-stream');
      const sum = await crc(b);
      const expected = Number(meta.crc32) >>> 0;
      if (sum !== e.crc || sum !== expected) throw new Error(`Integrity check failed: ${meta.fileName || meta.entry}`);

      const key = relink(meta);
      const r = {
        name: meta.name || meta.fileName || 'Restored ticket',
        category: meta.category || 'Other',
        date: meta.date || '',
        time: meta.time || '',
        notes: meta.notes || '',
        linkedWalletKey: key,
        fileName: meta.fileName || safe(meta.name),
        type: meta.type || b.type || 'application/octet-stream',
        size: b.size,
        blob: b,
        createdAt: Number(meta.createdAt) || Date.now()
      };
      const signature = sig(r);
      const matches = existing.filter(item => sig(item) === signature);

      let healthy = null;
      const damaged = [];
      for (const candidate of matches) {
        if (await blobCrc(candidate) === expected) {
          healthy = candidate;
          break;
        }
        damaged.push(candidate);
      }

      if (healthy) {
        skipped++;
        continue;
      }

      const newId = await window.saveImportedTicket(r);
      const saved = await verifySavedTicket(newId, expected, signature);
      if (!saved) {
        if (newId != null && typeof window.deleteImportedTicket === 'function') {
          try { await window.deleteImportedTicket(newId); } catch {}
        }
        throw new Error(`Verification failed after restoring: ${meta.fileName || meta.entry}`);
      }

      if (damaged.length) {
        for (const candidate of damaged) {
          if (candidate.id === saved.id) continue;
          await removeImportedTicket(candidate.id);
        }
        repaired++;
      } else {
        added++;
      }

      if (meta.linkedWalletKey && !walletEntries().some(x => x.key === key)) recovered++;
      existing = await window.getImportedTickets();
    }

    return { added, skipped, repaired, recovered };
  }

  async function restore(file) {
    if (busy || !file) return;
    let parsed;
    try {
      setBusy(true, 'Reading backup…');
      parsed = await readBackup(file);
    } catch (e) {
      console.error(e);
      alert(e.message || 'The Italy 2026 backup could not be read.');
      status('Restore was not completed.');
      setBusy(false);
      return;
    }

    const { dir, manifest, legacy } = parsed;
    const ok = legacy
      ? confirm('Restore this older Wallet-only backup? Ticket files will be restored or repaired. This older backup does not contain custom places, Trip Notes, favorites, progress or other local app data.')
      : confirm('Restore this full Italy 2026 backup? Ticket files will be restored or repaired, and this shortcut’s local app data — including custom places/restaurants, notes, favorites, planned days, progress and settings — will be replaced with the backup copy.');
    if (!ok) {
      status('Restore canceled.');
      setBusy(false);
      return;
    }

    try {
      const result = await restoreTickets(file, dir, manifest);
      let localCount = 0;
      if (!legacy) {
        status('Restoring local app data…');
        localCount = restoreAppStorage(manifest.localStorage.entries);
        try { localStorage.setItem(LAST, manifest.createdAt || new Date().toISOString()); } catch {}
      }

      const msg = [
        result.repaired ? `${result.repaired} ticket ${result.repaired === 1 ? 'file' : 'files'} repaired` : '',
        result.added ? `${result.added} ticket ${result.added === 1 ? 'file' : 'files'} restored` : '',
        result.skipped ? `${result.skipped} healthy ticket ${result.skipped === 1 ? 'file' : 'files'} kept` : '',
        result.recovered ? `${result.recovered} shown in Recovered files` : '',
        !legacy ? `${localCount} local ${localCount === 1 ? 'item' : 'items'} restored` : ''
      ].filter(Boolean).join(' · ') || 'No changes needed';

      if (legacy) {
        await window.renderWallet?.();
        await decorateMore();
        status(`Restore complete · ${msg}`);
        alert(`Wallet restore complete.\n\n${msg}`);
      } else {
        status(`Restore complete · ${msg}`);
        alert(`Full app restore complete.\n\n${msg}\n\nThe app will reload now so all restored local data is applied.`);
        setTimeout(() => location.reload(), 50);
      }
    } catch (e) {
      console.error(e);
      alert(e.message || 'The Italy 2026 backup could not be restored.');
      status('Restore was not completed.');
    } finally {
      setBusy(false);
    }
  }

  async function stats() {
    try {
      const a = await window.getImportedTickets();
      return {
        count: a.length,
        bytes: a.reduce((s, t) => s + (Number(t.size) || Number(t.blob?.size) || 0), 0),
        localCount: appStorageEntries().length
      };
    } catch {
      return null;
    }
  }

  async function decorateMore() {
    styles();
    const more = document.getElementById('more');
    if (!more || typeof window.getImportedTickets !== 'function') return;
    more.querySelector('.wallet-backup-card')?.remove();

    const st = await stats();
    const last = (() => {
      try { return localStorage.getItem(LAST); } catch { return null; }
    })();
    const when = last
      ? new Date(last).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
      : 'Not backed up yet';

    const card = document.createElement('section');
    card.className = 'info-card wallet-backup-card';
    card.id = 'walletBackupCard';
    const badge = st ? `${st.count} ticket ${st.count === 1 ? 'file' : 'files'}` : 'Unavailable';
    const detail = st
      ? `${fmtSize(st.bytes)} of ticket files · ${st.localCount} local ${st.localCount === 1 ? 'item' : 'items'} ready to protect.`
      : 'Local app data could not be read.';
    card.innerHTML = `<div class="wallet-backup-head"><div><strong>Data & Backup</strong><div class="small">Protect tickets, custom places, notes and local app data</div></div><span class="wallet-backup-count">${badge}</span></div><div class="small" style="margin-top:8px">${detail}</div><div class="wallet-backup-actions"><button class="primary" data-wallet-backup ${!st ? 'disabled' : ''}>Back Up Everything</button><button class="secondary" data-wallet-restore ${!st ? 'disabled' : ''}>Restore Backup</button><input class="hidden" type="file" accept=".zip,application/zip" data-wallet-restore-input></div><div class="small wallet-backup-status" data-wallet-backup-status>Last backup: ${esc(when)}</div>`;

    const app = more.querySelector('.app-status-card');
    app ? more.insertBefore(card, app) : more.appendChild(card);
    card.querySelector('[data-wallet-backup]')?.addEventListener('click', backup);
    const input = card.querySelector('[data-wallet-restore-input]');
    card.querySelector('[data-wallet-restore]')?.addEventListener('click', () => !busy && input.click());
    input?.addEventListener('change', e => {
      const f = e.target.files?.[0];
      e.target.value = '';
      if (f) restore(f);
    });
  }

  function decorateWallet() {
    styles();
    const w = document.getElementById('wallet');
    const content = document.getElementById('walletContent');
    if (!w || !content) return;
    w.querySelector('.wallet-backup-link')?.remove();

    const row = document.createElement('div');
    row.className = 'wallet-backup-link';
    row.innerHTML = 'Tickets, custom places and notes are stored locally on this device. <button type="button">Backup & restore</button>';
    content.insertAdjacentElement('afterend', row);
    row.querySelector('button').addEventListener('click', () => {
      window.showView?.('more');
      setTimeout(async () => {
        await decorateMore();
        const c = document.getElementById('walletBackupCard');
        window.cancelNavigationScrollRestore?.();
        c?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        c?.classList.add('wallet-backup-target');
        setTimeout(() => c?.classList.remove('wallet-backup-target'), 2200);
      }, 80);
    });
  }

  document.addEventListener('italy:more-rendered', () => requestAnimationFrame(decorateMore));
  document.addEventListener('italy:wallet-rendered', () => requestAnimationFrame(decorateWallet));

  document.addEventListener('click', e => {
    if (e.target.closest('[data-target="more"]')) setTimeout(decorateMore, 0);
    if (e.target.closest('[data-target="wallet"]')) setTimeout(decorateWallet, 0);
  });

  decorateMore();
  decorateWallet();
})();
