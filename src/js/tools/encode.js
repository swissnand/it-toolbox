/* Kategorie: Kodieren & Konvertieren */
(() => {
  'use strict';
  const { register } = window.TB;

  /* Generisches Ein-/Ausgabe-Layout */
  const io = (opts = '') => `
    <div class="panel">${opts}
      <div class="cols">
        <div class="field"><div class="label">Eingabe</div><textarea id="in" spellcheck="false" placeholder="Text hier einfügen …"></textarea></div>
        <div class="field"><div class="label">Ausgabe <span class="hint"><button class="copy-btn" data-copy="#out" title="Kopieren"></button></span></div><textarea id="out" readonly spellcheck="false"></textarea></div>
      </div>
      <div id="msg"></div>
    </div>`;
  const fixCopyIcons = (root, icon) => root.querySelectorAll('.copy-btn:empty').forEach((b) => { b.innerHTML = icon('copy'); });
  const seg = (name, items, on) => `<div class="seg" data-seg="${name}">${items.map(([v, l]) => `<button data-v="${v}" class="${v === on ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  const bindSeg = (root, name, cb) => {
    const el = root.querySelector(`[data-seg="${name}"]`);
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      el.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      cb(b.dataset.v);
    });
    return () => el.querySelector('.on').dataset.v;
  };
  window.TB.ui = { io, fixCopyIcons, seg, bindSeg };

  register({
    id: 'base64', name: 'Base64', glyph: 'B64', cat: 'encode',
    desc: 'Text in Base64 kodieren und dekodieren (UTF-8, URL-safe).', keywords: 'encode decode btoa atob',
    render(root, U) {
      root.innerHTML = io(`<div class="row" style="margin-bottom:14px">${seg('mode', [['enc', 'Kodieren'], ['dec', 'Dekodieren']], 'enc')}<label class="check"><input type="checkbox" id="urlsafe"> URL-safe</label></div>`);
      fixCopyIcons(root, U.icon);
      const run = () => {
        const v = U.q('#in').value, m = mode();
        U.q('#msg').innerHTML = '';
        try {
          if (m === 'enc') {
            let r = U.bytesToB64(U.utf8.enc(v));
            if (U.q('#urlsafe').checked) r = r.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            U.q('#out').value = r;
          } else U.q('#out').value = v.trim() ? U.utf8.dec(U.b64ToBytes(v.trim())) : '';
        } catch { U.q('#out').value = ''; U.q('#msg').innerHTML = '<div class="msg err">Ungültige Base64-Eingabe</div>'; }
      };
      const mode = bindSeg(root, 'mode', run);
      U.q('#in').addEventListener('input', run);
      U.q('#urlsafe').addEventListener('change', run);
    },
  });

  register({
    id: 'url-encode', name: 'URL Encoder', glyph: '%20', cat: 'encode',
    desc: 'URLs und Parameter prozent-kodieren und dekodieren.', keywords: 'percent encodeURIComponent',
    render(root, U) {
      root.innerHTML = io(`<div class="row" style="margin-bottom:14px">${seg('mode', [['enc', 'Kodieren'], ['dec', 'Dekodieren']], 'enc')}<label class="check"><input type="checkbox" id="full"> Ganze URL (encodeURI)</label></div>`);
      fixCopyIcons(root, U.icon);
      const run = () => {
        const v = U.q('#in').value; U.q('#msg').innerHTML = '';
        try {
          U.q('#out').value = mode() === 'enc' ? (U.q('#full').checked ? encodeURI(v) : encodeURIComponent(v)) : decodeURIComponent(v.replace(/\+/g, ' '));
        } catch { U.q('#msg').innerHTML = '<div class="msg err">Ungültige Prozent-Kodierung</div>'; }
      };
      const mode = bindSeg(root, 'mode', run);
      U.q('#in').addEventListener('input', run); U.q('#full').addEventListener('change', run);
    },
  });

  register({
    id: 'html-entities', name: 'HTML Entities', glyph: '&;', cat: 'encode',
    desc: 'Sonderzeichen in HTML-Entities umwandeln und zurück.', keywords: 'escape unescape html',
    render(root, U) {
      root.innerHTML = io(`<div class="row" style="margin-bottom:14px">${seg('mode', [['enc', 'Kodieren'], ['dec', 'Dekodieren']], 'enc')}<label class="check"><input type="checkbox" id="all"> Alle Nicht-ASCII-Zeichen</label></div>`);
      fixCopyIcons(root, U.icon);
      const run = () => {
        const v = U.q('#in').value;
        if (mode() === 'enc') {
          let r = U.esc(v);
          if (U.q('#all').checked) r = r.replace(/[^\x00-\x7F]/gu, (c) => '&#' + c.codePointAt(0) + ';');
          U.q('#out').value = r;
        } else {
          const d = new DOMParser().parseFromString('<!doctype html><body>' + v.replace(/</g, '&lt;'), 'text/html');
          U.q('#out').value = d.body.textContent;
        }
      };
      const mode = bindSeg(root, 'mode', run);
      U.q('#in').addEventListener('input', run); U.q('#all').addEventListener('change', run);
    },
  });

  register({
    id: 'jwt', name: 'JWT Decoder', glyph: 'JWT', cat: 'encode',
    desc: 'JSON Web Tokens dekodieren: Header, Payload, Ablaufzeit.', keywords: 'json web token bearer oauth',
    render(root, U) {
      root.innerHTML = `<div class="panel"><div class="field"><div class="label">Token</div><textarea id="in" style="min-height:110px" spellcheck="false" placeholder="eyJhbGciOi…"></textarea></div><div id="msg"></div></div>
        <div class="cols"><div class="panel"><h3>Header</h3><pre class="out" id="h"></pre></div><div class="panel"><h3>Payload</h3><pre class="out" id="p"></pre></div></div>
        <div class="panel"><h3>Zeitangaben</h3><div id="times" class="muted small">—</div></div>`;
      const dec = (s) => JSON.parse(U.utf8.dec(U.b64ToBytes(s)));
      const run = () => {
        const t = U.q('#in').value.trim().replace(/^Bearer\s+/i, '');
        U.q('#msg').innerHTML = ''; U.q('#h').textContent = ''; U.q('#p').textContent = ''; U.q('#times').innerHTML = '—';
        if (!t) return;
        const parts = t.split('.');
        try {
          if (parts.length < 2) throw new Error();
          const h = dec(parts[0]), p = dec(parts[1]);
          U.q('#h').textContent = JSON.stringify(h, null, 2);
          U.q('#p').textContent = JSON.stringify(p, null, 2);
          const rows = [];
          const now = Date.now() / 1000;
          for (const [k, l] of [['iat', 'Ausgestellt (iat)'], ['nbf', 'Gültig ab (nbf)'], ['exp', 'Läuft ab (exp)']]) {
            if (typeof p[k] === 'number') rows.push([l, new Date(p[k] * 1000).toLocaleString('de-CH')]);
          }
          let badge = '';
          if (typeof p.exp === 'number') badge = p.exp < now ? '<span class="badge err">Abgelaufen</span>' : '<span class="badge ok">Gültig</span>';
          U.q('#times').innerHTML = (rows.length ? U.kv(rows) : '<span class="muted">Keine Zeitangaben im Token</span>') + (badge ? `<div style="margin-top:10px">${badge} <span class="muted small">Signatur wird nicht geprüft.</span></div>` : '');
        } catch { U.q('#msg').innerHTML = '<div class="msg err">Kein gültiges JWT</div>'; }
      };
      U.q('#in').addEventListener('input', run);
    },
  });

  register({
    id: 'number-base', name: 'Zahlensysteme', glyph: '0x', cat: 'encode',
    desc: 'Dezimal, Hexadezimal, Oktal und Binär live umrechnen.', keywords: 'hex binary octal decimal radix base',
    render(root, U) {
      const bases = [['dec', 'Dezimal', 10], ['hex', 'Hexadezimal', 16], ['oct', 'Oktal', 8], ['bin', 'Binär', 2]];
      root.innerHTML = `<div class="panel">${bases.map(([id, l, b]) => `<div class="field"><div class="label">${l} <span class="hint">Basis ${b}</span></div><div class="row"><input id="${id}" class="mono grow" spellcheck="false"/><button class="copy-btn" data-copy="#${id}">${U.icon('copy')}</button></div></div>`).join('')}
        <div class="field"><div class="label">Eigene Basis</div><div class="row"><input id="cb" type="number" min="2" max="36" value="36" style="width:90px"/><input id="cv" class="mono grow" readonly/></div></div><div id="msg"></div></div>`;
      const parse = (s, b) => {
        s = s.trim().toLowerCase().replace(/[_\s]/g, '');
        const neg = s.startsWith('-'); if (neg) s = s.slice(1);
        s = s.replace(/^0[xob]/, '');
        if (!s) return null;
        const digits = '0123456789abcdefghijklmnopqrstuvwxyz'.slice(0, b);
        let n = 0n;
        for (const ch of s) { const d = digits.indexOf(ch); if (d < 0) throw new Error(); n = n * BigInt(b) + BigInt(d); }
        return neg ? -n : n;
      };
      const upd = (src) => {
        const b = bases.find((x) => x[0] === src)[2];
        U.q('#msg').innerHTML = '';
        let n;
        try { n = parse(U.q('#' + src).value, b); } catch { U.q('#msg').innerHTML = '<div class="msg err">Ungültige Ziffer für Basis ' + b + '</div>'; return; }
        for (const [id, , bb] of bases) if (id !== src) U.q('#' + id).value = n === null ? '' : n.toString(bb).toUpperCase().replace(/^-?/, (m) => m);
        const cb = Math.min(36, Math.max(2, +U.q('#cb').value || 36));
        U.q('#cv').value = n === null ? '' : n.toString(cb);
      };
      bases.forEach(([id]) => U.q('#' + id).addEventListener('input', () => upd(id)));
      U.q('#cb').addEventListener('input', () => upd('dec'));
      U.q('#dec').value = '255'; upd('dec');
    },
  });

  register({
    id: 'text-bytes', name: 'Text ↔ Hex / Binär', glyph: '01', cat: 'encode',
    desc: 'Text in Hex, Binär oder Dezimal-Bytes umwandeln und zurück.', keywords: 'ascii binary hex bytes utf8',
    render(root, U) {
      root.innerHTML = io(`<div class="row" style="margin-bottom:14px">${seg('mode', [['enc', 'Text → Bytes'], ['dec', 'Bytes → Text']], 'enc')}${seg('fmt', [['hex', 'Hex'], ['bin', 'Binär'], ['dec', 'Dezimal']], 'hex')}</div>`);
      fixCopyIcons(root, U.icon);
      const run = () => {
        const v = U.q('#in').value, f = fmt(); U.q('#msg').innerHTML = '';
        try {
          if (mode() === 'enc') {
            const b = U.utf8.enc(v);
            U.q('#out').value = Array.from(b, (x) => f === 'hex' ? x.toString(16).padStart(2, '0') : f === 'bin' ? x.toString(2).padStart(8, '0') : String(x)).join(' ');
          } else {
            let bytes;
            if (f === 'hex') bytes = U.hexToBytes(v);
            else {
              const parts = v.trim().split(/[\s,]+/).filter(Boolean);
              bytes = new Uint8Array(parts.map((p) => { const n = parseInt(p, f === 'bin' ? 2 : 10); if (isNaN(n) || n > 255) throw new Error(); return n; }));
            }
            U.q('#out').value = U.utf8.dec(bytes);
          }
        } catch { U.q('#out').value = ''; U.q('#msg').innerHTML = '<div class="msg err">Eingabe kann nicht dekodiert werden</div>'; }
      };
      const mode = bindSeg(root, 'mode', run), fmt = bindSeg(root, 'fmt', run);
      U.q('#in').addEventListener('input', run);
    },
  });

  register({
    id: 'json', name: 'JSON Formatter', glyph: '{ }', cat: 'encode',
    desc: 'JSON formatieren, validieren, minifizieren und sortieren.', keywords: 'pretty print validate minify lint',
    render(root, U) {
      root.innerHTML = `<div class="panel"><div class="row" style="margin-bottom:14px">
          <button class="btn btn-primary" id="fmt">Formatieren</button><button class="btn" id="min">Minifizieren</button>
          <label class="check"><input type="checkbox" id="sort"> Schlüssel sortieren</label>
          <select id="ind" style="width:auto"><option value="2">2 Leerzeichen</option><option value="4">4 Leerzeichen</option><option value="t">Tab</option></select>
          <span class="spacer"></span><span id="state"></span></div>
        <div class="cols"><div class="field"><div class="label">Eingabe</div><textarea id="in" style="min-height:380px" spellcheck="false" placeholder='{"hallo":"welt"}'></textarea></div>
        <div class="field"><div class="label">Ergebnis <span class="hint"><button class="copy-btn" data-copy="#out">${U.icon('copy')}</button></span></div><textarea id="out" style="min-height:380px" readonly spellcheck="false"></textarea></div></div><div id="msg"></div></div>`;
      const sortKeys = (o) => Array.isArray(o) ? o.map(sortKeys) : o && typeof o === 'object' ? Object.keys(o).sort().reduce((a, k) => (a[k] = sortKeys(o[k]), a), {}) : o;
      const go = (minify) => {
        const v = U.q('#in').value; U.q('#msg').innerHTML = '';
        if (!v.trim()) { U.q('#state').innerHTML = ''; U.q('#out').value = ''; return; }
        try {
          let o = JSON.parse(v);
          if (U.q('#sort').checked) o = sortKeys(o);
          const ind = U.q('#ind').value === 't' ? '\t' : +U.q('#ind').value;
          U.q('#out').value = minify ? JSON.stringify(o) : JSON.stringify(o, null, ind);
          U.q('#state').innerHTML = '<span class="badge ok">Gültiges JSON</span>';
        } catch (e) {
          U.q('#state').innerHTML = '<span class="badge err">Ungültig</span>';
          const m = e.message.match(/position (\d+)/);
          let extra = '';
          if (m) { const pos = +m[1]; const before = v.slice(0, pos); extra = ` (Zeile ${before.split('\n').length}, Spalte ${pos - before.lastIndexOf('\n')})`; }
          U.q('#msg').innerHTML = `<div class="msg err">${U.esc(e.message)}${extra}</div>`;
        }
      };
      U.q('#fmt').onclick = () => go(false); U.q('#min').onclick = () => go(true);
      U.q('#in').addEventListener('input', U.debounce(() => go(false), 250));
      U.q('#sort').onchange = () => go(false); U.q('#ind').onchange = () => go(false);
    },
  });

  /* CSV-Parser (RFC 4180) */
  const parseCSV = (text, delim) => {
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c;
      } else if (c === '"') q = true;
      else if (c === delim) { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows.filter((r) => r.length > 1 || r[0] !== '');
  };
  const toCSV = (arr, delim) => {
    const keys = [...new Set(arr.flatMap((o) => Object.keys(o)))];
    const cell = (v) => { const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); return /["\n\r]/.test(s) || s.includes(delim) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    return [keys.map(cell).join(delim), ...arr.map((o) => keys.map((k) => cell(o[k])).join(delim))].join('\n');
  };

  register({
    id: 'csv-json', name: 'CSV ↔ JSON', glyph: 'CSV', cat: 'encode',
    desc: 'CSV-Tabellen in JSON umwandeln und umgekehrt.', keywords: 'excel table convert spreadsheet',
    render(root, U) {
      root.innerHTML = io(`<div class="row" style="margin-bottom:14px">${seg('mode', [['c2j', 'CSV → JSON'], ['j2c', 'JSON → CSV']], 'c2j')}
        <select id="delim" style="width:auto"><option value=",">Komma ,</option><option value=";">Semikolon ;</option><option value="\t">Tab</option><option value="|">Pipe |</option></select>
        <label class="check"><input type="checkbox" id="hdr" checked> Erste Zeile = Kopfzeile</label><label class="check"><input type="checkbox" id="num" checked> Zahlen erkennen</label></div>`);
      fixCopyIcons(root, U.icon);
      const run = () => {
        const v = U.q('#in').value, d = U.q('#delim').value; U.q('#msg').innerHTML = '';
        if (!v.trim()) { U.q('#out').value = ''; return; }
        try {
          if (mode() === 'c2j') {
            const rows = parseCSV(v, d);
            const conv = (x) => U.q('#num').checked && x.trim() !== '' && !isNaN(x) ? Number(x) : x;
            let res;
            if (U.q('#hdr').checked) { const [h, ...r] = rows; res = r.map((row) => Object.fromEntries(h.map((k, i) => [k, conv(row[i] ?? '')]))); }
            else res = rows.map((r) => r.map(conv));
            U.q('#out').value = JSON.stringify(res, null, 2);
          } else {
            let arr = JSON.parse(v); if (!Array.isArray(arr)) arr = [arr];
            U.q('#out').value = Array.isArray(arr[0]) ? arr.map((r) => r.join(d)).join('\n') : toCSV(arr, d);
          }
        } catch (e) { U.q('#out').value = ''; U.q('#msg').innerHTML = `<div class="msg err">${U.esc(e.message)}</div>`; }
      };
      const mode = bindSeg(root, 'mode', run);
      ['#in', '#delim', '#hdr', '#num'].forEach((s) => U.q(s).addEventListener('input', run));
    },
  });

  /* JSON → YAML */
  const toYAML = (v, ind = 0) => {
    const pad = '  '.repeat(ind);
    const scalar = (x) => {
      if (x === null) return 'null';
      if (typeof x === 'boolean' || typeof x === 'number') return String(x);
      const s = String(x);
      if (s === '' || /^[\s]|[\s]$|^[-?:,[\]{}#&*!|>'"%@`]|: | #|^(true|false|null|yes|no|on|off|~)$/i.test(s) || !isNaN(s) || s.includes('\n') || s.includes(':')) return JSON.stringify(s);
      return s;
    };
    if (Array.isArray(v)) {
      if (!v.length) return '[]';
      return v.map((x) => {
        if (x && typeof x === 'object' && Object.keys(x).length) {
          const inner = toYAML(x, ind + 1).replace(/^\s+/, '');
          return `${pad}- ${inner}`;
        }
        return `${pad}- ${x && typeof x === 'object' ? (Array.isArray(x) ? '[]' : '{}') : scalar(x)}`;
      }).join('\n');
    }
    if (v && typeof v === 'object') {
      const keys = Object.keys(v);
      if (!keys.length) return '{}';
      return keys.map((k) => {
        const x = v[k], key = scalar(k);
        if (x && typeof x === 'object' && (Array.isArray(x) ? x.length : Object.keys(x).length)) return `${pad}${key}:\n${toYAML(x, ind + 1)}`;
        return `${pad}${key}: ${x && typeof x === 'object' ? (Array.isArray(x) ? '[]' : '{}') : scalar(x)}`;
      }).join('\n');
    }
    return pad + scalar(v);
  };

  register({
    id: 'json-yaml', name: 'JSON → YAML', glyph: 'YML', cat: 'encode',
    desc: 'JSON in sauberes YAML umwandeln (z. B. für Docker Compose, Kubernetes).', keywords: 'yaml kubernetes compose config',
    render(root, U) {
      root.innerHTML = io();
      fixCopyIcons(root, U.icon);
      const run = () => {
        const v = U.q('#in').value; U.q('#msg').innerHTML = '';
        if (!v.trim()) { U.q('#out').value = ''; return; }
        try { U.q('#out').value = toYAML(JSON.parse(v)); }
        catch (e) { U.q('#msg').innerHTML = `<div class="msg err">${U.esc(e.message)}</div>`; }
      };
      U.q('#in').addEventListener('input', U.debounce(run, 200));
      U.q('#in').value = '{\n  "services": {\n    "web": {\n      "image": "nginx:latest",\n      "ports": ["80:80"],\n      "restart": "always"\n    }\n  }\n}';
      run();
    },
  });

  /* Farben */
  const hexToRgb = (h) => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map((c) => c + c).join(''); if (!/^[0-9a-f]{6}$/i.test(h)) return null; const n = parseInt(h, 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const rgbToHex = (r, g, b) => '#' + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('').toUpperCase();
  const rgbToHsl = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [Math.round(h), Math.round(s * 100), Math.round(l * 100)]; };
  const hslToRgb = (h, s, l) => { s /= 100; l /= 100; const k = (n) => (n + h / 30) % 12; const a = s * Math.min(l, 1 - l); const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return [f(0) * 255, f(8) * 255, f(4) * 255]; };
  const lum = (r, g, b) => { const c = [r, g, b].map((x) => { x /= 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const contrast = (a, b) => { const l1 = lum(...a), l2 = lum(...b); return (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05); };

  register({
    id: 'color', name: 'Farbkonverter', glyph: '#', cat: 'encode',
    desc: 'HEX, RGB, HSL umrechnen, Kontrast (WCAG) und Farbabstufungen.', keywords: 'color hex rgb hsl contrast wcag palette',
    render(root, U) {
      root.innerHTML = `<div class="cols"><div class="panel">
          <div class="swatch" id="sw"></div>
          <div class="row" style="margin-top:14px"><input type="color" id="pick"/><input id="any" class="mono grow" placeholder="#004984, rgb(0,73,132), hsl(207,100%,26%)"/></div>
          <div style="margin-top:14px" id="vals"></div></div>
        <div class="panel"><h3>Kontrast (WCAG 2.1)</h3><div id="con"></div><h3 style="margin-top:18px">Abstufungen</h3><div id="shades" style="display:grid;grid-template-columns:repeat(9,1fr);gap:6px"></div></div></div>`;
      const set = (rgb) => {
        const [r, g, b] = rgb.map((x) => Math.max(0, Math.min(255, Math.round(x))));
        const hex = rgbToHex(r, g, b), [h, s, l] = rgbToHsl(r, g, b);
        U.q('#sw').style.background = hex; U.q('#pick').value = hex.toLowerCase();
        U.q('#vals').innerHTML = U.kv([['HEX', hex], ['RGB', `rgb(${r}, ${g}, ${b})`], ['HSL', `hsl(${h}, ${s}%, ${l}%)`], ['CSS Variable', `--color: ${hex};`], ['Swift', `Color(red: ${(r / 255).toFixed(3)}, green: ${(g / 255).toFixed(3)}, blue: ${(b / 255).toFixed(3)})`]]);
        const cw = contrast([r, g, b], [255, 255, 255]), cb = contrast([r, g, b], [0, 0, 0]);
        const grade = (c) => c >= 7 ? '<span class="badge ok">AAA</span>' : c >= 4.5 ? '<span class="badge ok">AA</span>' : c >= 3 ? '<span class="badge warn">AA gross</span>' : '<span class="badge err">Fail</span>';
        U.q('#con').innerHTML = `<div class="row" style="gap:10px">
          <div class="stat grow" style="background:${hex};color:#fff"><b>${cw.toFixed(2)}:1</b><span style="color:#fff;opacity:.85">auf Weiss / weisser Text</span></div>
          <div class="stat grow" style="background:${hex};color:#000"><b>${cb.toFixed(2)}:1</b><span style="color:#000;opacity:.75">schwarzer Text</span></div></div>
          <div class="row" style="margin-top:8px">Weiss: ${grade(cw)} &nbsp; Schwarz: ${grade(cb)}</div>`;
        U.q('#shades').innerHTML = [95, 85, 75, 62, 50, 40, 30, 20, 10].map((L) => { const hx = rgbToHex(...hslToRgb(h, s, L)); return `<button title="${hx}" data-copy-text="${hx}" style="height:42px;border-radius:8px;border:1px solid var(--border);background:${hx};cursor:pointer"></button>`; }).join('');
      };
      const parseAny = (s) => {
        s = s.trim();
        let m;
        if ((m = s.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i))) return [+m[1], +m[2], +m[3]];
        if ((m = s.match(/^hsla?\(\s*(\d+)[,\s]+(\d+)%?[,\s]+(\d+)%?/i))) return hslToRgb(+m[1], +m[2], +m[3]);
        return hexToRgb(s);
      };
      U.q('#pick').addEventListener('input', (e) => { U.q('#any').value = e.target.value.toUpperCase(); set(hexToRgb(e.target.value)); });
      U.q('#any').addEventListener('input', (e) => { const c = parseAny(e.target.value); if (c) set(c); });
      U.q('#any').value = '#004984'; set([0, 73, 132]);
    },
  });

  register({
    id: 'image-base64', name: 'Bild → Base64', glyph: 'IMG', cat: 'encode',
    desc: 'Dateien und Bilder als Data-URI / Base64 kodieren.', keywords: 'data uri image file embed',
    render(root, U) {
      root.innerHTML = `<div class="panel"><div class="field"><div class="label">Datei wählen oder hierher ziehen</div>
        <label id="drop" style="display:grid;place-items:center;height:140px;border:2px dashed var(--border-strong);border-radius:12px;cursor:pointer;color:var(--muted)">
        <span>Datei hier ablegen oder klicken</span><input type="file" id="file" hidden></label></div>
        <div id="info"></div><div id="prev" style="margin:12px 0"></div>
        <div class="field"><div class="label">Data-URI <span class="hint"><button class="copy-btn" data-copy="#out">${U.icon('copy')}</button></span></div><textarea id="out" readonly></textarea></div>
        <div class="row"><button class="btn" id="css">Als CSS kopieren</button><button class="btn" id="html">Als &lt;img&gt; kopieren</button><button class="btn" id="raw">Nur Base64 kopieren</button></div></div>`;
      const handle = (f) => {
        if (!f) return;
        const r = new FileReader();
        r.onload = () => {
          const d = r.result; U.q('#out').value = d;
          U.q('#info').innerHTML = U.kv([['Name', f.name], ['Typ', f.type || 'unbekannt'], ['Grösse', U.fmtNum(f.size / 1024) + ' KB'], ['Base64-Länge', U.fmtNum(d.length, 0) + ' Zeichen']]);
          U.q('#prev').innerHTML = f.type.startsWith('image/') ? `<img src="${d}" style="max-width:100%;max-height:220px;border-radius:8px;border:1px solid var(--border)">` : '';
        };
        r.readAsDataURL(f);
      };
      U.q('#file').onchange = (e) => handle(e.target.files[0]);
      const drop = U.q('#drop');
      drop.ondragover = (e) => { e.preventDefault(); drop.style.borderColor = 'var(--accent-text)'; };
      drop.ondragleave = () => { drop.style.borderColor = ''; };
      drop.ondrop = (e) => { e.preventDefault(); drop.style.borderColor = ''; handle(e.dataTransfer.files[0]); };
      U.q('#css').onclick = () => U.copy(`background-image: url("${U.q('#out').value}");`);
      U.q('#html').onclick = () => U.copy(`<img src="${U.q('#out').value}" alt="">`);
      U.q('#raw').onclick = () => U.copy(U.q('#out').value.split(',')[1] || '');
    },
  });

  register({
    id: 'string-escape', name: 'String Escaper', glyph: '\\n', cat: 'encode',
    desc: 'Strings für JSON, JavaScript, SQL, Shell oder Regex escapen.', keywords: 'escape unescape quote backslash',
    render(root, U) {
      root.innerHTML = io(`<div class="row" style="margin-bottom:14px">${seg('mode', [['enc', 'Escapen'], ['dec', 'Unescapen']], 'enc')}${seg('lang', [['json', 'JSON'], ['sql', 'SQL'], ['sh', 'Shell'], ['re', 'Regex']], 'json')}</div>`);
      fixCopyIcons(root, U.icon);
      const run = () => {
        const v = U.q('#in').value, l = lang(), enc = mode() === 'enc'; U.q('#msg').innerHTML = '';
        try {
          let r;
          if (l === 'json') r = enc ? JSON.stringify(v).slice(1, -1) : JSON.parse('"' + v.replace(/(^|[^\\])"/g, '$1\\"') + '"');
          else if (l === 'sql') r = enc ? v.replace(/'/g, "''") : v.replace(/''/g, "'");
          else if (l === 'sh') r = enc ? "'" + v.replace(/'/g, "'\\''") + "'" : v.replace(/^'|'$/g, '').replace(/'\\''/g, "'");
          else r = enc ? v.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') : v.replace(/\\(.)/g, '$1');
          U.q('#out').value = r;
        } catch (e) { U.q('#msg').innerHTML = `<div class="msg err">${U.esc(e.message)}</div>`; }
      };
      const mode = bindSeg(root, 'mode', run), lang = bindSeg(root, 'lang', run);
      U.q('#in').addEventListener('input', run);
    },
  });

  register({
    id: 'roman', name: 'Römische Zahlen', glyph: 'XIV', cat: 'encode',
    desc: 'Arabische Zahlen in römische umwandeln und zurück.', keywords: 'roman numerals',
    render(root, U) {
      root.innerHTML = `<div class="panel cols"><div class="field"><div class="label">Zahl (1–3999)</div><input id="a" type="number" min="1" max="3999" value="2026"/></div>
        <div class="field"><div class="label">Römisch</div><input id="r" class="mono" style="text-transform:uppercase"/></div></div><div id="msg"></div>`;
      const map = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
      const toR = (n) => map.reduce((s, [v, l]) => { while (n >= v) { s += l; n -= v; } return s; }, '');
      const fromR = (s) => { s = s.toUpperCase(); let i = 0, n = 0; for (const [v, l] of map) while (s.startsWith(l, i)) { n += v; i += l.length; } return i === s.length && toR(n) === s ? n : NaN; };
      const a = U.q('#a'), r = U.q('#r');
      a.oninput = () => { const n = +a.value; U.q('#msg').innerHTML = ''; r.value = n >= 1 && n <= 3999 ? toR(Math.floor(n)) : ''; };
      r.oninput = () => { const n = fromR(r.value.trim()); U.q('#msg').innerHTML = isNaN(n) && r.value ? '<div class="msg err">Keine gültige römische Zahl</div>' : ''; if (!isNaN(n)) a.value = n; };
      a.oninput();
    },
  });
})();
