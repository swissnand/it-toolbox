/* Kategorie: Zeit & Datum */
(() => {
  'use strict';
  const { register } = window.TB;
  const DOW = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

  const rel = (ms) => {
    const s = Math.round(ms / 1000), a = Math.abs(s);
    const rtf = new Intl.RelativeTimeFormat('de', { numeric: 'auto' });
    if (a < 60) return rtf.format(s, 'second');
    if (a < 3600) return rtf.format(Math.round(s / 60), 'minute');
    if (a < 86400) return rtf.format(Math.round(s / 3600), 'hour');
    if (a < 2592000) return rtf.format(Math.round(s / 86400), 'day');
    if (a < 31536000) return rtf.format(Math.round(s / 2592000), 'month');
    return rtf.format(Math.round(s / 31536000), 'year');
  };
  const isoWeek = (d) => {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
    const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return [t.getUTCFullYear(), Math.ceil(((t - y0) / 86400000 + 1) / 7)];
  };
  const pad = (n) => String(n).padStart(2, '0');
  const toLocalInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

  register({
    id: 'timestamp', name: 'Unix Timestamp', glyph: 'EPO', cat: 'time',
    desc: 'Unix-Zeit (Sekunden/Millisekunden) in Datum umrechnen und zurück.', keywords: 'epoch unix time timestamp iso 8601 date',
    render(root, U) {
      root.innerHTML = `<div class="panel"><div class="row"><div><div class="small muted">Jetzt (Unix, Sekunden)</div><div class="big" id="now"></div></div><span class="spacer"></span><button class="btn" data-copy="#now">${U.icon('copy')}Kopieren</button></div></div>
        <div class="cols"><div class="panel"><h3>Timestamp → Datum</h3><input id="ts" class="mono" style="font-size:16px"/><div class="small muted" id="unit" style="margin:6px 0 10px"></div><div id="r1"></div></div>
        <div class="panel"><h3>Datum → Timestamp</h3><input type="datetime-local" id="dt" step="1"/><div style="margin-top:10px" id="r2"></div></div></div>`;
      const tick = () => { U.q('#now').textContent = Math.floor(Date.now() / 1000); };
      const r1 = () => {
        const s = U.q('#ts').value.trim();
        if (!/^-?\d+(\.\d+)?$/.test(s)) { U.q('#r1').innerHTML = s ? '<div class="msg err">Bitte eine Zahl eingeben</div>' : ''; U.q('#unit').textContent = ''; return; }
        let n = +s, unit = 'Sekunden';
        if (Math.abs(n) > 1e17) { n /= 1e6; unit = 'Nanosekunden'; } else if (Math.abs(n) > 1e14) { n /= 1e3; unit = 'Mikrosekunden'; } else if (Math.abs(n) > 1e11) unit = 'Millisekunden'; else n *= 1000;
        const d = new Date(n);
        U.q('#unit').textContent = 'Erkannt als ' + unit;
        U.q('#r1').innerHTML = U.kv([['Lokal', d.toLocaleString('de-CH', { dateStyle: 'full', timeStyle: 'medium' })], ['UTC', d.toUTCString()], ['ISO 8601', d.toISOString()], ['Relativ', rel(d - Date.now())], ['Kalenderwoche', 'KW ' + isoWeek(d)[1] + ' / ' + isoWeek(d)[0]]]);
      };
      const r2 = () => {
        const v = U.q('#dt').value; if (!v) return;
        const d = new Date(v);
        U.q('#r2').innerHTML = U.kv([['Sekunden', String(Math.floor(d / 1000))], ['Millisekunden', String(+d)], ['ISO 8601', d.toISOString()], ['RFC 2822', d.toUTCString()]]);
      };
      U.q('#ts').oninput = r1; U.q('#dt').oninput = r2;
      tick(); U.q('#ts').value = Math.floor(Date.now() / 1000); U.q('#dt').value = toLocalInput(new Date()); r1(); r2();
      const iv = setInterval(tick, 1000);
      return () => clearInterval(iv);
    },
  });

  const ZONES = ['Europe/Zurich', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'America/Sao_Paulo', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Shanghai', 'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland', 'UTC'];

  register({
    id: 'world-clock', name: 'Weltzeituhr', glyph: 'UTC', cat: 'time',
    desc: 'Uhrzeiten weltweit vergleichen und Meeting-Zeiten umrechnen.', keywords: 'timezone zeitzone world clock meeting convert',
    render(root, U) {
      const all = Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : ZONES;
      let sel = U.store.get('zones', ZONES.slice(0, 8));
      root.innerHTML = `<div class="panel"><div class="row"><span class="small muted">Referenzzeit</span><input type="datetime-local" id="ref" style="width:auto"/><button class="btn btn-sm" id="nowB">Jetzt</button><label class="check"><input type="checkbox" id="live" checked> Live</label>
        <span class="spacer"></span><select id="add" style="width:240px"><option value="">+ Zeitzone hinzufügen</option>${all.map((z) => `<option>${z}</option>`).join('')}</select></div></div><div class="grid" id="clocks"></div>`;
      const ref = () => U.q('#live').checked ? new Date() : new Date(U.q('#ref').value || Date.now());
      const offset = (z, d) => { const p = new Intl.DateTimeFormat('en', { timeZone: z, timeZoneName: 'shortOffset' }).formatToParts(d).find((x) => x.type === 'timeZoneName'); return p ? p.value.replace('GMT', 'UTC') : ''; };
      const draw = () => {
        const d = ref();
        U.q('#clocks').innerHTML = sel.map((z) => {
          const h = +new Intl.DateTimeFormat('en', { timeZone: z, hour: 'numeric', hour12: false }).format(d) % 24;
          const work = h >= 8 && h < 18;
          return `<div class="card" style="flex-direction:column;gap:4px"><div class="row" style="width:100%"><b>${U.esc(z.split('/').pop().replace(/_/g, ' '))}</b><span class="spacer"></span><button class="copy-btn" data-rm="${z}" title="Entfernen">✕</button></div>
            <div class="big" style="font-size:28px">${d.toLocaleTimeString('de-CH', { timeZone: z, hour: '2-digit', minute: '2-digit' })}</div>
            <div class="small muted">${d.toLocaleDateString('de-CH', { timeZone: z, weekday: 'short', day: 'numeric', month: 'short' })} · ${offset(z, d)}</div>
            <span class="badge ${work ? 'ok' : h >= 22 || h < 6 ? 'err' : 'warn'}">${work ? 'Bürozeit' : h >= 22 || h < 6 ? 'Nacht' : 'Randzeit'}</span></div>`;
        }).join('');
        U.qa('[data-rm]').forEach((b) => { b.onclick = () => { sel = sel.filter((x) => x !== b.dataset.rm); U.store.set('zones', sel); draw(); }; });
      };
      U.q('#add').onchange = (e) => { if (e.target.value && !sel.includes(e.target.value)) { sel.push(e.target.value); U.store.set('zones', sel); } e.target.value = ''; draw(); };
      U.q('#ref').value = toLocalInput(new Date()).slice(0, 16);
      U.q('#ref').oninput = () => { U.q('#live').checked = false; draw(); };
      U.q('#nowB').onclick = () => { U.q('#live').checked = true; U.q('#ref').value = toLocalInput(new Date()).slice(0, 16); draw(); };
      U.q('#live').onchange = draw;
      draw();
      const iv = setInterval(() => { if (U.q('#live').checked) draw(); }, 5000);
      return () => clearInterval(iv);
    },
  });

  register({
    id: 'date-calc', name: 'Datumsrechner', glyph: 'Δt', cat: 'time',
    desc: 'Differenz zwischen Daten, Arbeitstage und Tage addieren/subtrahieren.', keywords: 'date difference days add business days werktage',
    render(root, U) {
      const today = new Date().toISOString().slice(0, 10);
      root.innerHTML = `<div class="cols"><div class="panel"><h3>Differenz</h3><div class="cols"><div class="field"><div class="label">Von</div><input type="date" id="a" value="${today}"/></div><div class="field"><div class="label">Bis</div><input type="date" id="b" value="${new Date().getFullYear()}-12-31"/></div></div><div id="r1"></div></div>
        <div class="panel"><h3>Addieren / Subtrahieren</h3><div class="field"><div class="label">Startdatum</div><input type="date" id="c" value="${today}"/></div>
        <div class="row"><input type="number" id="n" value="30" style="width:100px"/><select id="u" style="width:auto"><option value="d">Tage</option><option value="w">Wochen</option><option value="m">Monate</option><option value="y">Jahre</option><option value="b">Arbeitstage</option></select></div><div id="r2" style="margin-top:12px"></div></div></div>`;
      const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
      const r1 = () => {
        if (!U.q('#a').value || !U.q('#b').value) return;
        const a = parse(U.q('#a').value), b = parse(U.q('#b').value);
        const days = Math.round((b - a) / 86400000);
        let wd = 0; const s = days >= 0 ? a : b, e = days >= 0 ? b : a;
        for (let d = new Date(s); d < e; d.setDate(d.getDate() + 1)) if (d.getDay() % 6) wd++;
        let y = e.getFullYear() - s.getFullYear(), m = e.getMonth() - s.getMonth(), dd = e.getDate() - s.getDate();
        if (dd < 0) { m--; dd += new Date(e.getFullYear(), e.getMonth(), 0).getDate(); }
        if (m < 0) { y--; m += 12; }
        U.q('#r1').innerHTML = `<div class="stat-grid"><div class="stat"><b>${U.fmtNum(days, 0)}</b><span>Tage</span></div><div class="stat"><b>${U.fmtNum(days / 7, 1)}</b><span>Wochen</span></div><div class="stat"><b>${U.fmtNum(wd, 0)}</b><span>Werktage (Mo–Fr)</span></div><div class="stat"><b>${U.fmtNum(Math.abs(days) * 24, 0)}</b><span>Stunden</span></div></div>
          <p class="muted" style="margin-bottom:0">${y} Jahre, ${m} Monate, ${dd} Tage</p>`;
      };
      const r2 = () => {
        if (!U.q('#c').value) return;
        const d = parse(U.q('#c').value), n = +U.q('#n').value || 0, u = U.q('#u').value;
        if (u === 'd') d.setDate(d.getDate() + n); else if (u === 'w') d.setDate(d.getDate() + n * 7); else if (u === 'm') d.setMonth(d.getMonth() + n); else if (u === 'y') d.setFullYear(d.getFullYear() + n);
        else { let k = Math.abs(n); const st = Math.sign(n) || 1; while (k > 0) { d.setDate(d.getDate() + st); if (d.getDay() % 6) k--; } }
        U.q('#r2').innerHTML = U.kv([['Ergebnis', d.toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })], ['ISO', `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`], ['Kalenderwoche', 'KW ' + isoWeek(d)[1]]]);
      };
      ['#a', '#b'].forEach((s) => U.q(s).addEventListener('input', r1));
      ['#c', '#n', '#u'].forEach((s) => U.q(s).addEventListener('input', r2));
      r1(); r2();
    },
  });

  register({
    id: 'calendar-week', name: 'Kalenderwochen', glyph: 'KW', cat: 'time',
    desc: 'ISO-Kalenderwochen eines Jahres mit Datumsbereich anzeigen.', keywords: 'kalenderwoche kw iso week number',
    render(root, U) {
      const now = new Date(), [cy, cw] = isoWeek(now);
      root.innerHTML = `<div class="panel"><div class="row"><div><div class="small muted">Heute</div><div class="big">KW ${cw}</div></div><span class="spacer"></span><label class="check">Jahr <input type="number" id="y" value="${cy}" style="width:100px"/></label></div></div><div class="panel"><div class="tbl-wrap"><table class="tbl" id="t"></table></div></div>`;
      const run = () => {
        const y = +U.q('#y').value || cy;
        const jan4 = new Date(y, 0, 4), mon = new Date(jan4); mon.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
        const rows = []; const f = (d) => d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
        for (let w = 1; w <= 53; w++) {
          const s = new Date(mon); s.setDate(mon.getDate() + (w - 1) * 7);
          const e = new Date(s); e.setDate(s.getDate() + 6);
          if (isoWeek(s)[0] !== y) break;
          const cur = y === cy && w === cw;
          rows.push(`<tr${cur ? ' style="background:var(--accent-soft)"' : ''}><td><b>KW ${w}</b>${cur ? ' <span class="badge">jetzt</span>' : ''}</td><td class="mono">${f(s)}</td><td class="mono">${f(e)}</td></tr>`);
        }
        U.q('#t').innerHTML = '<tr><th>Woche</th><th>Montag</th><th>Sonntag</th></tr>' + rows.join('');
      };
      U.q('#y').oninput = run; run();
    },
  });

  register({
    id: 'stopwatch', name: 'Stoppuhr & Timer', glyph: '⏱', cat: 'time',
    desc: 'Stoppuhr mit Runden und Countdown-Timer mit Ton.', keywords: 'stopwatch timer countdown pomodoro',
    render(root, U) {
      root.innerHTML = `<div class="cols"><div class="panel" style="text-align:center"><h3>Stoppuhr</h3><div class="totp" id="sw" style="font-size:46px">00:00.00</div>
        <div class="row" style="justify-content:center;margin-top:14px"><button class="btn btn-primary" id="ss">Start</button><button class="btn" id="lap">Runde</button><button class="btn" id="rs">Reset</button></div><div id="laps" style="margin-top:12px;text-align:left"></div></div>
        <div class="panel" style="text-align:center"><h3>Timer</h3><div class="totp" id="tm" style="font-size:46px">05:00</div>
        <div class="row" style="justify-content:center;margin-top:10px"><input type="number" id="min" value="5" min="0" style="width:80px"/><span class="muted">min</span><input type="number" id="sec" value="0" min="0" max="59" style="width:80px"/><span class="muted">s</span></div>
        <div class="row" style="justify-content:center;margin-top:10px">${[1, 5, 15, 25, 60].map((m) => `<button class="btn btn-sm" data-m="${m}">${m} min</button>`).join('')}</div>
        <div class="row" style="justify-content:center;margin-top:14px"><button class="btn btn-primary" id="ts">Start</button><button class="btn" id="tr">Reset</button></div></div></div>`;
      const fmt = (ms) => { const t = Math.floor(ms / 10); const cs = t % 100, s = Math.floor(t / 100) % 60, m = Math.floor(t / 6000); return `${pad(m)}:${pad(s)}.${pad(cs)}`; };
      let swStart = 0, swAcc = 0, swRun = false, laps = [];
      let tEnd = 0, tLeft = 300000, tRun = false;
      const beep = () => { try { const ac = new AudioContext(); [0, .3, .6].forEach((o) => { const os = ac.createOscillator(), g = ac.createGain(); os.frequency.value = 880; os.connect(g); g.connect(ac.destination); g.gain.setValueAtTime(.2, ac.currentTime + o); g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + o + .25); os.start(ac.currentTime + o); os.stop(ac.currentTime + o + .25); }); } catch { /* ignore */ } };
      const setT = () => { tLeft = ((+U.q('#min').value || 0) * 60 + (+U.q('#sec').value || 0)) * 1000; drawT(); };
      const drawT = () => { const s = Math.ceil(tLeft / 1000); U.q('#tm').textContent = `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; };
      const frame = () => {
        if (swRun) U.q('#sw').textContent = fmt(swAcc + performance.now() - swStart);
        if (tRun) { tLeft = Math.max(0, tEnd - Date.now()); drawT(); if (!tLeft) { tRun = false; U.q('#ts').textContent = 'Start'; beep(); U.toast('Timer abgelaufen'); } }
      };
      const iv = setInterval(frame, 33);
      U.q('#ss').onclick = () => { if (swRun) { swAcc += performance.now() - swStart; swRun = false; U.q('#ss').textContent = 'Start'; } else { swStart = performance.now(); swRun = true; U.q('#ss').textContent = 'Stopp'; } };
      U.q('#rs').onclick = () => { swRun = false; swAcc = 0; laps = []; U.q('#sw').textContent = fmt(0); U.q('#ss').textContent = 'Start'; U.q('#laps').innerHTML = ''; };
      U.q('#lap').onclick = () => { const t = swAcc + (swRun ? performance.now() - swStart : 0); if (!t) return; laps.unshift(t); U.q('#laps').innerHTML = U.kv(laps.map((l, i) => ['Runde ' + (laps.length - i), fmt(l)])); };
      U.q('#ts').onclick = () => { if (tRun) { tRun = false; U.q('#ts').textContent = 'Weiter'; } else { if (!tLeft) setT(); tEnd = Date.now() + tLeft; tRun = true; U.q('#ts').textContent = 'Pause'; } };
      U.q('#tr').onclick = () => { tRun = false; U.q('#ts').textContent = 'Start'; setT(); };
      U.q('#min').oninput = setT; U.q('#sec').oninput = setT;
      U.qa('[data-m]').forEach((b) => { b.onclick = () => { U.q('#min').value = b.dataset.m; U.q('#sec').value = 0; tRun = false; U.q('#ts').textContent = 'Start'; setT(); }; });
      return () => clearInterval(iv);
    },
  });
})();
