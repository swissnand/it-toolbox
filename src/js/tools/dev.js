/* Kategorie: Entwicklung */
(() => {
  'use strict';
  const { register } = window.TB;

  /* ---------- Cron ---------- */
  const CRON_F = [['Minute', 0, 59], ['Stunde', 0, 23], ['Tag', 1, 31], ['Monat', 1, 12], ['Wochentag', 0, 7]];
  const MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const DOW_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const MON_DE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const MACROS = { '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *', '@monthly': '0 0 1 * *', '@weekly': '0 0 * * 0', '@daily': '0 0 * * *', '@midnight': '0 0 * * *', '@hourly': '0 * * * *' };
  const parseField = (s, [, min, max], idx) => {
    const set = new Set();
    s = s.toLowerCase();
    if (idx === 3) MON.forEach((m, i) => { s = s.replace(new RegExp(m, 'g'), String(i + 1)); });
    if (idx === 4) DOW.forEach((d, i) => { s = s.replace(new RegExp(d, 'g'), String(i)); });
    for (const part of s.split(',')) {
      const m = part.match(/^(\*|\d+)(?:-(\d+))?(?:\/(\d+))?$/);
      if (!m) throw new Error(`Ungültiges Feld: ${part}`);
      let a = m[1] === '*' ? min : +m[1], b = m[2] !== undefined ? +m[2] : (m[1] === '*' || m[3] ? max : a);
      const st = m[3] ? +m[3] : 1;
      if (a < min || b > max || a > b || st < 1) throw new Error(`Wert ausserhalb ${min}–${max}: ${part}`);
      for (let v = a; v <= b; v += st) set.add(idx === 4 && v === 7 ? 0 : v);
    }
    return set;
  };
  const parseCron = (expr) => {
    expr = MACROS[expr.trim()] || expr.trim();
    const parts = expr.split(/\s+/);
    if (parts.length !== 5) throw new Error('Es werden genau 5 Felder erwartet: Minute Stunde Tag Monat Wochentag');
    const norm = parts.map((p, i) => {
      let x = p.toLowerCase();
      if (i === 3) MON.forEach((m, k) => { x = x.replace(new RegExp(m, 'g'), String(k + 1)); });
      if (i === 4) DOW.forEach((d, k) => { x = x.replace(new RegExp(d, 'g'), String(k)); });
      return x;
    });
    return { sets: norm.map((p, i) => parseField(p, CRON_F[i], i)), raw: norm };
  };
  const nextRuns = ({ sets, raw }, n = 8) => {
    const [mi, h, dom, mon, dow] = sets;
    const domStar = raw[2] === '*', dowStar = raw[4] === '*';
    const out = []; const d = new Date(); d.setSeconds(0, 0); d.setMinutes(d.getMinutes() + 1);
    for (let i = 0; i < 600000 && out.length < n; i++) {
      const dayOk = domStar && dowStar ? true : domStar ? dow.has(d.getDay()) : dowStar ? dom.has(d.getDate()) : dom.has(d.getDate()) || dow.has(d.getDay());
      if (!mon.has(d.getMonth() + 1) || !dayOk) { d.setDate(d.getDate() + 1); d.setHours(0, 0, 0, 0); continue; }
      if (!h.has(d.getHours())) { d.setHours(d.getHours() + 1, 0, 0, 0); continue; }
      if (mi.has(d.getMinutes())) out.push(new Date(d));
      d.setMinutes(d.getMinutes() + 1);
    }
    return out;
  };
  const describe = ({ raw }) => {
    const [m, h, dom, mon, dow] = raw;
    const list = (s, names, off = 0) => s.split(',').map((x) => names ? x.replace(/\d+/g, (n) => names[+n - off] || n) : x).join(', ');
    let t = '';
    if (m === '*' && h === '*') t = 'Jede Minute';
    else if (/^\*\/\d+$/.test(m) && h === '*') t = `Alle ${m.slice(2)} Minuten`;
    else if (/^\d+$/.test(m) && h === '*') t = `Stündlich zur Minute ${m}`;
    else if (/^\d+$/.test(m) && /^\d+$/.test(h)) t = `Um ${h.padStart(2, '0')}:${m.padStart(2, '0')} Uhr`;
    else if (/^\d+$/.test(m) && /^\*\/\d+$/.test(h)) t = `Alle ${h.slice(2)} Stunden zur Minute ${m}`;
    else if (/^\*\/\d+$/.test(m) && /^\d+-\d+$/.test(h)) t = `Alle ${m.slice(2)} Minuten zwischen ${h.split('-')[0].padStart(2, '0')}:00 und ${h.split('-')[1].padStart(2, '0')}:59 Uhr`;
    else if (/^\d+$/.test(m) && /^[\d,]+$/.test(h)) t = `Um ${h.split(',').map((x) => x.padStart(2, '0') + ':' + m.padStart(2, '0')).join(', ')} Uhr`;
    else t = `Minute ${m}, Stunde ${h}`;
    if (dom !== '*') t += `, am ${list(dom)}. des Monats`;
    if (mon !== '*') t += `, im ${/^\d/.test(mon) ? list(mon, MON_DE, 1) : mon}`;
    if (dow !== '*') t += `${dom !== '*' ? ' oder' : ','} am ${/^[\d,-]+$/.test(dow) ? dow.split(',').map((x) => x.includes('-') ? x.split('-').map((y) => DOW_DE[+y % 7]).join(' bis ') : DOW_DE[+x % 7]).join(', ') : dow}`;
    return t;
  };

  register({
    id: 'cron', name: 'Cron-Ausdrücke', glyph: '* *', cat: 'dev',
    desc: 'Cron-Jobs erklären lassen und die nächsten Ausführungen berechnen.', keywords: 'crontab schedule job launchd',
    render(root, U) {
      const EX = [['*/5 * * * *', 'Alle 5 Min.'], ['0 2 * * *', 'Täglich 02:00'], ['30 7 * * 1-5', 'Werktags 07:30'], ['0 0 1 * *', 'Monatsanfang'], ['0 */6 * * *', 'Alle 6 Std.'], ['@weekly', '@weekly']];
      root.innerHTML = `<div class="panel"><input id="in" class="mono" value="30 7 * * 1-5" style="font-size:20px;text-align:center;letter-spacing:.1em"/>
        <div class="row" style="justify-content:center;margin-top:10px">${CRON_F.map(([l]) => `<span class="badge" style="min-width:90px;justify-content:center">${l}</span>`).join('')}</div>
        <div class="row" style="justify-content:center;margin-top:12px">${EX.map(([e, l]) => `<button class="btn btn-sm" data-ex="${e}">${l}</button>`).join('')}</div></div>
        <div class="panel"><div id="desc" style="font-size:17px;font-weight:600"></div><div id="msg"></div></div>
        <div class="panel"><h3>Nächste Ausführungen</h3><div id="next"></div></div>`;
      const run = () => {
        U.q('#msg').innerHTML = '';
        try {
          const c = parseCron(U.q('#in').value);
          U.q('#desc').textContent = describe(c);
          const r = nextRuns(c);
          U.q('#next').innerHTML = r.length ? '<div class="tbl-wrap"><table class="tbl">' + r.map((d, i) => `<tr><td class="muted">${i + 1}</td><td>${DOW_DE[d.getDay()]}</td><td class="mono">${d.toLocaleString('de-CH', { dateStyle: 'medium', timeStyle: 'short' })}</td></tr>`).join('') + '</table></div>' : '<span class="muted">Keine Ausführung in absehbarer Zeit</span>';
        } catch (e) { U.q('#desc').textContent = ''; U.q('#next').innerHTML = ''; U.q('#msg').innerHTML = `<div class="msg err">${U.esc(e.message)}</div>`; }
      };
      U.q('#in').oninput = run;
      U.qa('[data-ex]').forEach((b) => { b.onclick = () => { U.q('#in').value = b.dataset.ex; run(); }; });
      run();
    },
  });

  register({
    id: 'chmod', name: 'chmod-Rechner', glyph: '755', cat: 'dev',
    desc: 'Unix-Dateirechte zwischen Oktal, Symbolik und Checkboxen umrechnen.', keywords: 'permissions unix linux chmod rwx octal',
    render(root, U) {
      const W = [['u', 'Besitzer'], ['g', 'Gruppe'], ['o', 'Andere']], P = [['r', 'Lesen', 4], ['w', 'Schreiben', 2], ['x', 'Ausführen', 1]];
      root.innerHTML = `<div class="panel"><div class="tbl-wrap"><table class="tbl"><tr><th></th>${P.map(([, l]) => `<th>${l}</th>`).join('')}</tr>
        ${W.map(([w, l]) => `<tr><td><b>${l}</b></td>${P.map(([p]) => `<td><input type="checkbox" data-w="${w}" data-p="${p}"></td>`).join('')}</tr>`).join('')}</table></div>
        <div class="row" style="margin-top:14px;gap:18px"><label class="check"><input type="checkbox" id="suid"> SUID</label><label class="check"><input type="checkbox" id="sgid"> SGID</label><label class="check"><input type="checkbox" id="sticky"> Sticky</label></div></div>
        <div class="cols"><div class="panel"><div class="field"><div class="label">Oktal</div><input id="oct" class="mono big" style="font-size:26px" value="755"/></div></div><div class="panel"><div class="field"><div class="label">Symbolisch</div><input id="sym" class="mono big" style="font-size:26px" readonly/></div></div></div>
        <div class="panel"><div id="cmd"></div><div class="row small" style="margin-top:12px">Häufig: ${['644', '755', '600', '700', '775', '777', '400', '1777'].map((x) => `<button class="btn btn-sm" data-o="${x}">${x}</button>`).join('')}</div></div>`;
      const fromChecks = () => {
        let sp = (U.q('#suid').checked ? 4 : 0) + (U.q('#sgid').checked ? 2 : 0) + (U.q('#sticky').checked ? 1 : 0);
        const d = W.map(([w]) => P.reduce((a, [p, , v]) => a + (U.q(`[data-w="${w}"][data-p="${p}"]`).checked ? v : 0), 0));
        U.q('#oct').value = (sp ? sp : '') + d.join(''); render();
      };
      const render = () => {
        const o = U.q('#oct').value.trim();
        if (!/^[0-7]{3,4}$/.test(o)) { U.q('#sym').value = 'ungültig'; return; }
        const s = o.length === 4 ? +o[0] : 0, d = o.slice(-3).split('').map(Number);
        W.forEach(([w], i) => P.forEach(([p, , v]) => { U.q(`[data-w="${w}"][data-p="${p}"]`).checked = !!(d[i] & v); }));
        U.q('#suid').checked = !!(s & 4); U.q('#sgid').checked = !!(s & 2); U.q('#sticky').checked = !!(s & 1);
        let sym = d.map((x) => (x & 4 ? 'r' : '-') + (x & 2 ? 'w' : '-') + (x & 1 ? 'x' : '-')).join('').split('');
        if (s & 4) sym[2] = sym[2] === 'x' ? 's' : 'S';
        if (s & 2) sym[5] = sym[5] === 'x' ? 's' : 'S';
        if (s & 1) sym[8] = sym[8] === 'x' ? 't' : 'T';
        U.q('#sym').value = '-' + sym.join('');
        const symCmd = W.map(([w], i) => `${w}=${(d[i] & 4 ? 'r' : '') + (d[i] & 2 ? 'w' : '') + (d[i] & 1 ? 'x' : '')}`).join(',');
        U.q('#cmd').innerHTML = U.kv([['Befehl', `chmod ${o} datei`], ['Rekursiv', `chmod -R ${o} ordner/`], ['Symbolisch', `chmod ${symCmd} datei`]]);
      };
      U.qa('input[type=checkbox]').forEach((c) => { c.onchange = fromChecks; });
      U.q('#oct').oninput = render;
      U.qa('[data-o]').forEach((b) => { b.onclick = () => { U.q('#oct').value = b.dataset.o; render(); }; });
      render();
    },
  });

  register({
    id: 'qr', name: 'QR-Code Generator', glyph: 'QR', cat: 'dev',
    desc: 'QR-Codes für Text, URLs, WLAN-Zugang oder Kontakte – als PNG/SVG.', keywords: 'qr code wifi wlan vcard barcode',
    render(root, U) {
      root.innerHTML = `<div class="cols"><div class="panel">
          <div class="seg" id="type" style="margin-bottom:14px"><button class="on" data-v="text">Text / URL</button><button data-v="wifi">WLAN</button><button data-v="vcard">Kontakt</button><button data-v="mail">E-Mail</button></div>
          <div id="f-text"><div class="field"><div class="label">Inhalt</div><textarea id="txt" style="min-height:100px">https://github.com/swissnand</textarea></div></div>
          <div id="f-wifi" hidden><div class="field"><div class="label">Netzwerkname (SSID)</div><input id="ssid" value="SWISSNAND-Gast"/></div><div class="field"><div class="label">Passwort</div><input id="wpw"/></div>
            <div class="row"><select id="enc" style="width:auto"><option value="WPA">WPA/WPA2/WPA3</option><option value="WEP">WEP</option><option value="nopass">Offen</option></select><label class="check"><input type="checkbox" id="hid"> Verstecktes Netz</label></div></div>
          <div id="f-vcard" hidden><div class="cols"><div class="field"><div class="label">Vorname</div><input id="vf"/></div><div class="field"><div class="label">Nachname</div><input id="vl"/></div></div>
            <div class="field"><div class="label">Firma</div><input id="vo" value="SWISSNAND"/></div><div class="cols"><div class="field"><div class="label">Telefon</div><input id="vt"/></div><div class="field"><div class="label">E-Mail</div><input id="ve"/></div></div><div class="field"><div class="label">Website</div><input id="vw"/></div></div>
          <div id="f-mail" hidden><div class="field"><div class="label">Empfänger</div><input id="mt"/></div><div class="field"><div class="label">Betreff</div><input id="ms"/></div><div class="field"><div class="label">Text</div><textarea id="mb" style="min-height:70px"></textarea></div></div>
          <div class="cols" style="margin-top:12px"><div class="field"><div class="label">Fehlerkorrektur</div><select id="ec"><option value="L">L (7 %)</option><option value="M" selected>M (15 %)</option><option value="Q">Q (25 %)</option><option value="H">H (30 %)</option></select></div>
          <div class="field"><div class="label">Farbe</div><div class="row"><input type="color" id="fg" value="#004984"/><input type="color" id="bg" value="#ffffff"/></div></div></div></div>
        <div class="panel"><div class="qr-box" id="qr"></div><div class="row" style="margin-top:14px;justify-content:center"><button class="btn btn-primary" id="png">${U.icon('download')}PNG</button><button class="btn" id="svg">${U.icon('download')}SVG</button><button class="btn" id="cpy">${U.icon('copy')}Inhalt</button></div><div id="msg"></div></div></div>`;
      let type = 'text', data = '', svgStr = '', qrObj = null;
      const wesc = (s) => s.replace(/([\\;,:"])/g, '\\$1');
      const content = () => {
        if (type === 'wifi') return `WIFI:T:${U.q('#enc').value};S:${wesc(U.q('#ssid').value)};${U.q('#enc').value !== 'nopass' ? `P:${wesc(U.q('#wpw').value)};` : ''}${U.q('#hid').checked ? 'H:true;' : ''};`;
        if (type === 'vcard') return ['BEGIN:VCARD', 'VERSION:3.0', `N:${U.q('#vl').value};${U.q('#vf').value}`, `FN:${U.q('#vf').value} ${U.q('#vl').value}`.trim(), U.q('#vo').value && `ORG:${U.q('#vo').value}`, U.q('#vt').value && `TEL:${U.q('#vt').value}`, U.q('#ve').value && `EMAIL:${U.q('#ve').value}`, U.q('#vw').value && `URL:${U.q('#vw').value}`, 'END:VCARD'].filter(Boolean).join('\n');
        if (type === 'mail') return `mailto:${U.q('#mt').value}?subject=${encodeURIComponent(U.q('#ms').value)}&body=${encodeURIComponent(U.q('#mb').value)}`;
        return U.q('#txt').value;
      };
      const run = () => {
        data = content(); U.q('#msg').innerHTML = '';
        if (!data) { U.q('#qr').innerHTML = ''; return; }
        try {
          qrObj = window.qrcode(0, U.q('#ec').value); qrObj.addData(data); qrObj.make();
          const n = qrObj.getModuleCount(), q = 4, sz = n + q * 2, fg = U.q('#fg').value, bg = U.q('#bg').value;
          let path = '';
          for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qrObj.isDark(r, c)) path += `M${c + q} ${r + q}h1v1h-1z`;
          svgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sz} ${sz}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="${bg}"/><path d="${path}" fill="${fg}"/></svg>`;
          U.q('#qr').innerHTML = svgStr; U.q('#qr').style.background = bg;
        } catch { U.q('#qr').innerHTML = ''; U.q('#msg').innerHTML = '<div class="msg err">Inhalt zu lang für einen QR-Code</div>'; }
      };
      U.q('#type').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; type = b.dataset.v; U.qa('#type button').forEach((x) => x.classList.toggle('on', x === b)); ['text', 'wifi', 'vcard', 'mail'].forEach((t) => { U.q('#f-' + t).hidden = t !== type; }); run(); };
      root.querySelectorAll('input,textarea,select').forEach((el) => el.addEventListener('input', U.debounce(run, 120)));
      U.q('#svg').onclick = () => svgStr && U.download('qrcode.svg', svgStr, 'image/svg+xml');
      U.q('#cpy').onclick = () => U.copy(data);
      U.q('#png').onclick = () => {
        if (!svgStr) return;
        const img = new Image(), cv = document.createElement('canvas'); cv.width = cv.height = 1024;
        img.onload = () => { const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(img, 0, 0, 1024, 1024); cv.toBlob((b) => U.download('qrcode.png', b), 'image/png'); };
        img.src = 'data:image/svg+xml;base64,' + U.bytesToB64(U.utf8.enc(svgStr));
      };
      run();
    },
  });

  /* ---------- SQL Formatter ---------- */
  const SQL_KW = ['select', 'from', 'where', 'and', 'or', 'not', 'in', 'is', 'null', 'like', 'between', 'join', 'inner', 'left', 'right', 'full', 'outer', 'cross', 'on', 'as', 'group', 'by', 'order', 'having', 'limit', 'offset', 'insert', 'into', 'values', 'update', 'set', 'delete', 'create', 'table', 'alter', 'drop', 'index', 'distinct', 'union', 'all', 'case', 'when', 'then', 'else', 'end', 'asc', 'desc', 'with', 'exists', 'primary', 'key', 'foreign', 'references', 'default', 'count', 'sum', 'avg', 'min', 'max', 'returning', 'top'];
  const CLAUSES = ['left outer join', 'right outer join', 'full outer join', 'select distinct', 'group by', 'order by', 'insert into', 'delete from', 'union all', 'left join', 'right join', 'inner join', 'full join', 'cross join', 'select', 'from', 'where', 'having', 'limit', 'offset', 'values', 'update', 'set', 'union', 'join', 'with', 'returning'];
  const LIST = new Set(['select', 'select distinct', 'group by', 'order by', 'set', 'returning']);
  const NOSPACE_BEFORE_PAREN = /^[\w$.`"]+$/;
  const fmtSQL = (sql, upper, ind = '  ') => {
    const raw = sql.match(/'(?:[^']|'')*'|"[^"]*"|`[^`]*`|--[^\n]*|\/\*[\s\S]*?\*\/|[\w.$@:]+|<>|!=|<=|>=|\|\||[(),;]|\S/g) || [];
    const kw = (t) => (SQL_KW.includes(t.toLowerCase()) ? (upper ? t.toUpperCase() : t.toLowerCase()) : t);
    const toks = [];
    for (let i = 0; i < raw.length; i++) {
      let hit = null;
      for (const c of CLAUSES) { const n = c.split(' ').length; if (raw.slice(i, i + n).join(' ').toLowerCase() === c) { hit = c; break; } }
      if (hit) { toks.push({ t: upper ? hit.toUpperCase() : hit, clause: hit }); i += hit.split(' ').length - 1; }
      else toks.push({ t: kw(raw[i]) });
    }
    const lines = []; let cur = '', curInd = 0, depth = 0, list = false, between = false, prev = '';
    const nl = () => { if (cur.trim()) lines.push(ind.repeat(curInd) + cur.trim()); cur = ''; };
    for (const tok of toks) {
      const t = tok.t, lt = t.toLowerCase();
      if (tok.clause && depth === 0) {
        nl(); list = LIST.has(tok.clause);
        if (list) { lines.push(t); curInd = 1; } else { cur = t + ' '; curInd = 0; }
      } else if (t === ',') {
        cur = cur.trimEnd() + ',';
        if (list && depth === 0) nl(); else cur += ' ';
      } else if (t === '(') {
        if (NOSPACE_BEFORE_PAREN.test(prev) && !['in', 'values', 'as', 'and', 'or', 'on', 'exists', 'not'].includes(prev.toLowerCase())) cur = cur.trimEnd();
        cur += '('; depth++;
      } else if (t === ')') {
        cur = cur.trimEnd() + ') '; depth = Math.max(0, depth - 1);
      } else if (t === ';') {
        cur = cur.trimEnd() + ';'; nl(); lines.push(''); curInd = 0; depth = 0; list = false;
      } else if (t.startsWith('--')) {
        cur += t; nl();
      } else if ((lt === 'and' || lt === 'or') && depth === 0 && !between) {
        nl(); cur = t + ' '; curInd = list ? 2 : 1;
      } else {
        if (lt === 'between') between = true;
        else if (lt === 'and') between = false;
        cur += t + ' ';
      }
      prev = t;
    }
    nl();
    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  };

  register({
    id: 'sql', name: 'SQL Formatter', glyph: 'SQL', cat: 'dev',
    desc: 'SQL-Abfragen lesbar formatieren oder auf eine Zeile minifizieren.', keywords: 'sql format beautify query database',
    render(root, U) {
      root.innerHTML = `<div class="panel"><div class="row" style="margin-bottom:12px"><button class="btn btn-primary" id="fmt">Formatieren</button><button class="btn" id="min">Einzeilig</button><label class="check"><input type="checkbox" id="up" checked> Keywords GROSS</label><span class="spacer"></span><button class="btn" data-copy="#out">${U.icon('copy')}Kopieren</button></div>
        <div class="cols"><textarea id="in" style="min-height:360px" spellcheck="false">select u.id, u.name, count(o.id) as bestellungen from users u left join orders o on o.user_id = u.id where u.active = 1 and u.created_at > '2026-01-01' group by u.id, u.name having count(o.id) > 5 order by bestellungen desc limit 20;</textarea><textarea id="out" readonly style="min-height:360px"></textarea></div></div>`;
      const f = () => { U.q('#out').value = fmtSQL(U.q('#in').value, U.q('#up').checked, '  '); };
      U.q('#fmt').onclick = f; U.q('#up').onchange = f; U.q('#in').oninput = U.debounce(f, 200);
      U.q('#min').onclick = () => { U.q('#out').value = U.q('#in').value.replace(/--[^\n]*/g, '').replace(/\s+/g, ' ').replace(/\s*([(),;])\s*/g, '$1 ').replace(/\( /g, '(').replace(/ \)/g, ')').trim(); };
      f();
    },
  });

  const GITIGNORE = {
    macOS: '.DS_Store\n.AppleDouble\n.LSOverride\n._*\n.Spotlight-V100\n.Trashes\n.fseventsd',
    Windows: 'Thumbs.db\nehthumbs.db\nDesktop.ini\n$RECYCLE.BIN/',
    Linux: '*~\n.directory\n.Trash-*',
    Node: 'node_modules/\nnpm-debug.log*\nyarn-error.log*\n.pnpm-store/\ndist/\nbuild/\n.npm/\n.eslintcache',
    Python: '__pycache__/\n*.py[cod]\n.venv/\nvenv/\nenv/\n*.egg-info/\n.pytest_cache/\n.mypy_cache/\n.ipynb_checkpoints/',
    'Next.js': '.next/\nout/\n.vercel/\nnext-env.d.ts',
    Java: '*.class\n*.jar\n*.war\ntarget/\n.gradle/\nbuild/',
    Go: '*.exe\n*.test\n*.out\nvendor/\ngo.work',
    Rust: 'target/\n**/*.rs.bk\nCargo.lock',
    Swift: '.build/\nDerivedData/\n*.xcuserstate\nxcuserdata/\n*.ipa\nPods/',
    Docker: '.docker/\ndocker-compose.override.yml',
    Terraform: '.terraform/\n*.tfstate\n*.tfstate.*\ncrash.log\n*.tfvars\n.terraform.lock.hcl',
    'VS Code': '.vscode/*\n!.vscode/settings.json\n!.vscode/extensions.json',
    JetBrains: '.idea/\n*.iml',
    Secrets: '.env\n.env.*\n!.env.example\n*.pem\n*.key\nsecrets/\ncredentials.json',
    Logs: 'logs/\n*.log\n*.tmp\n*.bak',
  };

  register({
    id: 'gitignore', name: '.gitignore Generator', glyph: 'GIT', cat: 'dev',
    desc: '.gitignore-Dateien aus Vorlagen für Systeme, Sprachen und Tools bauen.', keywords: 'git ignore template',
    render(root, U) {
      root.innerHTML = `<div class="panel"><div class="row">${Object.keys(GITIGNORE).map((k) => `<label class="check" style="min-width:120px"><input type="checkbox" value="${k}" ${['macOS', 'Node', 'Secrets', 'Logs'].includes(k) ? 'checked' : ''}> ${k}</label>`).join('')}</div></div>
        <div class="panel"><div class="row" style="margin-bottom:10px"><span class="spacer"></span><button class="btn" data-copy="#out">${U.icon('copy')}Kopieren</button><button class="btn btn-primary" id="dl">${U.icon('download')}.gitignore speichern</button></div><textarea id="out" readonly style="min-height:360px"></textarea></div>`;
      const run = () => { U.q('#out').value = U.qa('input:checked').map((c) => `# ===== ${c.value} =====\n${GITIGNORE[c.value]}`).join('\n\n') + '\n'; };
      U.qa('input[type=checkbox]').forEach((c) => { c.onchange = run; });
      U.q('#dl').onclick = () => U.download('.gitignore', U.q('#out').value);
      run();
    },
  });

  register({
    id: 'curl', name: 'curl Builder', glyph: 'cURL', cat: 'dev',
    desc: 'HTTP-Requests zusammenklicken und als curl, fetch oder Python-Code exportieren.', keywords: 'http request api rest curl fetch python requests',
    render(root, U) {
      root.innerHTML = `<div class="panel"><div class="row"><select id="m" style="width:auto">${['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map((x) => `<option>${x}</option>`).join('')}</select><input id="url" class="mono grow" value="https://api.example.com/v1/users"/></div>
        <div class="cols" style="margin-top:12px"><div class="field"><div class="label">Header <span class="hint">Name: Wert pro Zeile</span></div><textarea id="h" style="min-height:110px">Accept: application/json\nAuthorization: Bearer TOKEN</textarea></div>
        <div class="field"><div class="label">Body</div><textarea id="b" style="min-height:110px">{"name": "Andrin"}</textarea></div></div>
        <div class="row"><label class="check"><input type="checkbox" id="k"> -k (TLS ignorieren)</label><label class="check"><input type="checkbox" id="v"> -v (verbose)</label><label class="check"><input type="checkbox" id="L" checked> -L (Redirects folgen)</label></div></div>
        <div class="panel"><div id="res"></div></div>`;
      const run = () => {
        const m = U.q('#m').value, url = U.q('#url').value.trim(), body = U.q('#b').value;
        const hs = U.q('#h').value.split('\n').map((l) => l.trim()).filter((l) => l.includes(':')).map((l) => [l.slice(0, l.indexOf(':')).trim(), l.slice(l.indexOf(':') + 1).trim()]);
        const hasBody = body.trim() && !['GET', 'HEAD'].includes(m);
        if (hasBody && /^\s*[{[]/.test(body) && !hs.some(([k]) => k.toLowerCase() === 'content-type')) hs.push(['Content-Type', 'application/json']);
        const sq = (s) => "'" + s.replace(/'/g, "'\\''") + "'";
        const flags = [U.q('#L').checked && '-L', U.q('#k').checked && '-k', U.q('#v').checked && '-v'].filter(Boolean).join(' ');
        const curl = [`curl ${flags ? flags + ' ' : ''}-X ${m} ${sq(url)}`, ...hs.map(([k, v]) => `  -H ${sq(k + ': ' + v)}`), hasBody && `  --data ${sq(body)}`].filter(Boolean).join(' \\\n');
        const fetchC = `const res = await fetch(${JSON.stringify(url)}, {\n  method: ${JSON.stringify(m)},\n  headers: ${JSON.stringify(Object.fromEntries(hs), null, 2).replace(/\n/g, '\n  ')},${hasBody ? `\n  body: ${JSON.stringify(body)},` : ''}\n});\nconst data = await res.json();`;
        const py = `import requests\n\nr = requests.request(\n    ${JSON.stringify(m)},\n    ${JSON.stringify(url)},\n    headers=${JSON.stringify(Object.fromEntries(hs))},${hasBody ? `\n    data=${JSON.stringify(body)},` : ''}${U.q('#k').checked ? '\n    verify=False,' : ''}\n)\nprint(r.status_code, r.text)`;
        U.q('#res').innerHTML = [['curl', curl], ['JavaScript fetch', fetchC], ['Python requests', py]].map(([l, c]) => `<div class="field"><div class="label">${l} <span class="hint"><button class="copy-btn" data-copy-text="${U.esc(c)}">${U.icon('copy')}</button></span></div><pre class="out">${U.esc(c)}</pre></div>`).join('');
      };
      root.querySelectorAll('input,textarea,select').forEach((el) => el.addEventListener('input', run));
      run();
    },
  });

  register({
    id: 'docker-compose', name: 'docker run → Compose', glyph: 'DKR', cat: 'dev',
    desc: 'docker run-Befehle in eine docker-compose.yml umwandeln.', keywords: 'docker compose container yaml',
    render(root, U) {
      root.innerHTML = `<div class="panel"><div class="field"><div class="label">docker run …</div><textarea id="in" style="min-height:120px" spellcheck="false">docker run -d --name pihole -p 53:53/tcp -p 53:53/udp -p 8080:80 -e TZ=Europe/Zurich -e WEBPASSWORD=geheim -v ./etc-pihole:/etc/pihole --restart unless-stopped --dns 1.1.1.1 pihole/pihole:latest</textarea></div><div id="msg"></div></div>
        <div class="panel"><div class="row" style="margin-bottom:10px"><h3 style="margin:0">docker-compose.yml</h3><span class="spacer"></span><button class="btn" data-copy="#out">${U.icon('copy')}Kopieren</button></div><textarea id="out" readonly style="min-height:320px"></textarea></div>`;
      const tokenize = (s) => (s.replace(/\\\n/g, ' ').match(/"[^"]*"|'[^']*'|\S+/g) || []).map((t) => t.replace(/^["']|["']$/g, ''));
      const run = () => {
        const t = tokenize(U.q('#in').value); U.q('#msg').innerHTML = '';
        let i = t.indexOf('run'); if (i < 0) { U.q('#out').value = ''; return; }
        const svc = { ports: [], environment: [], volumes: [], dns: [], labels: [], networks: [], cap_add: [], devices: [], extra_hosts: [] };
        let name = 'app', image = '', cmd = [];
        const takesArg = ['-p', '--publish', '-e', '--env', '-v', '--volume', '--name', '--restart', '--network', '--net', '--dns', '-l', '--label', '-h', '--hostname', '-w', '--workdir', '-u', '--user', '--cap-add', '--device', '--add-host', '--entrypoint', '--env-file', '-m', '--memory', '--cpus', '--platform', '--mount'];
        for (i = i + 1; i < t.length; i++) {
          let f = t[i], v;
          if (!image && f.startsWith('-')) {
            if (f.includes('=') && f.startsWith('--')) [f, v] = [f.slice(0, f.indexOf('=')), f.slice(f.indexOf('=') + 1)];
            else if (takesArg.includes(f)) v = t[++i];
            switch (f) {
              case '-p': case '--publish': svc.ports.push(v); break;
              case '-e': case '--env': svc.environment.push(v); break;
              case '-v': case '--volume': svc.volumes.push(v); break;
              case '--name': name = v; svc.container_name = v; break;
              case '--restart': svc.restart = v; break;
              case '--network': case '--net': if (v === 'host') svc.network_mode = 'host'; else svc.networks.push(v); break;
              case '--dns': svc.dns.push(v); break;
              case '-l': case '--label': svc.labels.push(v); break;
              case '-h': case '--hostname': svc.hostname = v; break;
              case '-w': case '--workdir': svc.working_dir = v; break;
              case '-u': case '--user': svc.user = v; break;
              case '--cap-add': svc.cap_add.push(v); break;
              case '--device': svc.devices.push(v); break;
              case '--add-host': svc.extra_hosts.push(v); break;
              case '--entrypoint': svc.entrypoint = v; break;
              case '--env-file': svc.env_file = v; break;
              case '-m': case '--memory': svc.mem_limit = v; break;
              case '--cpus': svc.cpus = v; break;
              case '--platform': svc.platform = v; break;
              case '--privileged': svc.privileged = true; break;
              case '-it': case '-ti': case '-t': svc.tty = true; if (f !== '-t') svc.stdin_open = true; break;
              case '-i': svc.stdin_open = true; break;
              case '--rm': case '-d': case '--detach': break;
              default: if (/^-[a-z]{2,}$/.test(f)) { if (f.includes('t')) svc.tty = true; if (f.includes('i')) svc.stdin_open = true; }
            }
          } else if (!image) image = f; else cmd.push(f);
        }
        if (!image) { U.q('#msg').innerHTML = '<div class="msg err">Kein Image gefunden</div>'; return; }
        const q = (s) => /[:{}[\],&*#?|<>=!%@`'"]|^\s|\s$/.test(String(s)) ? JSON.stringify(String(s)) : String(s);
        const L = ['services:', `  ${name.replace(/[^\w.-]/g, '_')}:`, `    image: ${q(image)}`];
        const order = ['container_name', 'hostname', 'platform', 'restart', 'user', 'working_dir', 'entrypoint', 'network_mode', 'privileged', 'tty', 'stdin_open', 'mem_limit', 'cpus', 'env_file'];
        for (const k of order) if (svc[k] !== undefined) L.push(`    ${k}: ${q(svc[k])}`);
        if (cmd.length) L.push(`    command: ${JSON.stringify(cmd)}`);
        for (const k of ['ports', 'environment', 'volumes', 'dns', 'labels', 'networks', 'cap_add', 'devices', 'extra_hosts']) if (svc[k].length) { L.push(`    ${k}:`); svc[k].forEach((x) => L.push(`      - ${q(x)}`)); }
        const named = svc.volumes.map((v) => v.split(':')[0]).filter((v) => v && !/^[./~$]/.test(v));
        if (named.length) { L.push('', 'volumes:'); [...new Set(named)].forEach((v) => L.push(`  ${v}:`)); }
        if (svc.networks.length) { L.push('', 'networks:'); svc.networks.forEach((n) => L.push(`  ${n}:`, '    external: true')); }
        U.q('#out').value = L.join('\n') + '\n';
      };
      U.q('#in').oninput = run; run();
    },
  });
})();
