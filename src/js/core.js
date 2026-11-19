/* SWISSNAND IT Toolbox — Kern: Registry, Kategorien, Hilfsfunktionen */
(() => {
  'use strict';

  const ICONS = {
    home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',
    encode: '<path d="m8 8-5 4 5 4"/><path d="m16 8 5 4-5 4"/><path d="m14 4-4 16"/>',
    security: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    network: '<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="19" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="M12 7.5v4M12 11.5 6.5 17M12 11.5l5.5 5.5"/>',
    text: '<path d="M4 6h16M4 12h10M4 18h14"/>',
    dev: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3M13 15h4"/>',
    time: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
    reference: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7"/>',
    system: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
    auto: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
    chev: '<path d="m6 9 6 6 6-6"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/>',
    swap: '<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  };

  const icon = (name, extra = '') => `<svg viewBox="0 0 24 24" ${extra}>${ICONS[name] || ICONS.dev}</svg>`;

  const CATEGORIES = [
    { id: 'encode',    name: 'Kodieren & Konvertieren' },
    { id: 'security',  name: 'Sicherheit & Krypto' },
    { id: 'network',   name: 'Netzwerk' },
    { id: 'text',      name: 'Text' },
    { id: 'dev',       name: 'Entwicklung' },
    { id: 'time',      name: 'Zeit & Datum' },
    { id: 'calc',      name: 'Rechner' },
    { id: 'reference', name: 'Referenzen' },
    { id: 'system',    name: 'System' },
  ];

  const tools = [];
  const register = (t) => {
    if (!t.id || !t.name || !t.cat || typeof t.render !== 'function') throw new Error('Ungültiges Tool: ' + t.id);
    tools.push(t);
  };

  /* ---------- Hilfsfunktionen ---------- */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let toastTimer;
  const toast = (msg) => {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1600);
  };

  const copy = async (text) => {
    const s = String(text ?? '');
    if (!s) return toast('Nichts zu kopieren');
    try {
      await navigator.clipboard.writeText(s);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = s; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove();
    }
    toast('In die Zwischenablage kopiert');
  };

  const debounce = (fn, ms = 150) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  const store = {
    get(k, d) { try { const v = localStorage.getItem('tb:' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('tb:' + k, JSON.stringify(v)); } catch { /* ignore */ } },
  };

  const download = (filename, content, type = 'text/plain') => {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  /* Zufall ohne Modulo-Bias */
  const randInt = (max) => {
    if (max <= 0) return 0;
    const lim = Math.floor(0xFFFFFFFF / max) * max;
    const buf = new Uint32Array(1);
    let x;
    do { crypto.getRandomValues(buf); x = buf[0]; } while (x >= lim);
    return x % max;
  };

  const utf8 = {
    enc: (s) => new TextEncoder().encode(s),
    dec: (b) => new TextDecoder('utf-8', { fatal: true }).decode(b),
  };
  const bytesToHex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  const hexToBytes = (h) => {
    const clean = h.replace(/^0x/i, '').replace(/[\s:,-]/g, '');
    if (clean.length % 2 || /[^0-9a-f]/i.test(clean)) throw new Error('Ungültiger Hex-String');
    const out = new Uint8Array(clean.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
    return out;
  };
  const bytesToB64 = (bytes) => {
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    return btoa(bin);
  };
  const b64ToBytes = (b64) => {
    let s = b64.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  };

  const fmtNum = (n, d = 2) => Number(n).toLocaleString('de-CH', { maximumFractionDigits: d });

  /* Kopierbare Key/Value-Liste */
  const kv = (rows) => '<div class="kv">' + rows.map(([k, v]) =>
    `<div class="k">${esc(k)}</div><div class="v">${v === '' || v == null ? '<span class="muted">—</span>' : esc(v)}</div>` +
    `<div class="c">${v === '' || v == null ? '' : `<button class="copy-btn" data-copy-text="${esc(v)}" title="Kopieren">${icon('copy')}</button>`}</div>`
  ).join('') + '</div>';

  const copyBtn = (target, label = 'Kopieren') => `<button class="btn btn-sm" data-copy="${target}">${icon('copy')}${label}</button>`;

  window.TB = {
    ICONS, icon, CATEGORIES, tools, register,
    util: { esc, toast, copy, debounce, store, download, randInt, utf8, bytesToHex, hexToBytes, bytesToB64, b64ToBytes, fmtNum, kv, copyBtn },
  };
})();
