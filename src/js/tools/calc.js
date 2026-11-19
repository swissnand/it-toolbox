/* Kategorie: Rechner */
(() => {
  'use strict';
  const { register } = window.TB;

  const UNITS = [['B', 1], ['KB', 1e3], ['MB', 1e6], ['GB', 1e9], ['TB', 1e12], ['PB', 1e15], ['KiB', 1024], ['MiB', 1024 ** 2], ['GiB', 1024 ** 3], ['TiB', 1024 ** 4], ['PiB', 1024 ** 5], ['bit', 1 / 8], ['Kbit', 125], ['Mbit', 125e3], ['Gbit', 125e6]];
  const human = (b, si = true) => {
    const base = si ? 1000 : 1024, u = si ? ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] : ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
    let i = 0; while (b >= base && i < u.length - 1) { b /= base; i++; }
    return window.TB.util.fmtNum(b, 2) + ' ' + u[i];
  };
  const fmtDur = (s) => {
    if (!isFinite(s)) return '—';
    if (s < 1) return window.TB.util.fmtNum(s * 1000, 0) + ' ms';
    const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = Math.round(s % 60);
    return [d && d + ' T', h && h + ' h', m && m + ' min', (sec || (!d && !h && !m)) && sec + ' s'].filter(Boolean).join(' ');
  };

  register({
    id: 'data-size', name: 'Datengrössen', glyph: 'GiB', cat: 'calc',
    desc: 'Bytes, KB, MB, GB, TB (dezimal) und KiB, MiB, GiB (binär) umrechnen.', keywords: 'bytes megabyte gigabyte gibibyte storage convert',
    render(root, U) {
      root.innerHTML = `<div class="panel"><div class="row"><input type="number" id="v" value="500" class="grow" style="font-size:18px"/><select id="u" style="width:auto">${UNITS.map(([u]) => `<option ${u === 'GB' ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
        <p class="small muted" style="margin-bottom:0">Tipp: Eine „500 GB“-SSD zeigt macOS als 500 GB (dezimal), Windows aber als ≈ 465 „GB“ (eigentlich GiB).</p></div>
        <div class="cols"><div class="panel"><h3>Dezimal (SI, 1000)</h3><div id="si"></div></div><div class="panel"><h3>Binär (IEC, 1024)</h3><div id="iec"></div></div></div>`;
      const run = () => {
        const b = (+U.q('#v').value || 0) * UNITS.find((x) => x[0] === U.q('#u').value)[1];
        const row = (u) => { const f = UNITS.find((x) => x[0] === u)[1]; return [u, U.fmtNum(b / f, 6)]; };
        U.q('#si').innerHTML = U.kv(['bit', 'B', 'KB', 'MB', 'GB', 'TB', 'PB'].map(row));
        U.q('#iec').innerHTML = U.kv(['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'].map(row));
      };
      U.q('#v').oninput = run; U.q('#u').onchange = run; run();
    },
  });

  register({
    id: 'transfer', name: 'Übertragungszeit', glyph: 'Mb/s', cat: 'calc',
    desc: 'Wie lange dauert ein Download/Backup bei gegebener Bandbreite?', keywords: 'bandwidth download upload speed transfer backup time',
    render(root, U) {
      root.innerHTML = `<div class="panel"><div class="cols-3">
          <div class="field"><div class="label">Datenmenge</div><div class="row"><input type="number" id="s" value="50" class="grow"/><select id="su" style="width:auto">${['MB', 'GB', 'TB', 'GiB', 'TiB'].map((u) => `<option ${u === 'GB' ? 'selected' : ''}>${u}</option>`).join('')}</select></div></div>
          <div class="field"><div class="label">Bandbreite</div><div class="row"><input type="number" id="b" value="100" class="grow"/><select id="bu" style="width:auto">${['Kbit', 'Mbit', 'Gbit', 'MB'].map((u) => `<option ${u === 'Mbit' ? 'selected' : ''} value="${u}">${u}/s</option>`).join('')}</select></div></div>
          <div class="field"><div class="label">Effizienz <span class="hint" id="ev"></span></div><input type="range" id="e" min="50" max="100" value="90"/></div></div></div>
        <div class="panel" style="text-align:center"><div class="small muted">Geschätzte Dauer</div><div class="big" id="res" style="font-size:38px;color:var(--accent-text)"></div></div>
        <div class="panel"><h3>Vergleich typischer Anschlüsse</h3><div id="cmp"></div></div>`;
      const run = () => {
        const bytes = (+U.q('#s').value || 0) * UNITS.find((x) => x[0] === U.q('#su').value)[1];
        const bps = (+U.q('#b').value || 0) * UNITS.find((x) => x[0] === U.q('#bu').value)[1];
        const eff = +U.q('#e').value / 100; U.q('#ev').textContent = U.q('#e').value + ' %';
        U.q('#res').textContent = bps ? fmtDur(bytes / (bps * eff)) : '—';
        U.q('#cmp').innerHTML = U.kv([['ADSL 16 Mbit/s', 2e6], ['VDSL 100 Mbit/s', 12.5e6], ['Glasfaser 1 Gbit/s', 125e6], ['Glasfaser 10 Gbit/s', 1.25e9], ['USB 3.0 (~400 MB/s)', 4e8], ['Thunderbolt NVMe (~2.8 GB/s)', 2.8e9]].map(([l, r]) => [l, fmtDur(bytes / (r * eff))]));
      };
      root.querySelectorAll('input,select').forEach((el) => el.addEventListener('input', run)); run();
    },
  });

  register({
    id: 'raid', name: 'RAID-Rechner', glyph: 'RAID', cat: 'calc',
    desc: 'Nutzbare Kapazität, Ausfallsicherheit und Leistung für RAID 0/1/5/6/10.', keywords: 'raid nas storage disk synology qnap zfs',
    render(root, U) {
      root.innerHTML = `<div class="panel"><div class="cols-3"><div class="field"><div class="label">Anzahl Disks</div><input type="number" id="n" value="4" min="1" max="64"/></div>
        <div class="field"><div class="label">Grösse pro Disk (TB)</div><input type="number" id="s" value="8" min="0" step="0.5"/></div>
        <div class="field"><div class="label">RAID-Level</div><select id="l"><option value="0">RAID 0 (Striping)</option><option value="1">RAID 1 (Mirror)</option><option value="5" selected>RAID 5 (Parität)</option><option value="6">RAID 6 (Doppelparität)</option><option value="10">RAID 10 (Mirror+Stripe)</option><option value="z3">RAID-Z3 / Triple-Parity</option></select></div></div><div id="msg"></div></div>
        <div class="panel"><div class="stat-grid" id="st"></div><div style="margin-top:14px"><div class="meter" style="height:14px"><i id="bar" style="background:var(--brand)"></i></div><div class="row small muted" style="margin-top:6px"><span>Nutzbar</span><span class="spacer"></span><span>Redundanz</span></div></div></div>
        <div class="panel"><h3>Alle Level im Vergleich</h3><div class="tbl-wrap"><table class="tbl" id="cmp"></table></div></div>`;
      const calc = (l, n, s) => {
        const R = { 0: [1, n * s, 0, n, n, 'Keine Redundanz'], 1: [2, s, n - 1, n, 1, 'Höchste Sicherheit, 50 % oder weniger nutzbar'], 5: [3, (n - 1) * s, 1, n - 1, n - 1, 'Guter Kompromiss, aber langer Rebuild'], 6: [4, (n - 2) * s, 2, n - 2, n - 2, 'Empfohlen für grosse Disks'], 10: [4, n / 2 * s, 1, n, n / 2, 'Schnell und sicher; Paare müssen gerade sein'], z3: [5, (n - 3) * s, 3, n - 3, n - 3, 'Für sehr grosse Pools'] }[l];
        if (n < R[0]) return { err: `Mindestens ${R[0]} Disks erforderlich` };
        if (l === '10' && n % 2) return { err: 'RAID 10 benötigt eine gerade Anzahl Disks' };
        return { usable: R[1], fail: R[2], read: R[3], write: R[4], note: R[5] };
      };
      const run = () => {
        const n = Math.max(1, +U.q('#n').value || 1), s = +U.q('#s').value || 0, l = U.q('#l').value;
        const r = calc(l, n, s); U.q('#msg').innerHTML = '';
        if (r.err) { U.q('#msg').innerHTML = `<div class="msg err">${r.err}</div>`; U.q('#st').innerHTML = ''; }
        else {
          const raw = n * s;
          U.q('#st').innerHTML = [['Nutzbar', U.fmtNum(r.usable) + ' TB'], ['Rohkapazität', U.fmtNum(raw) + ' TB'], ['In macOS/Windows', U.fmtNum(r.usable * 1e12 / 1024 ** 4) + ' TiB'], ['Effizienz', U.fmtNum(r.usable / raw * 100, 0) + ' %'], ['Darf ausfallen', r.fail + (r.fail === 1 ? ' Disk' : ' Disks')], ['Lesen', '≈ ' + r.read + '×'], ['Schreiben', '≈ ' + r.write + '×']].map(([k, v]) => `<div class="stat"><b>${v}</b><span>${k}</span></div>`).join('') + `<div class="stat" style="grid-column:1/-1"><span>${r.note}</span></div>`;
          U.q('#bar').style.width = (r.usable / raw * 100) + '%';
        }
        U.q('#cmp').innerHTML = '<tr><th>Level</th><th>Nutzbar</th><th>Effizienz</th><th>Ausfallsicher</th></tr>' + ['0', '1', '5', '6', '10', 'z3'].map((x) => { const c = calc(x, n, s); return `<tr${x === l ? ' style="background:var(--accent-soft)"' : ''}><td><b>${x === 'z3' ? 'RAID-Z3' : 'RAID ' + x}</b></td>${c.err ? `<td colspan="3" class="muted">${c.err}</td>` : `<td class="mono">${U.fmtNum(c.usable)} TB</td><td class="mono">${U.fmtNum(c.usable / (n * s || 1) * 100, 0)} %</td><td>${c.fail} Disk(s)</td>`}</tr>`; }).join('');
      };
      root.querySelectorAll('input,select').forEach((el) => el.addEventListener('input', run)); run();
    },
  });

  register({
    id: 'vat', name: 'MwSt-Rechner (CH)', glyph: '%', cat: 'calc',
    desc: 'Schweizer Mehrwertsteuer: Netto ↔ Brutto mit 8,1 %, 2,6 % oder 3,8 %.', keywords: 'mwst vat mehrwertsteuer schweiz steuer brutto netto',
    render(root, U) {
      root.innerHTML = `<div class="panel"><div class="row" style="margin-bottom:14px"><div class="seg" id="rate"><button class="on" data-v="8.1">8,1 % Normal</button><button data-v="2.6">2,6 % Reduziert</button><button data-v="3.8">3,8 % Beherbergung</button><button data-v="19">19 % DE</button><button data-v="20">20 % AT</button></div>
        <label class="check">Eigener Satz <input type="number" id="cr" step="0.1" style="width:90px"/> %</label></div>
        <div class="cols"><div class="field"><div class="label">Netto (exkl. MwSt)</div><input type="number" id="net" value="1000" step="0.05" style="font-size:18px"/></div><div class="field"><div class="label">Brutto (inkl. MwSt)</div><input type="number" id="gross" step="0.05" style="font-size:18px"/></div></div><div id="res" style="margin-top:6px"></div></div>`;
      let rate = 8.1;
      const r05 = (x) => Math.round(x * 20) / 20;
      const show = (n, g) => U.q('#res').innerHTML = U.kv([['Netto', 'CHF ' + n.toFixed(2)], ['MwSt ' + rate + ' %', 'CHF ' + (g - n).toFixed(2)], ['Brutto', 'CHF ' + g.toFixed(2)], ['Brutto gerundet (5 Rp.)', 'CHF ' + r05(g).toFixed(2)]]);
      const fromNet = () => { const n = +U.q('#net').value || 0, g = n * (1 + rate / 100); U.q('#gross').value = g.toFixed(2); show(n, g); };
      const fromGross = () => { const g = +U.q('#gross').value || 0, n = g / (1 + rate / 100); U.q('#net').value = n.toFixed(2); show(n, g); };
      U.q('#rate').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; rate = +b.dataset.v; U.q('#cr').value = ''; U.qa('#rate button').forEach((x) => x.classList.toggle('on', x === b)); fromNet(); };
      U.q('#cr').oninput = () => { if (U.q('#cr').value) { rate = +U.q('#cr').value; U.qa('#rate button').forEach((x) => x.classList.remove('on')); fromNet(); } };
      U.q('#net').oninput = fromNet; U.q('#gross').oninput = fromGross; fromNet();
    },
  });

  const IBAN_LEN = { CH: 21, LI: 21, DE: 22, AT: 20, FR: 27, IT: 27, ES: 24, NL: 18, BE: 16, LU: 20, GB: 22, IE: 22, PT: 25, DK: 18, SE: 24, NO: 15, FI: 18, PL: 28, CZ: 24, SK: 24, HU: 28, SI: 19, HR: 21, GR: 27, MT: 31, CY: 28, EE: 20, LV: 21, LT: 20, BG: 22, RO: 24, IS: 26, MC: 27, SM: 27, AD: 24, TR: 26 };

  register({
    id: 'iban', name: 'IBAN-Prüfer', glyph: 'IBAN', cat: 'calc',
    desc: 'IBAN validieren (Prüfziffer, Länge) und formatieren – inkl. QR-IBAN.', keywords: 'iban bank konto validate swift qr-rechnung',
    render(root, U) {
      root.innerHTML = `<div class="panel"><input id="in" class="mono" value="CH93 0076 2011 6238 5295 7" style="font-size:18px"/><div id="state" style="margin-top:12px"></div></div><div class="panel"><div id="res"></div></div>`;
      const mod97 = (s) => { let r = 0; for (const c of s) r = (r * (c.length > 1 ? 100 : 10) + +c) % 97; return r; };
      const run = () => {
        const s = U.q('#in').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (!s) { U.q('#state').innerHTML = ''; U.q('#res').innerHTML = ''; return; }
        const cc = s.slice(0, 2), len = IBAN_LEN[cc];
        const digits = (s.slice(4) + s.slice(0, 4)).split('').map((c) => /\d/.test(c) ? c : String(c.charCodeAt(0) - 55));
        const valid = /^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(s) && mod97(digits) === 1;
        const lenOk = !len || s.length === len;
        U.q('#state').innerHTML = valid && lenOk ? '<span class="badge ok">✓ Gültige IBAN</span>' : `<span class="badge err">✗ Ungültig</span> <span class="small muted">${!lenOk ? `Länge ${s.length}, erwartet ${len} für ${cc}` : 'Prüfziffer stimmt nicht'}</span>`;
        const rows = [['Formatiert', s.replace(/(.{4})/g, '$1 ').trim()], ['Elektronisch', s], ['Land', cc], ['Prüfziffer', s.slice(2, 4)]];
        if (cc === 'CH' || cc === 'LI') {
          const iid = s.slice(4, 9);
          rows.push(['Bank-Clearing (IID)', String(+iid)], ['Konto', s.slice(9)], ['QR-IBAN', +iid >= 30000 && +iid <= 31999 ? 'Ja – nur mit QR-Referenz verwendbar' : 'Nein (normale IBAN)']);
        }
        U.q('#res').innerHTML = U.kv(rows);
      };
      U.q('#in').oninput = run; run();
    },
  });

  register({
    id: 'aspect', name: 'Seitenverhältnis', glyph: '16:9', cat: 'calc',
    desc: 'Seitenverhältnisse berechnen und Auflösungen proportional skalieren.', keywords: 'aspect ratio resolution resize pixel',
    render(root, U) {
      root.innerHTML = `<div class="panel"><div class="cols-4"><div class="field"><div class="label">Breite</div><input type="number" id="w" value="1920"/></div><div class="field"><div class="label">Höhe</div><input type="number" id="h" value="1080"/></div>
        <div class="field"><div class="label">Neue Breite</div><input type="number" id="nw" value="1280"/></div><div class="field"><div class="label">Neue Höhe</div><input type="number" id="nh"/></div></div></div>
        <div class="cols"><div class="panel"><div id="res"></div></div><div class="panel"><div style="display:grid;place-items:center;height:200px"><div id="box" style="background:linear-gradient(135deg,#004984,#0a6fc2);border-radius:8px;display:grid;place-items:center;color:#fff;font:700 18px var(--mono)"></div></div></div></div>
        <div class="row small">${[['1280', '720'], ['1920', '1080'], ['2560', '1440'], ['3840', '2160'], ['2560', '1600'], ['3024', '1964'], ['1080', '1920']].map(([a, b]) => `<button class="btn btn-sm" data-r="${a}x${b}">${a}×${b}</button>`).join('')}</div>`;
      const gcd = (a, b) => b ? gcd(b, a % b) : a;
      const run = (src) => {
        const w = +U.q('#w').value, h = +U.q('#h').value;
        if (!w || !h) return;
        if (src === 'nh') U.q('#nw').value = Math.round(+U.q('#nh').value * w / h); else U.q('#nh').value = Math.round(+U.q('#nw').value * h / w);
        const g = gcd(w, h);
        U.q('#res').innerHTML = U.kv([['Verhältnis', `${w / g}:${h / g}`], ['Dezimal', (w / h).toFixed(4) + ':1'], ['Megapixel', U.fmtNum(w * h / 1e6) + ' MP'], ['Skaliert', `${U.q('#nw').value} × ${U.q('#nh').value}`]]);
        const s = Math.min(320 / w, 180 / h);
        Object.assign(U.q('#box').style, { width: w * s + 'px', height: h * s + 'px' }); U.q('#box').textContent = `${w / g}:${h / g}`;
      };
      ['w', 'h', 'nw', 'nh'].forEach((id) => U.q('#' + id).addEventListener('input', () => run(id)));
      U.qa('[data-r]').forEach((b) => { b.onclick = () => { const [w, h] = b.dataset.r.split('x'); U.q('#w').value = w; U.q('#h').value = h; run(); }; });
      run();
    },
  });

  register({
    id: 'power-cost', name: 'Stromkosten-Rechner', glyph: 'kWh', cat: 'calc',
    desc: 'Was kostet ein Server, NAS oder Rack im Dauerbetrieb pro Jahr?', keywords: 'strom energie kosten watt kwh server nas homelab',
    render(root, U) {
      root.innerHTML = `<div class="panel"><div class="cols-4"><div class="field"><div class="label">Leistung (Watt)</div><input type="number" id="w" value="45"/></div><div class="field"><div class="label">Stunden pro Tag</div><input type="number" id="h" value="24" max="24"/></div>
        <div class="field"><div class="label">Preis (CHF/kWh)</div><input type="number" id="p" value="0.29" step="0.01"/></div><div class="field"><div class="label">Anzahl Geräte</div><input type="number" id="n" value="1" min="1"/></div></div></div>
        <div class="panel"><div class="stat-grid" id="st"></div></div>`;
      const run = () => {
        const kwhDay = (+U.q('#w').value || 0) * (+U.q('#h').value || 0) * (+U.q('#n').value || 1) / 1000, p = +U.q('#p').value || 0;
        U.q('#st').innerHTML = [['kWh / Tag', U.fmtNum(kwhDay)], ['kWh / Jahr', U.fmtNum(kwhDay * 365, 0)], ['CHF / Tag', U.fmtNum(kwhDay * p)], ['CHF / Monat', U.fmtNum(kwhDay * p * 30.42)], ['CHF / Jahr', U.fmtNum(kwhDay * p * 365)], ['CO₂ / Jahr (CH-Mix ≈ 128 g)', U.fmtNum(kwhDay * 365 * .128, 0) + ' kg']].map(([k, v]) => `<div class="stat"><b>${v}</b><span>${k}</span></div>`).join('');
      };
      root.querySelectorAll('input').forEach((el) => el.addEventListener('input', run)); run();
    },
  });

  register({
    id: 'percent', name: 'Prozentrechner', glyph: '%?', cat: 'calc',
    desc: 'Prozentwerte, Anteile und Veränderungen schnell berechnen.', keywords: 'percent prozent change increase decrease',
    render(root, U) {
      root.innerHTML = `<div class="panel">
        <div class="row" style="margin-bottom:12px"><input type="number" id="a1" value="15" style="width:110px"/> % von <input type="number" id="b1" value="240" style="width:130px"/> = <b class="mono" id="r1"></b></div>
        <div class="row" style="margin-bottom:12px"><input type="number" id="a2" value="36" style="width:110px"/> ist wie viel % von <input type="number" id="b2" value="240" style="width:130px"/> ? <b class="mono" id="r2"></b></div>
        <div class="row"><span>Von</span><input type="number" id="a3" value="80" style="width:110px"/><span>auf</span><input type="number" id="b3" value="100" style="width:130px"/> = <b class="mono" id="r3"></b></div></div>`;
      const run = () => {
        const v = (id) => +U.q('#' + id).value;
        U.q('#r1').textContent = U.fmtNum(v('a1') / 100 * v('b1'), 4);
        U.q('#r2').textContent = v('b2') ? U.fmtNum(v('a2') / v('b2') * 100, 4) + ' %' : '—';
        const ch = v('a3') ? (v('b3') - v('a3')) / v('a3') * 100 : NaN;
        U.q('#r3').textContent = isNaN(ch) ? '—' : (ch >= 0 ? '+' : '') + U.fmtNum(ch, 2) + ' %';
      };
      root.querySelectorAll('input').forEach((el) => el.addEventListener('input', run)); run();
    },
  });
  void human;
})();
